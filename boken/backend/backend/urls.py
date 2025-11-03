from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView
from api.views.views import MyTokenObtainPairView, verify_token
from api.views.user import UserViewSet
from api.views.webtoon import WebtoonViewSet, WebtoonSearchView
from api.views.genre import GenreViewSet
from api.views.release import ReleaseViewSet
from api.views.user_release import UserReleaseViewSet
from api.views.admin_command import update_all, create_new, get_progress

router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'webtoons', WebtoonViewSet)
router.register(r'genres', GenreViewSet)
router.register(r'releases', ReleaseViewSet)
router.register(r'usereleases', UserReleaseViewSet)

urlpatterns = [
    path('admin/update_all/', update_all, name='update_all'),
    path('admin/create/', create_new, name='create_new'),
    path('admin/update/', get_progress, name='update'),

    path('api/webtoons/search/', WebtoonSearchView.as_view(), name='webtoon-search'),

    path('api/', include(router.urls)),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify_token/', verify_token, name='verify_token'),
]

