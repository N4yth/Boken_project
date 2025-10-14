from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from api.models.webtoon import Webtoon
from api.models.genre import Genre

User = get_user_model()


class WebtoonPermissionTests(APITestCase):
    def setUp(self):
        # URLs
        self.webtoons_url = "/api/webtoons/"

        # Création d’un utilisateur simple
        self.user = User.objects.create_user(
            email="user@test.com", username="user", password="1234"
        )

        # Création d’un admin (corrigé : create_superuser)
        self.admin = User.objects.create_admin(
            email="admin@test.com", username="admin", password="admin1234"
        )

        # JWT tokens
        self.user_token = self.get_token_for_user(self.user)
        self.admin_token = self.get_token_for_user(self.admin)

        # Création de quelques genres
        self.genre_action = Genre.objects.create(name="Action")
        self.genre_romance = Genre.objects.create(name="Romance")

        # Création d’un webtoon par user
        self.webtoon_user = Webtoon.objects.create(
            title="User Webtoon",
            authors="User Author",
            release_date="2023-01-01",
            status="Ongoing",
            is_public=True,
            rating=4.5,
            add_by=self.user,
            waiting_review=False
        )
        self.webtoon_user.genres.set([self.genre_action, self.genre_romance])  # ✅ assignation ManyToMany correcte

        # Création d’un webtoon par admin
        self.webtoon_admin = Webtoon.objects.create(
            title="Admin Webtoon",
            authors="Admin Author",
            release_date="2022-05-10",
            status="Finished",
            is_public=True,
            rating=5.0,
            add_by=self.admin,
            waiting_review=False
        )
        self.webtoon_admin.genres.set([self.genre_action])  # ✅ idem ici

    def get_token_for_user(self, user):
        """Retourne un JWT valide pour un utilisateur donné"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    # === TESTS GET ===
    def test_list_webtoons(self):
        """✅ Tout le monde peut lister les webtoons"""
        response = self.client.get(self.webtoons_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_user_can_retrieve_own_webtoon(self):
        """✅ Un user peut voir son webtoon"""
        url = f"{self.webtoons_url}{self.webtoon_user.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "User Webtoon")

    def test_user_can_retrieve_others_webtoon(self):
        """✅ Un user peut voir le webtoon d’un autre utilisateur (si public)"""
        url = f"{self.webtoons_url}{self.webtoon_admin.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # === TESTS POST ===
    def test_user_can_create_webtoon(self):
        """✅ Un user peut créer un webtoon"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        data = {
            "title": "New User Webtoon",
            "authors": "User Author",
            "genres": [str(self.genre_action.id), str(self.genre_romance.id)],
            "release_date": "2025-01-01",
            "status": "finish",
            "waiting_review": False,
            "rating": 3.0,
        }
        response = self.client.post(self.webtoons_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["add_by"]["id"], str(self.user.id))

    def test_admin_can_create_webtoon(self):
        """✅ Un admin peut créer un webtoon"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        data = {
            "title": "New Admin Webtoon",
            "authors": "Admin Author",
            "genres": [str(self.genre_action.id)],
            "release_date": "2025-01-01",
            "status": "in progress",
            "waiting_review": False,
            "rating": 4.0,
        }
        response = self.client.post(self.webtoons_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # === TESTS PUT/PATCH ===
    def test_user_can_update_own_webtoon(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.webtoons_url}{self.webtoon_user.id}/"
        data = {"title": "User Webtoon Updated"}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "User Webtoon Updated")

    def test_user_cannot_update_others_webtoon(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.webtoons_url}{self.webtoon_admin.id}/"
        data = {"title": "Hacked"}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_any_webtoon(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.webtoons_url}{self.webtoon_user.id}/"
        data = {"title": "Admin Updated User Webtoon"}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # === TESTS DELETE ===
    def test_user_can_delete_own_webtoon(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.webtoons_url}{self.webtoon_user.id}/"
        response = self.client.delete(url)
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    def test_user_cannot_delete_others_webtoon(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.webtoons_url}{self.webtoon_admin.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_any_webtoon(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.webtoons_url}{self.webtoon_user.id}/"
        response = self.client.delete(url)
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    # === TESTS PATCH ADMIN ONLY ===
    def test_admin_can_set_webtoon_to_public(self):
        """✅ Un administrateur peut rendre un webtoon public"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.webtoons_url}{self.webtoon_user.id}/set_to_public/"
        data = {'is_public': True}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_set_webtoon_to_public(self):
        """❌ Un utilisateur normal ne peut pas modifier le champ is_public"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.webtoons_url}{self.webtoon_user.id}/set_to_public/"
        data = {'is_public': True}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_webtoon_has_genres(self):
        """✅ Le webtoon doit être lié à plusieurs genres"""
        genres = self.webtoon_user.genres.all()
        self.assertEqual(genres.count(), 2)
        self.assertIn(self.genre_action, genres)
        self.assertIn(self.genre_romance, genres)

    def test_genre_reverse_relation(self):
        """✅ Le genre doit retrouver les webtoons liés via related_name"""
        webtoons_action = self.genre_action.webtoon.all()  # ✅ corrected related_name
        self.assertIn(self.webtoon_user, webtoons_action)

    def test_webtoon_has_correct_creator(self):
        """✅ Le champ add_by doit référencer le bon utilisateur"""
        self.assertEqual(self.webtoon_user.add_by, self.user)
        self.assertEqual(self.webtoon_user.add_by.email, "user@test.com")

    def test_user_delete_sets_add_by_to_null(self):
        """✅ Si le user est supprimé, le champ add_by devient NULL (SET_NULL)"""
        self.user.delete()
        self.webtoon_user.refresh_from_db()
        self.assertIsNone(self.webtoon_user.add_by)
