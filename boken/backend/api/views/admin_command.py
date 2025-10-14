from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser

@api_view(['GET'])
@permission_classes([IsAdminUser])
def update_all(request):
    print("test update_all")
    return Response({"message": "Mise à jour réussie"}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def update(request):
    print("test update")
    return Response({"message": "Mise à jour des {} réussie".format(len(request.data))}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def create_new(request):
    print("test create_new")
    return Response({"message": "Création réussie"}, status=status.HTTP_200_OK)