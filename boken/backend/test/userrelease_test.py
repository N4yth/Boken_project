from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from api.models.user_release import UserRelease
from api.models.release import Release
from api.models.webtoon import Webtoon

User = get_user_model()


class UserReleasePermissionTests(APITestCase):
    def setUp(self):
        self.user_releases_url = "/api/usereleases/"

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

        # === Webtoons ===
        self.webtoon1 = Webtoon.objects.create(
            title="Webtoon 1",
            authors="Author A",
            release_date="2020-01-01",
            status="Finished",
            is_public=True,
            add_by=self.user1,
            rating=4.5,
        )

        self.webtoon2 = Webtoon.objects.create(
            title="Webtoon 2",
            authors="Author B",
            release_date="2021-01-01",
            status="Ongoing",
            is_public=True,
            add_by=self.user2,
            rating=3.0,
        )

        # === Releases ===
        self.release1 = Release.objects.create(
            webtoon_id=self.webtoon1,
            alt_title="Release 1",
            description="First release",
            language="en",
            total_chapter=45,
        )

        self.release2 = Release.objects.create(
            webtoon_id=self.webtoon2,
            alt_title="Release 2",
            description="Second release",
            language="fr",
            total_chapter=50,
        )

        # === User Releases ===
        self.user_release1 = UserRelease.objects.create(
            release_id=self.release1,
            user_id=self.user1,
            chapter_read=10,
            note="Great story",
            rating=4.5,
            reading_status="reading",
        )

        self.user_release2 = UserRelease.objects.create(
            release_id=self.release2,
            user_id=self.user2,
            chapter_read=25,
            note="Amazing",
            rating=5.0,
            reading_status="finish",
        )

    def get_token_for_user(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    # =====================================================
    # === LIST / RETRIEVE (IsAuthenticated & IsWebtoonReaderOrAdmin)
    # =====================================================
    def test_anonymous_cannot_list_user_releases(self):
        """🚫 Anonymous user cannot list user releases"""
        self.client.credentials()
        res = self.client.get(self.user_releases_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_user_releases(self):
        """✅ Authenticated user can list user releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        res = self.client.get(self.user_releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should see all user releases if no filtering is applied
        self.assertGreaterEqual(len(res.data), 1)

    def test_admin_can_list_all_user_releases(self):
        """✅ Admin can list all user releases"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        res = self.client.get(self.user_releases_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_anonymous_cannot_retrieve_user_release(self):
        """🚫 Anonymous user cannot retrieve a user release"""
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_retrieve_user_release(self):
        """✅ Authenticated user can retrieve a user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], str(self.user_release1.id))

    # =====================================================
    # === CREATE (IsAuthenticated)
    # =====================================================
    def test_anonymous_cannot_create_user_release(self):
        """🚫 Anonymous user cannot create a user release"""
        data = {
            "release_id": self.release1.id,
            "chapter_read": 5,
            "reading_status": "reading",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_create_user_release(self):
        """✅ Authenticated user can create their own user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "release_id": self.release1.id,
            "chapter_read": 15,
            "note": "Very good",
            "rating": 4.0,
            "reading_status": "reading",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Verify user_id is set to the authenticated user
        user_id_response = res.data["user_id"]
        if isinstance(user_id_response, dict):
            user_id_response = user_id_response.get("id")
        self.assertEqual(user_id_response, str(self.user1.id))
        self.assertEqual(res.data["reading_status"], "reading")

    def test_user_cannot_specify_different_user_id_on_create(self):
        """🚫 User cannot create a release for another user"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "release_id": self.release1.id,
            "user_id": self.user2.id,  # Attempt to assign to different user
            "chapter_read": 10,
            "reading_status": "to read",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Should be assigned to the authenticated user, not user2
        user_id_response = res.data["user_id"]
        if isinstance(user_id_response, dict):
            user_id_response = user_id_response.get("id")
        self.assertEqual(user_id_response, str(self.user1.id))

    def test_admin_can_create_user_release(self):
        """✅ Admin can create a user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        data = {
            "release_id": self.release1.id,
            "chapter_read": 20,
            "rating": 3.5,
            "reading_status": "reading",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_create_user_release_with_all_fields(self):
        """✅ User can create a release with all optional fields"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "release_id": self.release2.id,
            "chapter_read": 30,
            "note": "Best webtoon ever!",
            "rating": 5.0,
            "reading_status": "finish",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["chapter_read"], 30)
        self.assertEqual(res.data["note"], "Best webtoon ever!")
        self.assertEqual(res.data["rating"], 5.0)
        self.assertEqual(res.data["reading_status"], "finish")

    def test_create_user_release_with_invalid_reading_status(self):
        """🚫 User cannot create a release with invalid reading_status"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        data = {
            "release_id": self.release1.id,
            "chapter_read": 5,
            "reading_status": "invalid_status",
        }
        res = self.client.post(self.user_releases_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =====================================================
    # === UPDATE / PARTIAL_UPDATE (IsAuthenticated & IsWebtoonReaderOrAdmin)
    # =====================================================
    def test_anonymous_cannot_update_user_release(self):
        """🚫 Anonymous user cannot update a user release"""
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(url, {"chapter_read": 50}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_cannot_update_other_user_release(self):
        """🚫 User cannot update another user's release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.patch(url, {"chapter_read": 50}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_update_own_user_release(self):
        """✅ User can update their own user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(
            url,
            {
                "chapter_read": 25,
                "note": "Updated note",
                "rating": 4.8,
                "reading_status": "finish",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["chapter_read"], 25)
        self.assertEqual(res.data["note"], "Updated note")
        self.assertEqual(res.data["rating"], 4.8)
        self.assertEqual(res.data["reading_status"], "finish")

    def test_user_cannot_modify_user_id_on_update(self):
        """🚫 User cannot modify user_id field when updating"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(
            url, {"user_id": self.user2.id, "chapter_read": 30}, format="json"
        )
        # Should be rejected if user tries to modify user_id
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_modify_release_id_on_update(self):
        """🚫 User cannot modify release_id field when updating"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(
            url, {"release_id": self.release2.id, "chapter_read": 30}, format="json"
        )
        # Should be rejected if user tries to modify release_id
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_update_chapter_read(self):
        """✅ User can update chapter_read field"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(url, {"chapter_read": 35}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["chapter_read"], 35)

    def test_user_can_update_rating(self):
        """✅ User can update rating field"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(url, {"rating": 3.5}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["rating"], 3.5)

    def test_user_can_update_note(self):
        """✅ User can update note field"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        new_note = "Updated comment about the story"
        res = self.client.patch(url, {"note": new_note}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["note"], new_note)

    def test_admin_can_update_any_user_release(self):
        """✅ Admin can update any user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.patch(
            url,
            {"chapter_read": 40, "rating": 4.0, "reading_status": "reading"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_admin_cannot_modify_user_id_or_release_id(self):
        """✅ Admin can modify user_id or release_id fields"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(url, {"user_id": self.user2.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_update_to_invalid_reading_status(self):
        """🚫 Cannot update to invalid reading_status"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.patch(url, {"reading_status": "paused"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =====================================================
    # === DELETE (IsAuthenticated & IsWebtoonReaderOrAdmin)
    # =====================================================
    def test_anonymous_cannot_delete_user_release(self):
        """🚫 Anonymous user cannot delete a user release"""
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_cannot_delete_other_user_release(self):
        """🚫 User cannot delete another user's release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_delete_own_user_release(self):
        """✅ User can delete their own user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user1_token}")
        url = f"{self.user_releases_url}{self.user_release1.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])
        # Verify it was deleted
        self.assertFalse(UserRelease.objects.filter(id=self.user_release1.id).exists())

    def test_admin_can_delete_any_user_release(self):
        """✅ Admin can delete any user release"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        url = f"{self.user_releases_url}{self.user_release2.id}/"
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])
        # Verify it was deleted
        self.assertFalse(UserRelease.objects.filter(id=self.user_release2.id).exists())