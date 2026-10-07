from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsReaderOrAdmin, DataAuthorization, is_admin
from api.models.user_release import UserRelease
from api.serializers import UserReleaseSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from api.visibility import visible_releases_queryset


class UserReleaseViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    queryset = UserRelease.objects.all()
    serializer_class = UserReleaseSerializer

    def get_permissions(self):
        if self.action in ['destroy', 'list', 'retrieve']:
            return [IsAuthenticated(), IsReaderOrAdmin()]
        elif self.action in ['create']:
            return [IsAuthenticated()]
        elif self.action in ['partial_update', 'update']:
            return [IsAuthenticated(), IsReaderOrAdmin(), DataAuthorization()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user):
            return UserRelease.objects.all()
        return UserRelease.objects.filter(user_id=user.id)

    def perform_create(self, serializer):
        release = serializer.validated_data['release_id']
        # a private webtoon of someone else, or someone else's pending release
        if not visible_releases_queryset(self.request.user).filter(pk=release.pk).exists():
            raise ValidationError({"release_id": ["Release not found."]})
        serializer.save(user_id=self.request.user)

    @action(detail=False, methods=['get'], url_path='with_webtoon/(?P<webtoon_id>[^/.]+)', permission_classes=[IsAuthenticated, IsReaderOrAdmin])
    def with_webtoon(self, request, webtoon_id=None):
        try:
            user_releases = UserRelease.objects.filter(
                user_id=request.user.id,
                release_id__webtoon_id__id=webtoon_id
            ).first()
            if not user_releases:
                return Response(
                    {"error": "No UserRelease found for this webtoon."},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = self.get_serializer(user_releases)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
