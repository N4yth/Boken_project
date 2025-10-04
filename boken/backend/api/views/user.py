from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsSelfOrAdmin
from api.models.user import User
from api.serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer 
    permission_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['create', 'create_admin']:
            return [AllowAny()]
        elif self.action in ['update', 'destroy', 'partial_update', 'retrieve']:
            return [IsAuthenticated(), IsSelfOrAdmin()]
        elif self.action in ['list']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    # === Création simple user ===
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = User.objects.create_user(
                    email=serializer.validated_data["email"],
                    username=serializer.validated_data["username"],
                    password=request.data.get("password")
                )
                return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # === Création admin ===
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_admin(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                admin = User.objects.create_admin(
                    email=serializer.validated_data["email"],
                    username=serializer.validated_data["username"],
                    password=request.data.get("password"),
                    created_by=request.user
                )
                return Response(UserSerializer(admin).data, status=status.HTTP_201_CREATED)
            except PermissionError as e:
                return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
