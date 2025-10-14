from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from api.models.genre import Genre
from api.models.release import Release
from api.models.user_release import UserRelease
from api.models.webtoon import Webtoon

User = get_user_model()


class GlobalAPITests(APITestCase):
    """Comprehensive test suite for all API endpoints and permissions"""

    def setUp(self):
        """Set up test data for all models"""
        # URLs
        self.genres_url = "/api/genres/"
        self.webtoons_url = "/api/webtoons/"
        self.releases_url = "/api/releases/"
        self.user_releases_url = "/api/usereleases/"
        self.users_url = "/api/users/"

        # === Create Users ===
        self.user1 = User.objects.create_user(
            email="user1@test.com", username="user1", password="1234"
        )
        self.user2 = User.objects.create_user(
            email="user2@test.com", username="user2", password="1234"
        )
        self.admin = User.objects.create_admin(
            email="admin@test.com", username="admin", password="admin1234"
        )

        # JWT Tokens
        self.user1_token = self.get_token_for_user(self.user1)
        self.user2_token = self.get_token_for_user(self.user2)
        self.admin_token = self.get_token_for_user(self.admin)

        # === Create Genres ===
        self.genre1 = Genre.objects.create(name="Action")
        self.genre2 = Genre.objects.create(name="Romance")

        # === Create Webtoons ===
        self.public_webtoon = None
        self.public_webtoon = Webtoon.objects.create(
            title="Public Webtoon",
            authors="Author A",
            release_date="2020-01-01",
            status="in progress",
            is_public=True,
            rating=4.5,
            add_by=self.user1,
            waiting_review=False,
        )
        self.public_webtoon.genres.add(self.genre1)

        self.private_webtoon = Webtoon.objects.create(
            title="Private Webtoon",
            authors="Author B",
            release_date="2021-01-01",
            status="finish",
            is_public=False,
            rating=3.0,
            add_by=self.user2,
            waiting_review=False,
        )
        self.private_webtoon.genres.add(self.genre2)

        # === Create Releases ===
        self.public_release = Release.objects.create(
            webtoon_id=self.public_webtoon,
            alt_title="Public Release EN",
            description="English version",
            language="en",
            total_chapter=45,
        )

        self.private_release = Release.objects.create(
            webtoon_id=self.private_webtoon,
            alt_title="Private Release FR",
            description="French version",
            language="fr",
            total_chapter=40,
        )

        # === Create User Releases ===
        self.user_release1 = UserRelease.objects.create(
            release_id=self.public_release,
            user_id=self.user1,
            chapter_read=10,
            note="Great story",
            rating=4.5,
            reading_status="reading",
        )

        self.user_release2 = UserRelease.objects.create(
            release_id=self.private_release,
            user_id=self.user2,
            chapter_read=25,
            note="Amazing",
            rating=5.0,
            reading_status="finish",
        )

    def get_token_for_user(self, user):
        """Generate JWT token for a user"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    # =====================================================
    # === GENRE TESTS (AllowAny for list/retrieve, IsAdminUser for CUD)
    # =====================================================
    def test_genre_anonymous_can_list(self):
        """✅ Anonymous users can list all genres"""
        res = self.client.get(self.genres_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_genre_anonymous_can_retrieve(self):
        """✅ Anonymous users can retrieve a specific genre"""
        url = f"{self.genres_url}{self.genre1.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Action")

    def test_genre_anonymous_cannot_create(self):
        """🚫 Anonymous users cannot create genres"""
        data = {"name": "Comedy"}
        res = self.client.post(self.genres_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_genre_authenticated_user_cannot_create(self):
        """🚫 Authenticated non-admin users cannot create genres"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {"name": "Comedy"}
        res = self.client.post(self.genres_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_genre_admin_can_create(self):
        """✅ Admin users can create genres"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        data = {"name": "Thriller"}
        res = self.client.post(self.genres_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "Thriller")

    def test_genre_admin_can_update(self):
        """✅ Admin users can update genres"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.genres_url}{self.genre1.id}/"
        res = self.client.patch(url, {"name": "Adventure"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_genre_admin_can_delete(self):
        """✅ Admin users can delete genres"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.genres_url}{self.genre1.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    # =====================================================
    # === WEBTOON TESTS (AllowAny for list/retrieve, IsCreatorOrAdmin for CUD)
    # =====================================================
    def test_webtoon_anonymous_can_list_only_public(self):
        """✅ Anonymous users can only list public webtoons"""
        res = self.client.get(self.webtoons_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["title"], "Public Webtoon")

    def test_webtoon_authenticated_can_list_only_public(self):
        """✅ Authenticated users can only list public webtoons"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        res = self.client.get(self.webtoons_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_webtoon_admin_can_list_all(self):
        """✅ Admin users can list all webtoons"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        res = self.client.get(self.webtoons_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_webtoon_anonymous_cannot_create(self):
        """🚫 Anonymous users cannot create webtoons"""
        data = {
            "title": "New Webtoon",
            "authors": "Author C",
            "status": "in progress",
            "genres": [self.genre1.id],
        }
        res = self.client.post(self.webtoons_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_webtoon_user_can_create(self):
        """✅ Authenticated users can create webtoons"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "title": "New Webtoon",
            "authors": "Author C",
            "status": "in progress",
            "genres": [self.genre1.id],
        }
        res = self.client.post(self.webtoons_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["add_by"]["id"], str(self.user1.id))

    def test_webtoon_user_cannot_edit_others_webtoon(self):
        """🚫 Users cannot edit other users' webtoons"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.webtoons_url}{self.private_webtoon.id}/"
        res = self.client.patch(url, {"title": "Hack"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_webtoon_creator_can_edit_own(self):
        """✅ Creators can edit their own webtoons"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.webtoons_url}{self.public_webtoon.id}/"
        res = self.client.patch(
            url, {"rating": 4.8}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_webtoon_admin_can_set_public(self):
        """✅ Admin can set webtoon to public"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.webtoons_url}{self.private_webtoon.id}/set_to_public/"
        res = self.client.patch(url, {"is_public": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_public"])

    def test_webtoon_user_cannot_set_public(self):
        """🚫 Regular users cannot set webtoon to public"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.webtoons_url}{self.private_webtoon.id}/set_to_public/"
        res = self.client.patch(url, {"is_public": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =====================================================
    # === RELEASE TESTS (AllowAny for list/retrieve, IsWebtoonCreatorOrAdmin for CUD)
    # =====================================================
    def test_release_anonymous_can_list_only_public(self):
        """✅ Anonymous users can only list releases of public webtoons"""
        res = self.client.get(self.releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["alt_title"], "Public Release EN")

    def test_release_admin_can_list_all(self):
        """✅ Admin can list all releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        res = self.client.get(self.releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_release_anonymous_cannot_create(self):
        """🚫 Anonymous users cannot create releases"""
        data = {
            "webtoon_id": self.public_webtoon.id,
            "alt_title": "Anon Release",
            "description": "Unauthorized",
            "language": "en",
            "total_chapter": 10,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_release_user_can_create_for_own_webtoon(self):
        """✅ Users can create releases for their own webtoons"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "webtoon_id": self.public_webtoon.id,
            "alt_title": "Public Release FR",
            "description": "French version",
            "language": "fr",
            "total_chapter": 45,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_release_user_cannot_create_for_others_webtoon(self):
        """🚫 Users cannot create releases for other users' webtoons"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "webtoon_id": self.private_webtoon.id,
            "alt_title": "Hack Release",
            "description": "Unauthorized",
            "language": "jp",
            "total_chapter": 20,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_release_admin_can_create_for_any_webtoon(self):
        """✅ Admin can create releases for any webtoon"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        data = {
            "webtoon_id": self.private_webtoon.id,
            "alt_title": "Admin Release JP",
            "description": "Japanese version",
            "language": "jp",
            "total_chapter": 40,
        }
        res = self.client.post(self.releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    # =====================================================
    # === USER RELEASE TESTS (IsReaderOrAdmin for list/retrieve/delete, DataAuthorization for update)
    # =====================================================
    def test_user_release_anonymous_cannot_list(self):
        """🚫 Anonymous users cannot list user releases"""
        res = self.client.get(self.user_releases_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_release_authenticated_can_list(self):
        """✅ Authenticated users can list user releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        res = self.client.get(self.user_releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_release_anonymous_cannot_create(self):
        """🚫 Anonymous users cannot create user releases"""
        data = {
            "release_id": self.public_release.id,
            "chapter_read": 5,
            "reading_status": "reading",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_release_user_can_create_own(self):
        """✅ Users can create their own user releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "release_id": self.public_release.id,
            "chapter_read": 15,
            "note": "Very good",
            "rating": 4.0,
            "reading_status": "reading",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user_id_response = res.data["user_id"]
        if isinstance(user_id_response, dict):
            user_id_response = user_id_response.get("id")
        self.assertEqual(user_id_response, str(self.user1.id))

    def test_user_release_user_cannot_create_for_others(self):
        """🚫 Users cannot create releases for other users"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "release_id": self.public_release.id,
            "user_id": self.user2.id,
            "chapter_read": 10,
            "reading_status": "to read",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user_id_response = res.data["user_id"]
        if isinstance(user_id_response, dict):
            user_id_response = user_id_response.get("id")
        self.assertEqual(user_id_response, str(self.user1.id))

    def test_user_release_user_cannot_update_others(self):
        """🚫 Users cannot update other users' releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.patch(url, {"chapter_read": 50}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_release_user_can_update_own(self):
        """✅ Users can update their own releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(
            url,
            {
                "chapter_read": 25,
                "note": "Updated",
                "rating": 4.8,
                "reading_status": "finish",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["chapter_read"], 25)

    def test_user_release_user_cannot_modify_user_id(self):
        """🚫 Users cannot modify user_id field"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(
            url, {"user_id": self.user2.id, "chapter_read": 30}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_release_user_cannot_modify_release_id(self):
        """🚫 Users cannot modify release_id field"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(
            url, {"release_id": self.private_release.id}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_release_admin_can_update_any(self):
        """✅ Admin can update any user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.patch(
            url, {"chapter_read": 40, "rating": 4.0}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_release_user_cannot_delete_others(self):
        """🚫 Users cannot delete other users' releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_release_user_can_delete_own(self):
        """✅ Users can delete their own releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    def test_user_release_admin_can_delete_any(self):
        """✅ Admin can delete any user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    # =====================================================
    # === USER TESTS (AllowAny for create, IsAuthenticated & IsSelfOrAdmin for others)
    # =====================================================
    def test_user_anonymous_can_create(self):
        """✅ Anonymous users can create user accounts"""
        data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "password": "securepass123",
        }
        res = self.client.post(self.users_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_user_anonymous_cannot_list(self):
        """🚫 Anonymous users cannot list users"""
        res = self.client.get(self.users_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_authenticated_cannot_list(self):
        """🚫 Non-admin authenticated users cannot list users"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        res = self.client.get(self.users_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_admin_can_list(self):
        """✅ Admin users can list all users"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        res = self.client.get(self.users_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 3)

    def test_user_anonymous_cannot_retrieve(self):
        """🚫 Anonymous users cannot retrieve user details"""
        url = f"{self.users_url}{self.user1.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_can_retrieve_own_details(self):
        """✅ Users can retrieve their own details"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.users_url}{self.user1.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_cannot_retrieve_others_details(self):
        """🚫 Users cannot retrieve other users' details"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.users_url}{self.user2.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_admin_can_retrieve_any_details(self):
        """✅ Admin can retrieve any user's details"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.users_url}{self.user1.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_can_update_own_details(self):
        """✅ Users can update their own details"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.users_url}{self.user1.id}/"
        res = self.client.patch(
            url, {"username": "updateduser1"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_cannot_update_others_details(self):
        """🚫 Users cannot update other users' details"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.users_url}{self.user2.id}/"
        res = self.client.patch(
            url, {"username": "hacked"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_admin_can_update_any_details(self):
        """✅ Admin can update any user's details"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.users_url}{self.user1.id}/"
        res = self.client.patch(
            url, {"username": "admin_updated_user1"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_can_delete_own_account(self):
        """✅ Users can delete their own account"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.users_url}{self.user1.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    def test_user_cannot_delete_others_account(self):
        """🚫 Users cannot delete other users' accounts"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.users_url}{self.user2.id}/"
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_admin_can_delete_any_account(self):
        """✅ Admin can delete any user account"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.users_url}{self.user2.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])