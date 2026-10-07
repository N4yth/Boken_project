from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models.author import Author
from api.models.release import Release
from api.models.webtoon import Webtoon
from api.external_api import save_webtoon

User = get_user_model()


class AuthorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@test.com", username="u", password="1234")
        self.client.force_authenticate(user=self.user)

    def test_create_with_comma_string_and_reuse_author(self):
        res = self.client.post("/api/webtoon/", {"title": "A", "authors": "Kim, Lee", "status": "finish"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(sorted(a["name"] for a in res.data["authors"]), ["Kim", "Lee"])

        res = self.client.post("/api/webtoon/", {"title": "B", "authors": ["Kim"], "status": "finish"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Author.objects.filter(name="Kim").count(), 1)
        self.assertEqual(Author.objects.get(name="Kim").webtoons.count(), 2)

    def test_search_by_author(self):
        webtoon = Webtoon.objects.create(title="Solo", release_date=date(2020, 1, 1), status="finish", is_public=True)
        webtoon.authors.set(Author.from_names("Chugong, Dubu"))
        res = self.client.get("/api/webtoon/search/?author=chug")
        self.assertEqual([w["title"] for w in res.data], ["Solo"])

    def test_full_create_accepts_author_string(self):
        res = self.client.post("/api/webtoon/full_create/", {
            "title": "Full", "authors": "Park, Choi", "release_date": "2020-01-01", "status": "finish",
            "waiting_review": False, "rating": 0, "genres": [], "alt_title": "Full", "description": "d",
            "language": "en", "total_chapter": 3, "personal_total_chapter": 0, "chapter_read": 0,
            "note": "", "personal_rating": 0, "reading_status": "to read",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        webtoon = Webtoon.objects.get(title="Full")
        self.assertEqual(sorted(a.name for a in webtoon.authors.all()), ["Choi", "Park"])

    def test_full_create_rejects_unknown_language(self):
        res = self.client.post("/api/webtoon/full_create/", {
            "title": "Bad", "authors": "X", "release_date": "2020-01-01", "status": "finish",
            "waiting_review": False, "rating": 0, "genres": [], "alt_title": "Bad", "description": "d",
            "language": "eng", "total_chapter": 3, "personal_total_chapter": 0, "chapter_read": 0,
            "note": "", "personal_rating": 0, "reading_status": "to read",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Webtoon.objects.filter(title="Bad").exists())


class ReleaseLanguageTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@test.com", username="u", password="1234")
        self.webtoon = Webtoon.objects.create(
            title="Tower", release_date=date(2020, 1, 1), status="in progress", is_public=True, add_by=self.user
        )
        Release.objects.create(alt_title="탑", description="d", language="ko", total_chapter=550, webtoon_id=self.webtoon)
        self.client.force_authenticate(user=self.user)

    def test_each_language_has_its_own_chapter_count(self):
        res = self.client.post("/api/releases/", {
            "webtoon_id": self.webtoon.id, "alt_title": "Tower", "description": "d", "language": "en", "total_chapter": 400,
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        res = self.client.get(f"/api/webtoon/{self.webtoon.id}/")
        self.assertEqual([(r["language"], r["total_chapter"]) for r in res.data["releases"]], [("ko", 550), ("en", 400)])

    def test_same_language_twice_is_rejected(self):
        res = self.client.post("/api/releases/", {
            "webtoon_id": self.webtoon.id, "alt_title": "Other", "description": "d", "language": "ko",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_language_is_rejected(self):
        res = self.client.post("/api/releases/", {
            "webtoon_id": self.webtoon.id, "alt_title": "Other", "description": "d", "language": "eng",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AnilistImportTests(APITestCase):
    ENTRY = {
        "title": {"english": "Tower of God", "romaji": "Kami no Tou", "native": "신의 탑"},
        "description": "desc",
        "startDate": {"year": 2010},
        "status": "RELEASING",
        "genres": ["Action"],
        "format": "MANGA",
        "countryOfOrigin": "KR",
        "chapters": None,
        "staff": {"edges": [
            {"role": "Story & Art", "node": {"name": {"full": "SIU"}}},
            {"role": "Translator (English)", "node": {"name": {"full": "Someone"}}},
        ]},
    }

    def test_import_uses_origin_language_and_real_authors(self):
        self.assertTrue(save_webtoon(self.ENTRY))
        webtoon = Webtoon.objects.get(title="Tower of God")
        self.assertEqual([a.name for a in webtoon.authors.all()], ["SIU"])
        release = webtoon.release.get()
        self.assertEqual((release.language, release.alt_title, release.total_chapter), ("ko", "신의 탑", 0))

    def test_reimport_updates_instead_of_duplicating(self):
        save_webtoon(self.ENTRY)
        self.assertFalse(save_webtoon({**self.ENTRY, "chapters": 600}))
        release = Release.objects.get(webtoon_id__title="Tower of God")
        self.assertEqual(release.total_chapter, 600)
