from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.views import TokenObtainPairView
from api.serializers import MyTokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def verify_token(request):
    # the token can be sent in the body {"token": ...} or as "Authorization: Bearer ..."
    token = request.data.get("token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[len("Bearer "):].strip()
    if not token:
        return Response({"valid": False}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        UntypedToken(token)
        return Response({"valid": True}, status=status.HTTP_200_OK)
    except (TokenError, InvalidToken):
        return Response({"valid": False}, status=status.HTTP_401_UNAUTHORIZED)
    

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer