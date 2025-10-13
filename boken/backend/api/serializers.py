from rest_framework import serializers
from .models.user import User
from .models.webtoon import Webtoon
from .models.genre import Genre
from .models.release import Release
from .models.user_release import UserRelease


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'password', 'create_at', 'update_at']
        read_only_fields = ['id', 'role', 'create_at', 'update_at']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        return user

class WebtoonSerializer(serializers.ModelSerializer):
    add_by = UserSerializer(read_only=True)

    class Meta:
        model = Webtoon
        fields = ['id', 'title', 'authors', 'status', 'is_public', 'rating', 'add_by', 'release_date', 'create_at', 'update_at', 'waiting_review']
        read_only_fields = ['id', 'is_public', 'add_by', 'create_at', 'release_date', 'update_at'] 

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'create_at', 'update_at']
        read_only_fields = ['id', 'create_at', 'update_at']

class ReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Release
        fields = ['id', 'alt_title', 'description', 'language', 'total_chapter', 'webtoon_id','create_at', 'update_at']
        read_only_fields = ['id', 'create_at', 'update_at'] 

class UserReleaseSerializer(serializers.ModelSerializer):
    user_id = UserSerializer(read_only=True)

    class Meta:
        model = UserRelease
        fields = ['id', 'user_id', 'release_id', 'reading_status', 'rating', 'note', 'chapter_read', 'create_at', 'update_at']
        read_only_fields = ['id', 'user_id', 'create_at', 'update_at'] 
