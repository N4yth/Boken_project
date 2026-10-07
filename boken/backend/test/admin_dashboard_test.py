from datetime import date
from unittest.mock import patch
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models.release import Release
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon
from api.views import admin_command

User = get_user_model()


class AdminDashboardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="admin1234")
        self.user = User.objects.create_user(email="u@test.com", username="reader", password="1234")
        public = Webtoon.objects.create(title="Public", release_date=date(2020, 1, 1), status="finish", is_public=True)
        Webtoon.objects.create(title="Waiting", release_date=date(2020, 1, 1), status="finish",
                               add_by=self.user, waiting_review=True)
        ko = Release.objects.create(alt_title="K", description="d", language="ko", webtoon_id=public)
        Release.objects.create(alt_title="E", description="d", language="en", webtoon_id=public)
        Release.objects.create(alt_title="F", description="d", language="fr", webtoon_id=public,
                               waiting_review=True, add_by=self.user)
        UserRelease.objects.create(release_id=ko, user_id=self.user, reading_status="reading")

    def test_admin_gets_dashboard(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/admin/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        counts = res.data["counts"]
        self.assertEqual((counts["users"], counts["webtoons"], counts["releases"]), (2, 2, 2))
        self.assertEqual((counts["pending_webtoons"], counts["pending_releases"]), (1, 1))
        self.assertEqual(res.data["releases_per_language"], {"en": 1, "ko": 1})
        self.assertEqual([w["title"] for w in res.data["pending_webtoons"]], ["Waiting"])
        pending = res.data["pending_releases"][0]
        self.assertEqual((pending["language"], pending["webtoon_title"], pending["submitted_by"]), ("fr", "Public", "reader"))
        reader = next(u for u in res.data["users"] if u["username"] == "reader")
        self.assertEqual(reader["library_size"], 1)
        self.assertIn("status", res.data["import_progress"])

    def test_dashboard_is_admin_only(self):
        self.assertEqual(self.client.get("/admin/dashboard/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get("/admin/dashboard/").status_code, status.HTTP_403_FORBIDDEN)


class AnilistImportGuardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="admin1234")
        self.client.force_authenticate(user=self.admin)
        self.saved = dict(admin_command.progress)

    def tearDown(self):
        admin_command.progress.clear()
        admin_command.progress.update(self.saved)

    def test_cannot_start_two_imports(self):
        with patch("api.views.admin_command.threading.Thread") as thread:
            self.assertEqual(self.client.get("/admin/create/").status_code, status.HTTP_200_OK)
            self.assertEqual(self.client.get("/admin/create/").status_code, status.HTTP_409_CONFLICT)
            self.assertEqual(thread.call_count, 1)

    def test_status_is_released_when_import_ends_or_crashes(self):
        last_page = {"media": [], "pageInfo": {"hasNextPage": False}}
        with patch("api.views.admin_command.fetch_page", return_value=last_page):
            admin_command.create_from_anilist()
        self.assertEqual(admin_command.progress["status"], "finish")
        with patch("api.views.admin_command.fetch_page", side_effect=RuntimeError("AniList down")):
            admin_command.create_from_anilist()
        self.assertEqual((admin_command.progress["status"], admin_command.progress["error"]), ("error", "AniList down"))
