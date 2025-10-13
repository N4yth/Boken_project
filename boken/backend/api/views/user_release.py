from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsReaderOrAdmin, DataAuthorization
from api.models.user_release import UserRelease
from api.serializers import UserReleaseSerializer
from api.models.release import Release
from api.models.user import User


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
