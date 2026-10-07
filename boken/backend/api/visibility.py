from django.db.models import Q
from api.models.release import Release
from api.permissions import is_admin


def visible_webtoon_q(user, prefix=""):
    """Public webtoons, plus the user's own ones."""
    if is_admin(user):
        return Q()
    q = Q(**{f"{prefix}is_public": True})
    if user is not None and user.is_authenticated:
        q |= Q(**{f"{prefix}add_by": user})
    return q


def visible_releases_queryset(user):
    """Published releases of visible webtoons, plus the user's own pending submissions."""
    if is_admin(user):
        return Release.objects.all()
    q = Q(waiting_review=False) & visible_webtoon_q(user, prefix="webtoon_id__")
    if user is not None and user.is_authenticated:
        q |= Q(add_by=user)
    return Release.objects.filter(q)


def visible_releases(webtoon, user):
    """Same rule on an already loaded webtoon (keeps prefetch_related working)."""
    releases = webtoon.release.all()
    if is_admin(user):
        return list(releases)
    user_id = user.id if user is not None and user.is_authenticated else None
    return [r for r in releases if not r.waiting_review or (user_id and r.add_by_id == user_id)]
