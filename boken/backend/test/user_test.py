from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class UserPermissionTests(APITestCase):
    def setUp(self):
        # URLs
        self.users_url = "/api/user/"
        self.create_admin_url = "/api/user/create_admin/"

        # Création d’un utilisateur simple
        self.user = User.objects.create_user(
            email="user@test.com", username="user", password="1234"
        )

        # Création d’un admin
        self.admin = User.objects.create_admin(
            email="admin@test.com", username="admin", password="admin1234"
        )

        # JWT tokens
        self.user_token = self.get_token_for_user(self.user)
        self.admin_token = self.get_token_for_user(self.admin)

    def get_token_for_user(self, user):
        """Retourne un JWT valide pour un utilisateur donné"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    # === TESTS POST ===
    def test_user_can_register(self):
        """✅ Un utilisateur peut créer un compte user"""
        data = {"email": "new@test.com", "username": "new", "password": "1234"}
        response = self.client.post(self.users_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_create_admin(self):
        """🚫 Un user ne peut pas créer un admin"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        data = {"email": "badadmin@test.com", "username": "badadmin", "password": "1234", "role": "admin"}
        response = self.client.post(self.create_admin_url, data, format="json")
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])

    def test_admin_can_create_admin(self):
        """✅ Un admin peut créer un autre admin"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        data = {"email": "secondadmin@test.com", "username": "secondadmin", "password": "1234", "role": "admin"}
        response = self.client.post(self.create_admin_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "admin")

    # === TESTS PATCH ===
    def test_user_can_partial_update_self(self):
        """✅ Un user peut modifier son propre compte"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.users_url}{self.user.id}/"
        data = {"username": "user_edited"}
        response = self.client.patch(url, data, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_202_ACCEPTED])

    def test_user_cannot_partial_update_other(self):
        """🚫 Un user ne peut pas modifier un autre utilisateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.users_url}{self.admin.id}/"
        data = {"username": "hacked_admin"}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_partial_update_anyone(self):
        """✅ Un admin peut modifier n’importe quel utilisateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.users_url}{self.user.id}/"
        data = {"username": "user_modified_by_admin"}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # === TESTS PUT ===
    def test_user_can_update_self(self):
        """✅ Un user peut modifier son propre compte"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.users_url}{self.user.id}/"
        data = {
            "username": "user_edited",
            "email": "user@test.com", 
            "password": "1234"
        }
        response = self.client.put(url, data, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_202_ACCEPTED])

    def test_user_cannot_update_other(self):
        """🚫 Un user ne peut pas modifier un autre utilisateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.users_url}{self.admin.id}/"
        data = {
            "username": "hacked_admin",
            "email": "hack@admin.com", 
            "password": "1234"
         }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_anyone(self):
        """✅ Un admin peut modifier n’importe quel utilisateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.users_url}{self.user.id}/"
        data = {
            "username": "user_modified_by_admin",
            "email": "by@admin.com", 
            "password": "1111"
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # === TESTS DELETE ===
    def test_user_can_delete_self(self):
        """✅ Un user peut supprimer son propre compte"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.users_url}{self.user.id}/"
        response = self.client.delete(url)
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    def test_user_cannot_delete_admin(self):
        """🚫 Un user ne peut pas supprimer un admin"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.users_url}{self.admin.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_user(self):
        """✅ Un admin peut supprimer un utilisateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.users_url}{self.user.id}/"
        response = self.client.delete(url)
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    # === TESTS GET ===
    def test_admin_can_list_all_users(self):
        """✅ Un admin peut lister tous les utilisateurs"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.users_url}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_can_only_view_self(self):
        """🚫 Un user ne peut voir que ses propres informations"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.users_url}"

        list_response = self.client.get(url)
        self.assertIn(list_response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED])

        detail_url = f"{url}{self.user.id}/"
        detail_response = self.client.get(detail_url)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["email"], "user@test.com")

        other_detail_url = f"{url}{self.admin.id}/"
        other_response = self.client.get(other_detail_url)
        self.assertIn(other_response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

class VerifyTokenTests(APITestCase):
    def setUp(self):
        user = User.objects.create_user(email="v@test.com", username="v", password="1234")
        self.token = str(RefreshToken.for_user(user).access_token)

    def test_token_in_body(self):
        res = self.client.post("/verify_token/", {"token": self.token}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_token_in_authorization_header(self):
        res = self.client.post("/verify_token/", HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_missing_or_bad_token(self):
        self.assertEqual(self.client.post("/verify_token/").status_code, status.HTTP_401_UNAUTHORIZED)
        res = self.client.post("/verify_token/", HTTP_AUTHORIZATION="Bearer nope")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
