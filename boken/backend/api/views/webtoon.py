from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.decorators import action
from api.permissions import IsCreatorOrAdmin
from api.models.webtoon import Webtoon
from api.models.user import User
from api.serializers import WebtoonSerializer
from django.db.models import Q


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
        if user.is_authenticated and (user.is_staff or getattr(user, "role", None) == "admin"):
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        if instance.is_public:
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        if instance.add_by and instance.add_by.id == user.id:
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"detail": "Not allowed"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def get_library(self, request):
        try:
            library = Webtoon.objects.filter(release__userrelease__user_id = request.user.id)
            serializer = WebtoonSerializer(library, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
