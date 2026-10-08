from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.authentication import JWTAuthentication
from api.permissions import IsSelfOrAdmin, IsAdmin
from api.models.user import User
from api.serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer 
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['create', 'create_admin']:
            return [AllowAny()]
        elif self.action in ['update', 'destroy', 'partial_update', 'retrieve']:
            return [IsAuthenticated(), IsSelfOrAdmin()]
        elif self.action in ['list']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get', 'patch', 'delete'])
    def me(self, request):
        """The logged in user's own account: GET to read, PATCH to update, DELETE to delete it."""
        user = request.user
        if request.method == 'DELETE':
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        if request.method == 'PATCH':
            serializer = self.get_serializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(self.get_serializer(user).data, status=status.HTTP_200_OK)

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
