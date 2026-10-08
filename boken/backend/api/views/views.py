from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import IsAuthenticated
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
    # slows down password guessing: 10 attempts per minute per IP (settings.DEFAULT_THROTTLE_RATES)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Revoke the refresh token {"refresh": ...}. The access token stays valid until it expires (15 min)."""
    refresh = request.data.get("refresh")
    if not refresh:
        return Response({"refresh": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
    try:
        token = RefreshToken(refresh)
    except TokenError:
        return Response({"refresh": ["Invalid or expired token."]}, status=status.HTTP_400_BAD_REQUEST)
    if str(token.get("user_id")) != str(request.user.id):
        return Response({"refresh": ["This token belongs to another user."]}, status=status.HTTP_400_BAD_REQUEST)
    token.blacklist()
    return Response(status=status.HTTP_205_RESET_CONTENT)