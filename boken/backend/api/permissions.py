from rest_framework.permissions import BasePermission


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

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)

class IsReleaseEditor(BasePermission):
    """
    Admin, creator of a webtoon that is still private, or the submitter of a release
    still waiting for review. Releases of a public webtoon are shared data: only an admin
    changes them (deleting one also deletes the readers' library entries).
    """
    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        webtoon = obj.webtoon_id
        if webtoon is not None and not webtoon.is_public and webtoon.add_by_id == request.user.id:
            return True
        return obj.waiting_review and obj.add_by_id == request.user.id

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
