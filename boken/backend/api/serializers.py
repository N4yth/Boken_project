from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models.user import User
from .models.webtoon import Webtoon
from .models.genre import Genre
from .models.author import Author
from .models.release import Release
from .models.user_release import UserRelease
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .visibility import visible_releases


def request_user(serializer):
    request = serializer.context.get('request')
    return getattr(request, 'user', None)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['id'] = str(self.user.id)
        data['username'] = self.user.username
        data['role'] = self.user.role
        return data

class UserSerializer(serializers.ModelSerializer):
    # required on sign up only: a profile update (PATCH or PUT) does not have to change the password
    password = serializers.CharField(write_only=True, required=False)
    # needed when users change their own password
    current_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'password', 'current_password', 'create_at', 'update_at']
        read_only_fields = ['id', 'role', 'create_at', 'update_at']

    def validate(self, attrs):
        password = attrs.get('password')
        current_password = attrs.pop('current_password', None)
        if self.instance is None and not password:
            raise serializers.ValidationError({"password": ["This field is required."]})
        if password:
            # AUTH_PASSWORD_VALIDATORS: 8 characters min, not too common, not only digits, not close to username/email
            candidate = self.instance or User(username=attrs.get('username', ''), email=attrs.get('email', ''))
            try:
                validate_password(password, candidate)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})
            request = self.context.get('request')
            changing_own_password = (
                self.instance is not None and request is not None and request.user.pk == self.instance.pk
            )
            if changing_own_password and not (current_password and self.instance.check_password(current_password)):
                raise serializers.ValidationError({"current_password": ["Wrong current password."]})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        return user

    def update(self, instance, validated_data):
        # without this the default update stores the password as plain text
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user

class PublicUserSerializer(serializers.ModelSerializer):
    """User shown inside public data (no email)."""
    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = fields

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
    add_by = PublicUserSerializer(read_only=True)
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
        rep["releases"] = ReleaseSerializer(visible_releases(instance, request_user(self)), many=True).data
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
        fields = ['id', 'alt_title', 'description', 'language', 'total_chapter', 'webtoon_id', 'waiting_review', 'add_by', 'create_at', 'update_at']
        read_only_fields = ['id', 'waiting_review', 'add_by', 'create_at', 'update_at']

class UserReleaseSerializer(serializers.ModelSerializer):
    user_id = UserSerializer(read_only=True)

    class Meta:
        model = UserRelease
        fields = ['id', 'personal_total_chapter', 'user_id', 'release_id', 'reading_status', 'rating', 'note', 'chapter_read', 'create_at', 'update_at']
        read_only_fields = ['id', 'user_id', 'create_at', 'update_at'] 

class WebtoonSearchSerializer(serializers.ModelSerializer):
    releases = serializers.SerializerMethodField()
    authors = AuthorNamesField(read_only=True)
    addable = serializers.SerializerMethodField()
    
    class Meta:
        model = Webtoon
        fields = ['id', 'title', 'authors', 'rating', 'releases', 'addable']
    
    def get_releases(self, obj):
        return ReleaseSerializer(visible_releases(obj, request_user(self)), many=True).data

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
