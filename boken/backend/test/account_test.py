from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()
ME = "/api/user/me/"


class OwnAccountTests(APITestCase):
    """A user reads and updates their own account without knowing their id."""

    def setUp(self):
        self.user = User.objects.create_user(email="reader@test.com", username="reader", password="oldpass123")
        self.other = User.objects.create_user(email="other@test.com", username="other", password="oldpass123")
        self.client.force_authenticate(user=self.user)

    def test_login_returns_the_user_id(self):
        self.client.force_authenticate(user=None)
        res = self.client.post("/login/", {"email": "reader@test.com", "password": "oldpass123"}, format="json")
        self.assertEqual(res.data["id"], str(self.user.id))

    def test_get_me(self):
        res = self.client.get(ME)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual((res.data["id"], res.data["email"], res.data["username"]), (str(self.user.id), "reader@test.com", "reader"))
        self.assertNotIn("password", res.data)

    def test_me_requires_login(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(ME).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_me_profile(self):
        res = self.client.patch(ME, {"username": "renamed", "email": "new@test.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual((self.user.username, self.user.email), ("renamed", "new@test.com"))
        self.assertTrue(self.user.check_password("oldpass123"))

    def test_put_without_password_keeps_it(self):
        res = self.client.put(f"/api/user/{self.user.id}/", {"username": "renamed", "email": "reader@test.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass123"))

    def test_cannot_take_an_email_or_username_already_used(self):
        self.assertEqual(self.client.patch(ME, {"email": "other@test.com"}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.patch(ME, {"username": "other"}, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_give_themselves_admin_rights(self):
        self.client.patch(ME, {"role": "admin", "is_staff": True, "is_superuser": True}, format="json")
        self.user.refresh_from_db()
        self.assertEqual((self.user.role, self.user.is_staff, self.user.is_superuser), ("user", False, False))

    def test_delete_me(self):
        self.assertEqual(self.client.delete(ME).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.other.pk).exists())


class PasswordChangeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="reader@test.com", username="reader", password="oldpass123")
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="adminpass123")
        self.client.force_authenticate(user=self.user)

    def test_change_password_with_current_password(self):
        res = self.client.patch(ME, {"current_password": "oldpass123", "password": "brandnew456"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("brandnew456"))

    def test_current_password_is_required(self):
        for data in ({"password": "brandnew456"}, {"password": "brandnew456", "current_password": "wrong"}):
            res = self.client.patch(ME, data, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("current_password", res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass123"))

    def test_weak_passwords_are_rejected(self):
        for weak in ("1", "12345678", "password", "reader123"):
            res = self.client.patch(ME, {"current_password": "oldpass123", "password": weak}, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, weak)
            self.assertIn("password", res.data)

    def test_admin_resets_a_user_password_without_the_current_one(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f"/api/user/{self.user.id}/", {"password": "resetbyadmin1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("resetbyadmin1"))


class SignUpPasswordTests(APITestCase):
    def test_weak_password_rejected_on_sign_up(self):
        res = self.client.post("/api/user/", {"username": "new", "email": "new@test.com", "password": "1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="new@test.com").exists())

    def test_password_required_on_sign_up(self):
        res = self.client.post("/api/user/", {"username": "new", "email": "new@test.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", res.data)

    def test_valid_sign_up(self):
        res = self.client.post("/api/user/", {"username": "new", "email": "new@test.com", "password": "securepass123"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.get(email="new@test.com").check_password("securepass123"))
