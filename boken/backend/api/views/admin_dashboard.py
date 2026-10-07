from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from api.permissions import IsAdmin
from api.models.author import Author
from api.models.genre import Genre
from api.models.release import Release
from api.models.user import User
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon
from api.serializers import ReleaseSerializer, WebtoonSerializer
from api.views import admin_command


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def dashboard(request):
    """Everything the admin dashboard needs in one call."""
    published = Release.objects.filter(waiting_review=False)

    pending_releases = []
    for release in Release.objects.filter(waiting_review=True).select_related('webtoon_id', 'add_by'):
        data = ReleaseSerializer(release).data
        data["webtoon_title"] = release.webtoon_id.title if release.webtoon_id else None
        data["submitted_by"] = release.add_by.username if release.add_by else None
        pending_releases.append(data)

    users = User.objects.annotate(library_size=Count('userrelease')).order_by('-create_at')

    return Response({
        "counts": {
            "users": User.objects.count(),
            "admins": User.objects.filter(role="admin").count(),
            "webtoons": Webtoon.objects.count(),
            "public_webtoons": Webtoon.objects.filter(is_public=True).count(),
            "releases": published.count(),
            "authors": Author.objects.count(),
            "genres": Genre.objects.count(),
            "library_entries": UserRelease.objects.count(),
            "pending_webtoons": Webtoon.objects.filter(waiting_review=True).count(),
            "pending_releases": len(pending_releases),
        },
        "releases_per_language": {
            row["language"]: row["total"]
            for row in published.values("language").annotate(total=Count("id")).order_by("language")
        },
        "pending_webtoons": WebtoonSerializer(
            Webtoon.objects.filter(waiting_review=True), many=True, context={'request': request}
        ).data,
        "pending_releases": pending_releases,
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "library_size": u.library_size,
                "create_at": u.create_at,
            }
            for u in users
        ],
        "import_progress": admin_command.progress,
    })
