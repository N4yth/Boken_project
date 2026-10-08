"""
Community rating of a webtoon = average of its readers' ratings.

- a rating of 0 means "not rated" (the library entry is created with 0), so only 0.5-5 counts
- one vote per user: a user following the webtoon in several languages counts once,
  with the average of their ratings
- the result is stored on Webtoon.rating / Webtoon.rating_count so lists, search filters
  and sorting keep working; it is refreshed by the signals of api/signals.py
"""
from django.db.models import Avg

from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon


def compute_rating(webtoon_id):
    per_user = (
        UserRelease.objects.filter(release_id__webtoon_id=webtoon_id, rating__gt=0)
        .values("user_id")
        .annotate(user_rating=Avg("rating"))
    )
    ratings = [row["user_rating"] for row in per_user]
    if not ratings:
        return 0.0, 0
    return round(sum(ratings) / len(ratings), 2), len(ratings)


def refresh_rating(webtoon_id):
    if webtoon_id is None:
        return
    rating, count = compute_rating(webtoon_id)
    # update() so a webtoon being deleted (cascade) is simply skipped, and update_at is not touched
    Webtoon.objects.filter(pk=webtoon_id).update(rating=rating, rating_count=count)
