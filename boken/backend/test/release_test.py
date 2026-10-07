from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from api.models.release import Release
from api.models.webtoon import Webtoon

User = get_user_model()


class ReleasePermissionTests(APITestCase):
    def setUp(self):
        self.releases_url = "/api/releases/"

        # === Création utilisateurs ===
        self.user = User.objects.create_user(
            email="user@test.com", username="user", password="1234"
        )
        self.admin = User.objects.create_admin(
            email="admin@test.com", username="admin", password="admin1234"
        )

        # Tokens JWT
        self.user_token = self.get_token_for_user(self.user)
        self.admin_token = self.get_token_for_user(self.admin)

        # === Webtoons ===
        self.public_webtoon = Webtoon.objects.create(
            title="Public Toon",
            release_date="2020-01-01",
            status="Finished",
            is_public=True,
            add_by=self.user,
            rating=4.5,
        )

        self.private_webtoon = Webtoon.objects.create(
            title="Private Toon",
            release_date="2021-01-01",
            status="Ongoing",
            is_public=False,
            add_by=self.admin,
            rating=3.0,
        )

        # === Releases ===
        self.public_release = Release.objects.create(
            webtoon_id=self.public_webtoon,
            alt_title="Public Toon v2",
            description="Good to watch",
            language="en",
            total_chapter=45,
        )

        self.private_release = Release.objects.create(
            webtoon_id=self.private_webtoon,
            alt_title="Private Toon v2",
            description="Hidden gem",
            language="en",
            total_chapter=40,
        )

    def get_token_for_user(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    # =====================================================
    # === LIST / RETRIEVE (WebtoonIsPublic) ===============
    # =====================================================
    def test_anonymous_can_list_only_public_releases(self):
        """🚫 Un utilisateur anonyme ne voit que les releases des webtoons publics"""
        self.client.credentials()
        res = self.client.get(self.releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["alt_title"], "Public Toon v2")

    def test_authenticated_user_can_list_only_public_releases(self):
        """✅ Un user connecté voit seulement les webtoons publics"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        res = self.client.get(self.releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["alt_title"], "Public Toon v2")

    def test_admin_can_list_all_releases(self):
        """✅ Un admin voit toutes les releases (publiques + privées)"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        res = self.client.get(self.releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [r["alt_title"] for r in res.data]
        self.assertIn("Public Toon v2", titles)
        self.assertIn("Private Toon v2", titles)

    def test_anonymous_can_retrieve_only_public_release(self):
        """🚫 Un anonyme ne peut consulter qu’une release de webtoon public"""
        url_public = f"{self.releases_url}{self.public_release.id}/"
        url_private = f"{self.releases_url}{self.private_release.id}/"

        res_public = self.client.get(url_public)
        res_private = self.client.get(url_private)

        self.assertEqual(res_public.status_code, status.HTTP_200_OK)
        self.assertEqual(res_private.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_retrieve_private_release(self):
        """✅ Un admin peut consulter toutes les releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url_private = f"{self.releases_url}{self.private_release.id}/"
        res = self.client.get(url_private)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # =====================================================
    # === CREATE / UPDATE / DELETE (IsWebtoonCreatorOrAdmin)
    # =====================================================
    def test_anonymous_cannot_create_release(self):
        """🚫 Anonyme ne peut pas créer de release"""
        data = {
            "webtoon_id": self.public_webtoon.id,
            "alt_title": "Anon Toon",
            "description": "Unauthorized",
            "language": "en",
            "total_chapters": 10,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_can_create_release_for_own_webtoon(self):
        """✅ User peut créer une release pour un webtoon qu’il a créé"""
        # Simulons que le user est "créateur" de ce webtoon (à adapter selon ton modèle)#######################

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        data = {
            "webtoon_id": self.public_webtoon.id,
            "alt_title": "User Toon FR",
            "description": "New French version",
            "language": "fr",
            "total_chapters": 12,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_create_release_for_other_webtoon(self):
        """🚫 User ne peut pas créer une release sur un webtoon qu’il n’a pas créé"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        data = {
            "webtoon_id": self.private_webtoon.id,
            "alt_title": "Hack Release",
            "description": "Attempt to modify",
            "language": "ja",
            "total_chapters": 3,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_release_for_any_webtoon(self):
        """✅ Admin peut créer une release pour n’importe quel webtoon"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        data = {
            "webtoon_id": self.private_webtoon.id,
            "alt_title": "Admin Release",
            "description": "Admin edition",
            "language": "ko",
            "total_chapters": 20,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_update_release_if_not_creator(self):
        """🚫 User ne peut pas modifier une release s’il n’est pas créateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.releases_url}{self.private_release.id}/"
        res = self.client.patch(url, {"alt_title": "Hacked"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_update_any_release(self):
        """✅ Admin peut modifier n’importe quelle release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.releases_url}{self.private_release.id}/"
        res = self.client.patch(url, {"alt_title": "Private Toon Admin Edit"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_cannot_delete_release(self):
        """🚫 User ne peut pas supprimer une release qu’il n’a pas créée"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        url = f"{self.releases_url}{self.private_release.id}/"
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_delete_any_release(self):
        """✅ Admin peut supprimer toutes les releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.releases_url}{self.private_release.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])
