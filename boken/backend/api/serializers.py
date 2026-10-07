from rest_framework import serializers
from .models.user import User
from .models.webtoon import Webtoon
from .models.genre import Genre
from .models.author import Author
from .models.release import Release
from .models.user_release import UserRelease
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        return data

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

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name']
        read_only_fields = ['id']


class AuthorNamesField(serializers.Field):
    """Reads as [{id, name}], writes from a list of names or a "a, b" string."""

    def to_representation(self, value):
        return AuthorSerializer(value.all(), many=True).data

    def to_internal_value(self, data):
        if isinstance(data, str):
            data = data.split(",")
        if not isinstance(data, (list, tuple)):
            raise serializers.ValidationError("Expected a list of author names or a comma separated string.")
        names = [str(name).strip() for name in data if str(name).strip()]
        if not names:
            raise serializers.ValidationError("At least one author is required.")
        return names


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'create_at', 'update_at']
        read_only_fields = ['id', 'create_at', 'update_at']


class WebtoonSerializer(serializers.ModelSerializer):
    add_by = UserSerializer(read_only=True)
    authors = AuthorNamesField(required=False)
    genres = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Genre.objects.all(),
        required=False
    )

    class Meta:
        model = Webtoon
        fields = ['id', 'genres', 'title', 'authors', 'status', 'is_public', 'rating', 'add_by', 'release_date', 'create_at', 'update_at', 'waiting_review']
        read_only_fields = ['id', 'add_by', 'create_at', 'release_date', 'update_at'] 
    
    def to_representation(self, instance):
        """Remplace la liste d’IDs des genres par leurs données complètes"""
        rep = super().to_representation(instance)
        rep["genres"] = GenreSerializer(instance.genres.all(), many=True).data
        rep["releases"] = ReleaseSerializer(instance.release.all(), many=True).data
        return rep

    def create(self, validated_data):
        names = validated_data.pop('authors', [])
        webtoon = super().create(validated_data)
        webtoon.authors.set(Author.from_names(names))
        return webtoon

    def update(self, instance, validated_data):
        names = validated_data.pop('authors', None)
        webtoon = super().update(instance, validated_data)
        if names is not None:
            webtoon.authors.set(Author.from_names(names))
        return webtoon

class ReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Release
        fields = ['id', 'alt_title', 'description', 'language', 'total_chapter', 'webtoon_id','create_at', 'update_at']
        read_only_fields = ['id', 'create_at', 'update_at'] 

class UserReleaseSerializer(serializers.ModelSerializer):
    user_id = UserSerializer(read_only=True)

    class Meta:
        model = UserRelease
        fields = ['id', 'personal_total_chapter', 'user_id', 'release_id', 'reading_status', 'rating', 'note', 'chapter_read', 'create_at', 'update_at']
        read_only_fields = ['id', 'user_id', 'create_at', 'update_at'] 

class WebtoonSearchSerializer(serializers.ModelSerializer):
    releases = ReleaseSerializer(many=True, read_only=True, source='release')
    authors = AuthorNamesField(read_only=True)
    addable = serializers.SerializerMethodField()
    
    class Meta:
        model = Webtoon
        fields = ['id', 'title', 'authors', 'rating', 'releases', 'addable']
    
    def get_addable(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return True
        if hasattr(obj, 'is_in_library'):
            return not obj.is_in_library
        has_in_library = UserRelease.objects.filter(
            user_id=request.user.id,
            release_id__webtoon_id=obj
        ).exists()
        return not has_in_library
