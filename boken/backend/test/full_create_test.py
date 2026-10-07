from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models.genre import Genre
from api.models.release import Release
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon

User = get_user_model()
URL = "/api/webtoon/full_create/"


class FullCreateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@test.com", username="u", password="1234")
        self.genre = Genre.objects.create(name="Action")
        self.client.force_authenticate(user=self.user)

    def payload(self, **extra):
        data = {
            "title": "Omniscient Reader", "authors": "Sing Shong, Sleepy-C", "genres": [str(self.genre.id)],
            "release_date": "2020-05-04", "status": "in progress", "reading_status": "reading", "chapter_read": 12,
            "releases": [
                {"language": "ko", "alt_title": "전지적 독자 시점", "description": "original", "total_chapter": 200},
                {"language": "en", "alt_title": "Omniscient Reader", "description": "official EN", "total_chapter": 180},
                {"language": "fr", "alt_title": "Omniscient Reader FR", "description": "VF", "total_chapter": 90},
            ],
        }
        data.update(extra)
        return data

    def test_creates_webtoon_with_several_releases(self):
        res = self.client.post(URL, self.payload(reading_language="fr"), format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        webtoon = Webtoon.objects.get(pk=res.data["webtoon_id"])
        self.assertEqual(webtoon.add_by, self.user)
        self.assertEqual(str(webtoon.release_date), "2020-05-04")
        self.assertEqual(sorted(a.name for a in webtoon.authors.all()), ["Sing Shong", "Sleepy-C"])
        self.assertEqual({r.language: r.total_chapter for r in webtoon.release.all()}, {"ko": 200, "en": 180, "fr": 90})
        self.assertFalse(webtoon.release.filter(waiting_review=True).exists())
        entry = UserRelease.objects.get(user_id=self.user)
        self.assertEqual((entry.release_id.language, entry.chapter_read, entry.personal_total_chapter), ("fr", 12, 90))

    def test_library_entry_defaults_to_first_release(self):
        res = self.client.post(URL, self.payload(), format="json")
        self.assertEqual(UserRelease.objects.get(user_id=self.user).release_id.language, "ko")
        self.assertEqual(set(res.data["release_ids"]), {"ko", "en", "fr"})

    def test_old_flat_format_still_works(self):
        data = self.payload(alt_title="ORV", description="d", language="en", total_chapter=10)
        del data["releases"]
        res = self.client.post(URL, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([r.language for r in Release.objects.all()], ["en"])

    def test_duplicate_language_rejected(self):
        data = self.payload()
        data["releases"][1]["language"] = "ko"
        res = self.client.post(URL, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Webtoon.objects.exists())

    def test_invalid_release_rolls_everything_back(self):
        data = self.payload()
        data["releases"][2]["description"] = ""
        res = self.client.post(URL, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description", res.data["details"])
        self.assertFalse(Webtoon.objects.exists())
        self.assertFalse(Release.objects.exists())

    def test_reading_language_must_match_a_release(self):
        res = self.client.post(URL, self.payload(reading_language="es"), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_release_rejected(self):
        res = self.client.post(URL, self.payload(releases=[]), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_create_public_webtoon(self):
        res = self.client.post(URL, self.payload(is_public=True, waiting_review=True), format="json")
        webtoon = Webtoon.objects.get(pk=res.data["webtoon_id"])
        self.assertEqual((webtoon.is_public, webtoon.waiting_review), (False, True))
