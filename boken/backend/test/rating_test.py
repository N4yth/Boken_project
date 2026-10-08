from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.external_api import save_webtoon
from api.models.release import Release
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon

User = get_user_model()


class CommunityRatingTests(APITestCase):
    """Webtoon.rating = average of the readers' ratings, Webtoon.rating_count = number of readers who rated."""

    def setUp(self):
        self.webtoon = Webtoon.objects.create(title="Tower of God", release_date=date(2010, 1, 1),
                                              status="in progress", is_public=True)
        self.ko = Release.objects.create(alt_title="K", description="d", language="ko", webtoon_id=self.webtoon)
        self.en = Release.objects.create(alt_title="E", description="d", language="en", webtoon_id=self.webtoon)
        self.users = [User.objects.create_user(email=f"u{i}@test.com", username=f"u{i}", password="securepass123")
                      for i in range(4)]

    def rate(self, user, rating, release=None):
        return UserRelease.objects.create(release_id=release or self.ko, user_id=user,
                                          reading_status="reading", rating=rating)

    def current(self):
        self.webtoon.refresh_from_db()
        return self.webtoon.rating, self.webtoon.rating_count

    def test_average_of_the_readers(self):
        self.rate(self.users[0], 4)
        self.rate(self.users[1], 5)
        self.rate(self.users[2], 3.5, release=self.en)
        self.assertEqual(self.current(), (4.17, 3))

    def test_unrated_entries_do_not_count(self):
        self.rate(self.users[0], 4)
        self.rate(self.users[1], 0)
        self.assertEqual(self.current(), (4.0, 1))

    def test_no_rating(self):
        self.rate(self.users[0], 0)
        self.assertEqual(self.current(), (0.0, 0))

    def test_one_vote_per_user_across_languages(self):
        self.rate(self.users[0], 5, release=self.ko)
        self.rate(self.users[0], 3, release=self.en)
        self.rate(self.users[1], 2)
        # user 0 counts once with (5 + 3) / 2 = 4, then (4 + 2) / 2
        self.assertEqual(self.current(), (3.0, 2))

    def test_refreshed_when_a_rating_changes_through_the_api(self):
        entry = self.rate(self.users[0], 2)
        self.client.force_authenticate(user=self.users[0])
        res = self.client.patch(f"/api/usereleases/{entry.id}/", {"rating": 4.5}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.current(), (4.5, 1))

    def test_refreshed_when_an_entry_is_removed(self):
        self.rate(self.users[0], 2)
        entry = self.rate(self.users[1], 4)
        self.client.force_authenticate(user=self.users[1])
        self.client.delete(f"/api/usereleases/{entry.id}/")
        self.assertEqual(self.current(), (2.0, 1))

    def test_refreshed_when_a_user_or_a_release_is_deleted(self):
        self.rate(self.users[0], 2)
        self.rate(self.users[1], 4, release=self.en)
        self.users[0].delete()
        self.assertEqual(self.current(), (4.0, 1))
        self.en.delete()
        self.assertEqual(self.current(), (0.0, 0))

    def test_deleting_the_webtoon_works(self):
        self.rate(self.users[0], 4)
        self.webtoon.delete()
        self.assertFalse(Webtoon.objects.exists())

    def test_admin_moving_an_entry_refreshes_both_webtoons(self):
        other = Webtoon.objects.create(title="Other", release_date=date(2020, 1, 1), status="finish", is_public=True)
        other_release = Release.objects.create(alt_title="O", description="d", language="ko", webtoon_id=other)
        entry = self.rate(self.users[0], 5)
        entry.release_id = other_release
        entry.save()
        self.assertEqual(self.current(), (0.0, 0))
        other.refresh_from_db()
        self.assertEqual((other.rating, other.rating_count), (5.0, 1))

    def test_visible_in_lists_detail_and_search(self):
        self.rate(self.users[0], 4)
        self.rate(self.users[1], 5)
        detail = self.client.get(f"/api/webtoon/{self.webtoon.id}/").data
        listed = self.client.get("/api/webtoon/").data[0]
        found = self.client.get("/api/webtoon/search/?min_rating=4.5").data[0]
        for data in (detail, listed, found):
            self.assertEqual((data["rating"], data["rating_count"]), (4.5, 2))
        self.assertEqual(self.client.get("/api/webtoon/search/?min_rating=4.6").data, [])

    def test_anilist_reimport_keeps_the_readers_rating(self):
        self.rate(self.users[0], 4)
        entry = {
            "title": {"english": "Tower of God", "romaji": "Kami no Tou", "native": "신의 탑"},
            "description": "d", "startDate": {"year": 2010}, "status": "RELEASING", "genres": [],
            "format": "MANGA", "countryOfOrigin": "KR", "chapters": 600, "staff": {"edges": []},
        }
        save_webtoon(entry)
        self.assertEqual(self.current(), (4.0, 1))
