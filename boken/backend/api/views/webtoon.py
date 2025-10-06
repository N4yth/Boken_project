from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsSelfOrAdmin
from api.models.webtoon import Webtoon
from api.serializers import WebtoonSerializer


class WebtoonViewSet(viewsets.ModelViewSet):
    queryset = Webtoon.objects.all()
    serializer_class = WebtoonSerializer 
    permission_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['create']:
            return [AllowAny()]
        elif self.action in ['update', 'destroy', 'partial_update', 'retrieve']:
            return [IsAuthenticated(), IsSelfOrAdmin()]
        elif self.action in ['list']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
