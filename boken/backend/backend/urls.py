from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from api.views.user import UserViewSet
from api.views.webtoon import WebtoonViewSet
from api.views.genre import GenreViewSet
from api.views.release import ReleaseViewSet
from api.views.user_release import UserReleaseViewSet

router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'webtoons', WebtoonViewSet)
router.register(r'genres', GenreViewSet)
router.register(r'releases', ReleaseViewSet)
router.register(r'usereleases', UserReleaseViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
