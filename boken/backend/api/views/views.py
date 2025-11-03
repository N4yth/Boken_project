from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.views import TokenObtainPairView
from api.serializers import MyTokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


@api_view(['POST'])
def verify_token(request):
    token = request.data.get("token")
    try:
        UntypedToken(token)
        return Response({"valid": True}, status=status.HTTP_200_OK)
    except (TokenError, InvalidToken):
        return Response({"valid": False}, status=status.HTTP_401_UNAUTHORIZED)
    

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer