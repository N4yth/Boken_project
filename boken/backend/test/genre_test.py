from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class GenrePermissionTests(APITestCase):
    def setUp(self):
        # URLs
        self.genres_url = "/api/genres/"

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

        # Genre initial (créé par un admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        self.genre = self.client.post(
            self.genres_url,
            {"name": "Action"},
            format="json"
        ).data
        self.genre_detail_url = f"{self.genres_url}{self.genre['id']}/"

        # Reset auth
        self.client.credentials()

    def get_token_for_user(self, user):
        """Retourne un JWT valide pour un utilisateur donné"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    # === GET (list + retrieve) ===
    def test_anyone_can_list_genres(self):
        """✅ Tous les utilisateurs (même anonymes) peuvent voir la liste"""
        response = self.client.get(self.genres_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_anyone_can_retrieve_genre(self):
        """✅ Tous les utilisateurs peuvent voir un genre"""
        response = self.client.get(self.genre_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("name", response.data)

    # === POST (create) ===
    def test_admin_can_create_genre(self):
        """✅ Seul un admin peut créer un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        response = self.client.post(self.genres_url, {"name": "Comedy"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_create_genre(self):
        """🚫 Un utilisateur normal ne peut PAS créer un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        response = self.client.post(self.genres_url, {"name": "Drama"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_genre(self):
        """🚫 Un utilisateur non authentifié ne peut PAS créer un genre"""
        response = self.client.post(self.genres_url, {"name": "Romance"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # === PUT (update) ===
    def test_admin_can_update_genre(self):
        """✅ Un admin peut modifier un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        response = self.client.put(self.genre_detail_url, {"name": "Updated Action"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_cannot_update_genre(self):
        """🚫 Un user ne peut pas modifier un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        response = self.client.put(self.genre_detail_url, {"name": "UserEdit"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_update_genre(self):
        """🚫 Un utilisateur anonyme ne peut pas modifier un genre"""
        response = self.client.put(self.genre_detail_url, {"name": "AnonEdit"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # === PATCH (partial_update) ===
    def test_admin_can_partial_update_genre(self):
        """✅ Un admin peut modifier partiellement un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        response = self.client.patch(self.genre_detail_url, {"name": "Partial Action"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_cannot_partial_update_genre(self):
        """🚫 Un user ne peut pas modifier partiellement un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        response = self.client.patch(self.genre_detail_url, {"name": "HackPatch"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # === DELETE ===
    def test_admin_can_delete_genre(self):
        """✅ Un admin peut supprimer un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        response = self.client.delete(self.genre_detail_url)
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    def test_user_cannot_delete_genre(self):
        """🚫 Un user ne peut pas supprimer un genre"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        response = self.client.delete(self.genre_detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_delete_genre(self):
        """🚫 Un utilisateur anonyme ne peut pas supprimer un genre"""
        response = self.client.delete(self.genre_detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
