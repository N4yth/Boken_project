from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.decorators import action
from api.permissions import IsCreatorOrAdmin
from api.models.webtoon import Webtoon
from api.models.user_release import UserRelease
from django_filters import rest_framework as filters
from api.serializers import WebtoonSerializer, UserReleaseSerializer, WebtoonSearchSerializer
from api.models.genre import Genre
from django.db.models import Exists, OuterRef, Q
from rest_framework import generics

class WebtoonViewSet(viewsets.ModelViewSet):
    queryset = Webtoon.objects.all()
    serializer_class = WebtoonSerializer 
    permission_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['update', 'destroy', 'partial_update', 'create']:
            return [IsAuthenticated(), IsCreatorOrAdmin()]
        elif self.action in ['set_to_public']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        if "is_public" in self.request.data and (self.request.user.is_staff or getattr(self.request.user, "role", None) != "admin"):
            return Response({'error': "Vous n avez pas la permission d'executer cette action (is public: true)."}, status=status.HTTP_403_FORBIDDEN)
        serializer.save(add_by=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def check(self, request, pk=None):
        try:
            check_list = Webtoon.objects.filter(waiting_review = True)
            serializer = WebtoonSerializer(check_list, many=True)
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
            return Response({'error': 'Webtoon introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        is_public = request.data.get('is_public', None)
        if is_public is None:
            return Response({'error': 'Le champ "is_public" est requis.'},
                status=status.HTTP_400_BAD_REQUEST)
        
        webtoon.is_public = is_public
        webtoon.save()

        serializer = self.get_serializer(webtoon)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        user = request.user
        if user.is_authenticated and (user.is_staff or getattr(user, "role", None) == "admin"):
            queryset = queryset
        elif user.is_authenticated:
            queryset = queryset.filter(Q(is_public=True) | Q(add_by=user))
        else:
            queryset = queryset.filter(is_public=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    def retrieve(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()
        if not instance.is_public:
            if not user.is_authenticated:
                return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
            if not (user.is_staff or getattr(user, "role", None) == "admin" or instance.add_by_id == user.id):
                return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance)
        data = serializer.data
        if user.is_authenticated:
            user_releases = UserRelease.objects.filter(
                user_id=request.user.id,
                release_id__webtoon_id__id=instance.id
            ).first()
            data["addable"] = user_releases is not None
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def get_library(self, request):
        try:
            library = Webtoon.objects.filter(release__userrelease__user_id = request.user.id)
            serializer = WebtoonSerializer(library, many=True)
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
            webtoons = Webtoon.objects.all()
            user_webtoon_ids = set(
                str(wid)
                for wid in UserRelease.objects.filter(user_id=request.user.id)
                .values_list("release_id__webtoon_id__id", flat=True)
            )
            serializer = WebtoonSerializer(webtoons, many=True)
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


class WebtoonFilter(filters.FilterSet):
    title = filters.CharFilter(field_name='title', lookup_expr='icontains')
    author = filters.CharFilter(field_name='authors', lookup_expr='icontains')
    genres = filters.ModelMultipleChoiceFilter(
        field_name='genres__id',
        to_field_name='id',
        queryset=Genre.objects.all()
    )
    min_chapters = filters.NumberFilter(
        field_name='releases__total_chapter',
        lookup_expr='gte'
    )
    max_chapters = filters.NumberFilter(
        field_name='releases__total_chapter',
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
        queryset = Webtoon.objects.all().prefetch_related('release', 'genres')
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