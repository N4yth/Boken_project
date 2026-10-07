from django.core.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from api.models.webtoon import Webtoon


def is_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or getattr(user, "role", None) == "admin"))


class IsSelfOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        return obj.id == request.user.id

class IsCreatorOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        return obj.add_by_id is not None and obj.add_by_id == request.user.id

class IsWebtoonCreatorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if is_admin(request.user):
            return True
        webtoon_id = request.data.get("webtoon_id")
        if not webtoon_id:
            # creation needs a target webtoon, updates are checked on the object
            return view.action != "create"
        try:
            webtoon = Webtoon.objects.get(pk=webtoon_id)
        except (Webtoon.DoesNotExist, ValidationError):
            return False
        return webtoon.add_by_id is not None and webtoon.add_by_id == request.user.id

    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        webtoon = obj.webtoon_id
        return webtoon is not None and webtoon.add_by_id == request.user.id

class IsReaderOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        return obj.user_id_id == request.user.id

class DataAuthorization(BasePermission):
    def has_permission(self, request, view):
        if request.data.get("user_id") or request.data.get("release_id"):
            if not is_admin(request.user):
                return False
        return True
