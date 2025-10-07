from rest_framework.permissions import BasePermission

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
