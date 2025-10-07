from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.models.genre import Genre
from api.serializers import GenreSerializer


class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer 
    permission_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['update', 'destroy', 'partial_update', 'create']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


