from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models.release import Release
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon

User = get_user_model()


class ReleaseSubmissionTests(APITestCase):
    """Readers can submit releases for webtoons in their library, admins review them."""

    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="admin1234")
        self.creator = User.objects.create_user(email="creator@test.com", username="creator", password="1234")
        self.reader = User.objects.create_user(email="reader@test.com", username="reader", password="1234")
        self.other = User.objects.create_user(email="other@test.com", username="other", password="1234")

        self.webtoon = Webtoon.objects.create(
            title="Tower", release_date=date(2020, 1, 1), status="in progress", is_public=True, add_by=self.creator
        )
        self.korean = Release.objects.create(
            alt_title="탑", description="d", language="ko", total_chapter=550, webtoon_id=self.webtoon
        )
        UserRelease.objects.create(release_id=self.korean, user_id=self.reader, reading_status="reading")

    def submit(self, user, language="fr", webtoon=None):
        self.client.force_authenticate(user=user)
        return self.client.post("/api/releases/", {
            "webtoon_id": (webtoon or self.webtoon).id, "alt_title": f"Tower {language}",
            "description": "d", "language": language, "total_chapter": 100,
        }, format="json")

    def release_languages(self, user):
        self.client.force_authenticate(user=user)
        res = self.client.get(f"/api/webtoon/{self.webtoon.id}/")
        return [r["language"] for r in res.data["releases"]]

    # --- creation rules ---

    def test_reader_with_webtoon_in_library_submits_for_review(self):
        res = self.submit(self.reader)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertTrue(res.data["waiting_review"])
        self.assertEqual(res.data["add_by"], self.reader.id)

    def test_reader_without_webtoon_in_library_is_refused(self):
        res = self.submit(self.other)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_creator_and_admin_publish_directly(self):
        self.assertFalse(self.submit(self.creator, "en").data["waiting_review"])
        self.assertFalse(self.submit(self.admin, "es").data["waiting_review"])

    def test_cannot_publish_own_submission_by_patching(self):
        release_id = self.submit(self.reader).data["id"]
        res = self.client.patch(f"/api/releases/{release_id}/", {"waiting_review": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(Release.objects.get(pk=release_id).waiting_review)

    def test_submitter_cannot_move_release_to_another_webtoon(self):
        mine = Webtoon.objects.create(title="Mine", release_date=date(2020, 1, 1), status="finish", add_by=self.reader)
        release_id = self.submit(self.reader).data["id"]
        self.client.patch(f"/api/releases/{release_id}/", {"webtoon_id": str(mine.id)}, format="json")
        self.assertEqual(Release.objects.get(pk=release_id).webtoon_id, self.webtoon)

    # --- visibility ---

    def test_pending_release_only_visible_to_submitter_and_admin(self):
        self.submit(self.reader)
        self.assertEqual(self.release_languages(self.reader), ["ko", "fr"])
        self.assertEqual(self.release_languages(self.admin), ["ko", "fr"])
        self.assertEqual(self.release_languages(self.other), ["ko"])
        self.client.force_authenticate(user=None)
        self.assertEqual([r["language"] for r in self.client.get("/api/releases/").data], ["ko"])

    def test_pending_release_hidden_in_search(self):
        self.submit(self.reader)
        self.client.force_authenticate(user=self.other)
        res = self.client.get("/api/webtoon/search/?title=tower")
        self.assertEqual([r["language"] for r in res.data[0]["releases"]], ["ko"])

    def test_cannot_add_someone_else_pending_release_to_library(self):
        release_id = self.submit(self.reader).data["id"]
        self.client.force_authenticate(user=self.other)
        res = self.client.post("/api/usereleases/", {"release_id": release_id, "reading_status": "reading"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_add_release_of_someone_else_private_webtoon_to_library(self):
        private = Webtoon.objects.create(title="Secret", release_date=date(2020, 1, 1), status="finish", add_by=self.creator)
        release = Release.objects.create(alt_title="S", description="d", language="ko", webtoon_id=private)
        self.client.force_authenticate(user=self.other)
        res = self.client.post("/api/usereleases/", {"release_id": str(release.id), "reading_status": "reading"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # --- review ---

    def test_admin_approves_release(self):
        release_id = self.submit(self.reader).data["id"]
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/releases/{release_id}/review/", {"approve": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.release_languages(self.other), ["ko", "fr"])

    def test_admin_rejects_release(self):
        release_id = self.submit(self.reader).data["id"]
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/releases/{release_id}/review/", {"approve": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Release.objects.filter(pk=release_id).exists())

    def test_review_requires_admin_and_boolean(self):
        release_id = self.submit(self.reader).data["id"]
        res = self.client.post(f"/api/releases/{release_id}/review/", {"approve": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/releases/{release_id}/review/", {"approve": "yes"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class WebtoonReviewTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="admin1234")
        self.user = User.objects.create_user(email="u@test.com", username="u", password="1234")
        self.webtoon = Webtoon.objects.create(
            title="Mine", release_date=date(2020, 1, 1), status="finish", add_by=self.user, waiting_review=True
        )

    def test_pending_list_is_admin_only(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get("/api/webtoon/check/").status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/webtoon/check/")
        self.assertEqual([w["title"] for w in res.data], ["Mine"])

    def test_approve_makes_public(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/webtoon/{self.webtoon.id}/review/", {"approve": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.webtoon.refresh_from_db()
        self.assertEqual((self.webtoon.is_public, self.webtoon.waiting_review), (True, False))

    def test_reject_keeps_private(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(f"/api/webtoon/{self.webtoon.id}/review/", {"approve": False}, format="json")
        self.webtoon.refresh_from_db()
        self.assertEqual((self.webtoon.is_public, self.webtoon.waiting_review), (False, False))

    def test_user_cannot_review(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f"/api/webtoon/{self.webtoon.id}/review/", {"approve": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class LoginRoleTests(APITestCase):
    def test_login_returns_role(self):
        User.objects.create_admin(email="admin@test.com", username="admin", password="admin1234")
        res = self.client.post("/login/", {"email": "admin@test.com", "password": "admin1234"}, format="json")
        self.assertEqual((res.data["username"], res.data["role"]), ("admin", "admin"))
