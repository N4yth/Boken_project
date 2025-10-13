from rest_framework.permissions import BasePermission
from api.models.webtoon import Webtoon

class IsSelfOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, "role") and request.user.role == "admin":
            return True
        return obj.id == request.user.id
    
class IsCreatorOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, "role") and request.user.role == "admin":
            return True
        return obj.add_by.id == request.user.id

class IsWebtoonCreatorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.user or request.user.is_authenticated:
            if request.user.is_staff or getattr(request.user, "role", "") == "admin":
                return True
            webtoon_id = request.data.get("webtoon_id")
            if not webtoon_id:
                return False
            try:
                webtoon = Webtoon.objects.get(pk=webtoon_id)
            except Webtoon.DoesNotExist:
                return False
            if hasattr(webtoon, "add_by") and webtoon.add_by.id == request.user.id:
                return True
            return False
        return False

class IsReaderOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, "role") and request.user.role == "admin":
            return True
        return obj.user_id.id == request.user.id
    
class DataAuthorization(BasePermission):
    def has_permission(self, request, view):
        if request.data.get("user_id") or request.data.get("release_id"):
            if not request.user.is_staff or getattr(request.user, "role", None) != "admin":
                return False
        return True