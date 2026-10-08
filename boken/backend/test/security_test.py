from datetime import date
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from api.models.release import Release
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon

User = get_user_model()


class AdminCreationTests(APITestCase):
    def test_anonymous_cannot_create_the_first_admin(self):
        res = self.client.post("/api/user/create_admin/", {
            "username": "boss", "email": "boss@test.com", "password": "securepass123"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(role="admin").exists())

    def test_admin_can_create_admin(self):
        admin = User.objects.create_admin(email="admin@test.com", username="admin", password="adminpass123")
        self.client.force_authenticate(user=admin)
        res = self.client.post("/api/user/create_admin/", {
            "username": "boss", "email": "boss@test.com", "password": "securepass123"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)


class ThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_login_attempts_are_limited(self):
        User.objects.create_user(email="u@test.com", username="u", password="securepass123")
        codes = [
            self.client.post("/login/", {"email": "u@test.com", "password": f"wrong{i}"}, format="json").status_code
            for i in range(11)
        ]
        self.assertEqual(codes[:10], [status.HTTP_401_UNAUTHORIZED] * 10)
        self.assertEqual(codes[10], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_sign_ups_are_limited(self):
        codes = [
            self.client.post("/api/user/", {"username": f"u{i}", "email": f"u{i}@test.com", "password": "securepass123"},
                             format="json").status_code
            for i in range(21)
        ]
        self.assertEqual(codes[:20], [status.HTTP_201_CREATED] * 20)
        self.assertEqual(codes[20], status.HTTP_429_TOO_MANY_REQUESTS)


class SessionRevocationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@test.com", username="u", password="oldpass123")
        self.refresh = str(RefreshToken.for_user(self.user))

    def refresh_works(self):
        return self.client.post("/refresh/", {"refresh": self.refresh}, format="json").status_code == status.HTTP_200_OK

    def test_logout_revokes_the_refresh_token(self):
        self.assertTrue(self.refresh_works())
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/logout/", {"refresh": self.refresh}, format="json")
        self.assertEqual(res.status_code, status.HTTP_205_RESET_CONTENT)
        self.assertFalse(self.refresh_works())

    def test_cannot_logout_someone_else(self):
        other = User.objects.create_user(email="o@test.com", username="o", password="oldpass123")
        self.client.force_authenticate(user=other)
        res = self.client.post("/logout/", {"refresh": self.refresh}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.refresh_works())

    def test_password_change_logs_out_everywhere(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.patch("/api/user/me/", {"current_password": "oldpass123", "password": "brandnew456"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(self.refresh_works())


class PublicDataTests(APITestCase):
    """Once public, a webtoon and its releases are shared data: only an admin changes them."""

    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="adminpass123")
        self.creator = User.objects.create_user(email="c@test.com", username="creator", password="securepass123")
        self.reader = User.objects.create_user(email="r@test.com", username="reader", password="securepass123")
        self.webtoon = Webtoon.objects.create(title="Public", release_date=date(2020, 1, 1), status="finish",
                                              is_public=True, add_by=self.creator)
        self.release = Release.objects.create(alt_title="P", description="d", language="ko", webtoon_id=self.webtoon,
                                              add_by=self.creator)
        UserRelease.objects.create(release_id=self.release, user_id=self.reader, reading_status="reading")

    def test_creator_cannot_edit_public_webtoon(self):
        self.client.force_authenticate(user=self.creator)
        res = self.client.patch(f"/api/webtoon/{self.webtoon.id}/", {"title": "Vandalised"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.webtoon.refresh_from_db()
        self.assertEqual(self.webtoon.title, "Public")

    def test_admin_can_edit_public_webtoon(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f"/api/webtoon/{self.webtoon.id}/", {"title": "Fixed", "rating": 4.5}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_creator_cannot_edit_or_delete_releases_of_public_webtoon(self):
        self.client.force_authenticate(user=self.creator)
        url = f"/api/releases/{self.release.id}/"
        self.assertEqual(self.client.patch(url, {"total_chapter": 1}, format="json").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(UserRelease.objects.filter(user_id=self.reader).exists())

    def test_creator_new_release_on_public_webtoon_waits_for_review(self):
        self.client.force_authenticate(user=self.creator)
        res = self.client.post("/api/releases/", {"webtoon_id": str(self.webtoon.id), "language": "en",
                                                  "alt_title": "E", "description": "d"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["waiting_review"])

    def test_creator_cannot_set_the_community_rating(self):
        self.client.force_authenticate(user=self.creator)
        res = self.client.post("/api/webtoon/", {"title": "Mine", "authors": "Me", "status": "finish", "rating": 5},
                               format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        res = self.client.post("/api/webtoon/full_create/", {
            "title": "Mine", "authors": "Me", "status": "finish", "rating": 5, "reading_status": "reading",
            "releases": [{"language": "ko", "alt_title": "M", "description": "d", "total_chapter": 3}]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(Webtoon.objects.get(title="Mine").rating, 0)


class ValueRangeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@test.com", username="u", password="securepass123")
        webtoon = Webtoon.objects.create(title="W", release_date=date(2020, 1, 1), status="finish", is_public=True)
        self.release = Release.objects.create(alt_title="W", description="d", language="ko", webtoon_id=webtoon)
        self.entry = UserRelease.objects.create(release_id=self.release, user_id=self.user, reading_status="reading")
        self.client.force_authenticate(user=self.user)

    def test_library_values_are_bounded(self):
        url = f"/api/usereleases/{self.entry.id}/"
        for data in ({"rating": 1000}, {"rating": -1}, {"chapter_read": -5}, {"personal_total_chapter": -1}):
            self.assertEqual(self.client.patch(url, data, format="json").status_code, status.HTTP_400_BAD_REQUEST, data)
        self.assertEqual(self.client.patch(url, {"rating": 4.5, "chapter_read": 3}, format="json").status_code,
                         status.HTTP_200_OK)

    def test_release_chapters_cannot_be_negative(self):
        res = self.client.post("/api/webtoon/full_create/", {
            "title": "Neg", "authors": "Me", "status": "finish", "reading_status": "reading",
            "releases": [{"language": "ko", "alt_title": "N", "description": "d", "total_chapter": -3}]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_to_public_rejects_non_boolean(self):
        admin = User.objects.create_admin(email="admin@test.com", username="admin", password="adminpass123")
        self.client.force_authenticate(user=admin)
        url = f"/api/webtoon/{self.release.webtoon_id.id}/set_to_public/"
        self.assertEqual(self.client.patch(url, {"is_public": "abc"}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.patch(url, {"is_public": False}, format="json").status_code, status.HTTP_200_OK)
