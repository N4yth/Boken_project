from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsWebtoonCreatorOrAdmin
from api.models.release import Release
from api.serializers import ReleaseSerializer
from api.models.webtoon import Webtoon


class ReleaseViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    queryset = Release.objects.all()
    serializer_class = ReleaseSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or getattr(user, "role", None) == "admin"):
            return Release.objects.all()
        return Release.objects.filter(webtoon_id__is_public=True)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['update', 'destroy', 'partial_update', 'create']:
            return [IsAuthenticated(), IsWebtoonCreatorOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        obj = Webtoon.objects.get(pk=self.request.data["webtoon_id"])
        serializer.save(webtoon_id=obj)
