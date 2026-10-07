from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsAdmin, IsReleaseEditor, is_admin
from api.models.release import Release
from api.models.user_release import UserRelease
from api.serializers import ReleaseSerializer
from api.visibility import visible_releases_queryset


class ReleaseViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    queryset = Release.objects.all()
    serializer_class = ReleaseSerializer

    def get_queryset(self):
        return visible_releases_queryset(self.request.user)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action == 'review':
            return [IsAuthenticated(), IsAdmin()]
        elif self.action in ['update', 'destroy', 'partial_update']:
            return [IsAuthenticated(), IsReleaseEditor()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """
        - admin or creator of the webtoon: the release is published directly
        - reader who has the webtoon in their library: the release waits for an admin review
        """
        user = self.request.user
        webtoon = serializer.validated_data.get('webtoon_id')
        if webtoon is None:
            raise ValidationError({"webtoon_id": ["This field is required."]})
        if is_admin(user) or webtoon.add_by_id == user.id:
            serializer.save(add_by=user, waiting_review=False)
            return
        in_library = UserRelease.objects.filter(user_id=user, release_id__webtoon_id=webtoon).exists()
        if not in_library or not webtoon.is_public:
            raise PermissionDenied("Add this webtoon to your library before submitting a release.")
        serializer.save(add_by=user, waiting_review=True)

    def perform_update(self, serializer):
        # only an admin can move a release to another webtoon
        if not is_admin(self.request.user):
            serializer.save(webtoon_id=serializer.instance.webtoon_id)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Admin: {"approve": true} publishes a pending release, {"approve": false} deletes it."""
        release = self.get_object()
        approve = request.data.get('approve')
        if not isinstance(approve, bool):
            return Response({"approve": ["Must be true or false."]}, status=status.HTTP_400_BAD_REQUEST)
        if not approve:
            release.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        release.waiting_review = False
        release.save(update_fields=['waiting_review', 'update_at'])
        return Response(self.get_serializer(release).data, status=status.HTTP_200_OK)
