from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsReaderOrAdmin, DataAuthorization
from api.models.user_release import UserRelease
from api.serializers import UserReleaseSerializer
from api.models.release import Release
from api.models.user import User
from rest_framework.decorators import action
from rest_framework.response import Response


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

    def perform_create(self, serializer):
        release = Release.objects.get(pk=self.request.data["release_id"])
        user = User.objects.get(pk=self.request.user.id)
        serializer.save(release_id=release, user_id=user)

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
