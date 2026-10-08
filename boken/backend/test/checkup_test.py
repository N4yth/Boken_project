from datetime import date
from unittest.mock import patch, MagicMock
import requests
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api import external_api
from api.models.author import Author
from api.models.genre import Genre
from api.models.release import Release
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon

User = get_user_model()


class PasswordUpdateTests(APITestCase):
    def test_patch_password_is_hashed_and_usable(self):
        user = User.objects.create_user(email="u@test.com", username="u", password="oldpass123")
        self.client.force_authenticate(user=user)
        res = self.client.patch(f"/api/user/{user.id}/", {"password": "newpass456", "current_password": "oldpass123"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertNotEqual(user.password, "newpass456")
        self.assertTrue(user.check_password("newpass456"))
        self.client.force_authenticate(user=None)
        res = self.client.post("/login/", {"email": "u@test.com", "password": "newpass456"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_patch_without_password_keeps_it(self):
        user = User.objects.create_user(email="u@test.com", username="u", password="oldpass123")
        self.client.force_authenticate(user=user)
        self.client.patch(f"/api/user/{user.id}/", {"username": "renamed"}, format="json")
        user.refresh_from_db()
        self.assertEqual(user.username, "renamed")
        self.assertTrue(user.check_password("oldpass123"))


class CreatorRulesTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="admin1234")
        self.creator = User.objects.create_user(email="creator@test.com", username="creator", password="1234")
        self.public = Webtoon.objects.create(title="Public", release_date=date(2020, 1, 1), status="finish",
                                             is_public=True, add_by=self.creator)
        self.private = Webtoon.objects.create(title="Private", release_date=date(2020, 1, 1), status="finish",
                                              add_by=self.creator)

    def test_public_list_does_not_leak_creator_email(self):
        res = self.client.get("/api/webtoon/")
        self.assertEqual(dict(res.data[0]["add_by"]), {"id": str(self.creator.id), "username": "creator"})
        self.assertNotIn("creator@test.com", str(res.content))

    def test_creator_cannot_make_own_webtoon_public(self):
        self.client.force_authenticate(user=self.creator)
        res = self.client.patch(f"/api/webtoon/{self.private.id}/", {"is_public": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.private.refresh_from_db()
        self.assertFalse(self.private.is_public)

    def test_creator_can_still_edit_and_submit_for_review(self):
        self.client.force_authenticate(user=self.creator)
        res = self.client.patch(f"/api/webtoon/{self.private.id}/", {"title": "Renamed", "waiting_review": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_creator_cannot_delete_public_webtoon(self):
        self.client.force_authenticate(user=self.creator)
        self.assertEqual(self.client.delete(f"/api/webtoon/{self.public.id}/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Webtoon.objects.filter(pk=self.public.pk).exists())
        self.assertEqual(self.client.delete(f"/api/webtoon/{self.private.id}/").status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_delete_public_webtoon(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.delete(f"/api/webtoon/{self.public.id}/").status_code, status.HTTP_204_NO_CONTENT)


class LibraryDuplicateTests(APITestCase):
    def test_same_release_cannot_be_added_twice(self):
        user = User.objects.create_user(email="u@test.com", username="u", password="1234")
        webtoon = Webtoon.objects.create(title="W", release_date=date(2020, 1, 1), status="finish", is_public=True)
        release = Release.objects.create(alt_title="W", description="d", language="ko", webtoon_id=webtoon)
        self.client.force_authenticate(user=user)
        data = {"release_id": str(release.id), "reading_status": "reading"}
        self.assertEqual(self.client.post("/api/usereleases/", data, format="json").status_code, status.HTTP_201_CREATED)
        res = self.client.post("/api/usereleases/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(UserRelease.objects.count(), 1)


class WebtoonListQueriesTests(APITestCase):
    def make_webtoons(self, start, count, genre):
        for i in range(start, start + count):
            webtoon = Webtoon.objects.create(title=f"W{i}", release_date=date(2020, 1, 1), status="finish", is_public=True)
            webtoon.genres.add(genre)
            webtoon.authors.set(Author.from_names([f"Author {i}"]))
            Release.objects.create(alt_title=f"W{i}", description="d", language="ko", webtoon_id=webtoon)

    def count_queries(self, url):
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        return len(ctx.captured_queries)

    def test_query_count_does_not_grow_with_webtoons(self):
        user = User.objects.create_user(email="u@test.com", username="u", password="1234")
        genre = Genre.objects.create(name="Action")
        self.client.force_authenticate(user=user)
        self.make_webtoons(0, 2, genre)
        few = {url: self.count_queries(url) for url in ("/api/webtoon/", "/api/webtoon/logged_user/")}
        self.make_webtoons(2, 10, genre)
        for url, before in few.items():
            self.assertEqual(self.count_queries(url), before, url)


class AnilistRetryTests(APITestCase):
    def test_gives_up_after_max_attempts(self):
        failing = MagicMock(status_code=500, text="server error")
        with patch("api.external_api.requests.post", return_value=failing) as post, \
                patch("api.external_api.time.sleep") as sleep:
            with self.assertRaises(RuntimeError):
                external_api.fetch_page(1)
        self.assertEqual(post.call_count, external_api.MAX_ATTEMPTS)
        # retry pauses only (the other pauses space the requests to respect the rate limit)
        retry_pauses = [c for c in sleep.call_args_list if c.args == (external_api.RETRY_DELAY,)]
        self.assertEqual(len(retry_pauses), external_api.MAX_ATTEMPTS - 1)
        self.assertEqual(post.call_args.kwargs["timeout"], 30)

    def test_network_error_then_success(self):
        ok = MagicMock(status_code=200)
        ok.json.return_value = {"data": {"Page": {"media": [], "pageInfo": {"hasNextPage": False}}}}
        with patch("api.external_api.requests.post", side_effect=[requests.ConnectionError("down"), ok]), \
                patch("api.external_api.time.sleep"):
            self.assertEqual(external_api.fetch_page(1)["media"], [])
