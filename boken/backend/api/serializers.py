from rest_framework import serializers
from .models.user import User
from .models.webtoon import Webtoon

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'password'] # add 'create_at', 'update_at'
        read_only_fields = ['role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        return user

class WebtoonSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Webtoon
        fields = ['id', 'title', 'authors', 'release_date', 'title', 'status', 'is_public', 'rating', 'create_at', 'update_at']
