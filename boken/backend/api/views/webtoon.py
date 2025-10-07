from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.decorators import action
from api.permissions import IsCreatorOrAdmin
from api.models.webtoon import Webtoon
from api.serializers import WebtoonSerializer


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
        serializer.save(add_by=self.request.user)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
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
