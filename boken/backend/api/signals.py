from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from api.models.release import Release
from api.models.user_release import UserRelease
from api.ratings import refresh_rating


def webtoon_of_release(release_id):
    return Release.objects.filter(pk=release_id).values_list("webtoon_id", flat=True).first()


@receiver(pre_save, sender=UserRelease)
def remember_previous_webtoon(sender, instance, **kwargs):
    # an admin can move an entry to another release: the old webtoon must be refreshed too
    previous = UserRelease.objects.filter(pk=instance.pk).values_list("release_id", flat=True).first()
    instance._previous_webtoon_id = webtoon_of_release(previous) if previous else None


@receiver(post_save, sender=UserRelease)
def rating_after_save(sender, instance, **kwargs):
    webtoon_id = webtoon_of_release(instance.release_id_id)
    refresh_rating(webtoon_id)
    previous = getattr(instance, "_previous_webtoon_id", None)
    if previous and previous != webtoon_id:
        refresh_rating(previous)


@receiver(post_delete, sender=UserRelease)
def rating_after_delete(sender, instance, **kwargs):
    # also called for cascades (user, release or webtoon deleted)
    refresh_rating(webtoon_of_release(instance.release_id_id))
