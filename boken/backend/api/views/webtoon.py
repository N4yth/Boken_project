from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import serializers
from api.permissions import IsCreatorOrAdmin, IsAdmin, is_admin
from api.models.webtoon import Webtoon
from api.models.user_release import UserRelease
from django_filters import rest_framework as filters
from api.serializers import WebtoonSerializer, UserReleaseSerializer, WebtoonSearchSerializer, ReleaseSerializer
from api.models.genre import Genre
from django.db.models import Exists, OuterRef, Q
from rest_framework import generics
from django.db import transaction
from rest_framework.parsers import FormParser, MultiPartParser
from api.covers import MAX_UPLOAD_BYTES, InvalidCover, remove_cover, set_cover

def with_related(queryset):
    """Load genres, authors, releases and creator in a few queries instead of a few per webtoon."""
    return queryset.select_related('add_by').prefetch_related('genres', 'authors', 'release')


class WebtoonViewSet(viewsets.ModelViewSet):
    queryset = Webtoon.objects.all()
    serializer_class = WebtoonSerializer 
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]         

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['update', 'destroy', 'partial_update', 'create', 'cover']:
            return [IsAuthenticated(), IsCreatorOrAdmin()]
        elif self.action in ['set_to_public', 'check', 'review']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user):
            queryset = Webtoon.objects.all()
        elif user.is_authenticated:
            queryset = Webtoon.objects.filter(Q(is_public=True) | Q(add_by_id=user.id))
        else:
            queryset = Webtoon.objects.filter(is_public=True)
        return with_related(queryset)

    def perform_create(self, serializer):
        if "is_public" in self.request.data and not is_admin(self.request.user):
            raise PermissionDenied("Permission denied you cannot create a public webtoon without admin permission.")
        serializer.save(add_by=self.request.user)

    def perform_update(self, serializer):
        if not is_admin(self.request.user):
            # once public, a webtoon is shared data: only an admin edits it
            if serializer.instance.is_public:
                raise PermissionDenied("Public webtoons can only be edited by an admin.")
            # a webtoon only becomes public through an admin review
            if "is_public" in self.request.data:
                raise PermissionDenied("Only an admin can change the visibility of a webtoon.")
        serializer.save()

    @action(detail=True, methods=['post', 'delete'], parser_classes=[MultiPartParser, FormParser])
    def cover(self, request, pk=None):
        """
        POST (multipart, field "cover"): upload the cover, it is resized and converted to WebP.
        DELETE: remove it. Same rights as editing the webtoon.
        """
        webtoon = self.get_object()
        if webtoon.is_public and not is_admin(request.user):
            raise PermissionDenied("Public webtoons can only be edited by an admin.")
        if request.method == 'DELETE':
            remove_cover(webtoon)
            return Response(status=status.HTTP_204_NO_CONTENT)
        upload = request.FILES.get('cover')
        if upload is None:
            return Response({"cover": ["No file was sent (multipart field \"cover\")."]}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_UPLOAD_BYTES:
            return Response({"cover": ["Image too large (max 5 MB)."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            set_cover(webtoon, upload.read())
        except InvalidCover as e:
            return Response({"cover": [str(e)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(webtoon).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        # deleting a public webtoon also deletes the library entries of every reader
        if instance.is_public and not is_admin(self.request.user):
            raise PermissionDenied("Public webtoons can only be deleted by an admin.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def check(self, request, pk=None):
        try:
            check_list = Webtoon.objects.filter(waiting_review = True)
            serializer = WebtoonSerializer(check_list, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def set_to_public(self, request, pk=None):
        try:
            webtoon = self.get_object()
        except Webtoon.DoesNotExist:
            return Response({'error': 'Webtoon not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # accepts true/false, 1/0, "true"/"false" (JSON or form data)
            is_public = serializers.BooleanField().to_internal_value(request.data.get('is_public'))
        except ValidationError:
            return Response({'error': 'is_public must be true or false.'},
                status=status.HTTP_400_BAD_REQUEST)
        
        webtoon.is_public = is_public
        webtoon.save()

        serializer = self.get_serializer(webtoon)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Admin: {"approve": true} makes a submitted webtoon public, {"approve": false} keeps it private."""
        webtoon = self.get_object()
        approve = request.data.get('approve')
        if not isinstance(approve, bool):
            return Response({"approve": ["Must be true or false."]}, status=status.HTTP_400_BAD_REQUEST)
        webtoon.waiting_review = False
        if approve:
            webtoon.is_public = True
        webtoon.save()
        return Response(self.get_serializer(webtoon).data, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        if user.is_authenticated:
            user_releases = UserRelease.objects.filter(
                user_id=request.user.id,
                release_id__webtoon_id__id=instance.id
            ).first()
            data["addable"] = user_releases is None
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def get_library(self, request):
        try:
            library = with_related(Webtoon.objects.filter(release__userrelease__user_id = request.user.id).distinct())
            serializer = WebtoonSerializer(library, many=True, context={'request': request})
            data = []
            for webtoon in serializer.data:
                UserR = UserRelease.objects.filter(
                    user_id=request.user.id,
                    release_id__webtoon_id__id=webtoon["id"]
                ).first()
                User_serializer = UserReleaseSerializer(UserR, many=False)
                User_data = User_serializer.data
                webtoon["UR_rating"] = User_data["rating"]
                webtoon["UR_total_chapter"] = User_data["personal_total_chapter"]
                data.append(webtoon)
            return Response(data, status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def logged_user(self, request):
        try:
            webtoons = with_related(Webtoon.objects.filter(
                Q(is_public=True) | Q(add_by_id=request.user.id)
            ))
            user_webtoon_ids = set(
                str(wid)
                for wid in UserRelease.objects.filter(user_id=request.user.id)
                .values_list("release_id__webtoon_id__id", flat=True)
            )
            serializer = WebtoonSerializer(webtoons, many=True, context={'request': request})
            data = []
            for webtoon_data in serializer.data:
                webtoon_id = webtoon_data["id"]
                webtoon_data["addable"] = webtoon_id not in user_webtoon_ids
                data.append(webtoon_data)
            return Response(data, status=status.HTTP_200_OK)

        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def full_create(self, request):
        """
        Create a webtoon, its releases and the user's library entry in one call.

        Releases are sent as a list: "releases": [{"language", "alt_title", "description", "total_chapter"}, ...]
        The old format (one release given with flat alt_title/description/language/total_chapter) still works.
        "reading_language" chooses the release the library entry points to (first release by default).
        Nothing is created if any part is invalid.
        """
        data = request.data
        releases_data = data.get('releases')
        if releases_data is None:
            releases_data = [{
                key: data.get(key)
                for key in ('alt_title', 'description', 'language', 'total_chapter')
                if data.get(key) is not None
            }]
        if not isinstance(releases_data, list) or not releases_data or not all(isinstance(r, dict) for r in releases_data):
            return Response({"error": "At least one release is required.", "details": {"releases": ["At least one release is required."]}},
                            status=status.HTTP_400_BAD_REQUEST)
        languages = [r.get('language') for r in releases_data]
        if len(set(languages)) != len(languages):
            return Response({"error": "Each language can only be used once.", "details": {"releases": ["Each language can only be used once."]}},
                            status=status.HTTP_400_BAD_REQUEST)
        reading_language = data.get('reading_language') or languages[0]
        if reading_language not in languages:
            return Response({"error": "reading_language must be one of the release languages.",
                             "details": {"reading_language": ["Must be one of the release languages."]}},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                webtoon_serializer = WebtoonSerializer(data={
                    'title': data.get('title'),
                    'authors': data.get('authors'),
                    'genres': data.get('genres', []),
                    'status': data.get('status'),
                    'waiting_review': bool(data.get('waiting_review', False)),
                }, context={'request': request})
                webtoon_serializer.is_valid(raise_exception=True)
                release_date = serializers.DateField().to_internal_value(data.get('release_date')) if data.get('release_date') else None
                extra = {'release_date': release_date} if release_date else {}
                # is_public is not taken from the request: only an admin review makes a webtoon public
                webtoon = webtoon_serializer.save(add_by=request.user, **extra)

                releases = {}
                for release_data in releases_data:
                    release_serializer = ReleaseSerializer(data={**release_data, 'webtoon_id': webtoon.pk})
                    release_serializer.is_valid(raise_exception=True)
                    release = release_serializer.save(add_by=request.user, waiting_review=False)
                    releases[release.language] = release

                reading_release = releases[reading_language]
                user_release_serializer = UserReleaseSerializer(data={
                    'release_id': reading_release.pk,
                    'personal_total_chapter': data.get('personal_total_chapter') or reading_release.total_chapter,
                    'chapter_read': data.get('chapter_read') or 0,
                    'note': data.get('note') or "",
                    'rating': data.get('personal_rating') or 0,
                    'reading_status': data.get('reading_status') or "to read",
                })
                user_release_serializer.is_valid(raise_exception=True)
                user_release_serializer.save(user_id=request.user)
        except ValidationError as e:
            return Response({"error": str(e.detail), "details": e.detail}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "webtoon_id": webtoon.id,
            "release_ids": {language: release.id for language, release in releases.items()},
        }, status=status.HTTP_200_OK)


class WebtoonFilter(filters.FilterSet):
    title = filters.CharFilter(field_name='title', lookup_expr='icontains')
    author = filters.CharFilter(field_name='authors__name', lookup_expr='icontains')
    genres = filters.ModelMultipleChoiceFilter(
        field_name='genres__id',
        to_field_name='id',
        queryset=Genre.objects.all()
    )
    min_chapters = filters.NumberFilter(
        field_name='release__total_chapter',
        lookup_expr='gte'
    )
    max_chapters = filters.NumberFilter(
        field_name='release__total_chapter',
        lookup_expr='lte'
    )
    min_rating = filters.NumberFilter(field_name='rating', lookup_expr='gte')
    max_rating = filters.NumberFilter(field_name='rating', lookup_expr='lte')
    status = filters.CharFilter(field_name='status', lookup_expr='iexact')
    
    class Meta:
        model = Webtoon
        fields = ['title', 'author', 'genres', 'min_chapters', 
                  'max_chapters', 'min_rating', 'max_rating', 'status']

class WebtoonSearchView(generics.ListAPIView):
    serializer_class = WebtoonSearchSerializer
    filter_backends = [filters.DjangoFilterBackend]
    filterset_class = WebtoonFilter
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        visible = Q(is_public=True)
        if self.request.user.is_authenticated:
            visible |= Q(add_by_id=self.request.user.id)
        queryset = Webtoon.objects.filter(visible).prefetch_related('release', 'genres', 'authors')
        if self.request.user.is_authenticated:
            user_has_webtoon = UserRelease.objects.filter(
                user_id=self.request.user.id,
                release_id__webtoon_id=OuterRef('pk')
            )
            queryset = queryset.annotate(
                is_in_library=Exists(user_has_webtoon)
            )
        return queryset.distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context