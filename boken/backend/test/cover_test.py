import io
import shutil
import tempfile
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from api import covers
from api.external_api import save_webtoon
from api.models.webtoon import Webtoon

User = get_user_model()
TEMP_MEDIA = tempfile.mkdtemp(prefix="boken-test-media-")


def image_bytes(size=(1200, 1800), fmt="JPEG", mode="RGB", color=(200, 30, 30)):
    image = Image.new(mode, size, color)
    output = io.BytesIO()
    image.save(output, fmt)
    return output.getvalue()


def upload(data, name="cover.jpg", content_type="image/jpeg"):
    return SimpleUploadedFile(name, data, content_type=content_type)


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class CoverTestCase(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="adminpass123")
        self.creator = User.objects.create_user(email="c@test.com", username="creator", password="securepass123")
        self.other = User.objects.create_user(email="o@test.com", username="other", password="securepass123")
        self.webtoon = Webtoon.objects.create(title="Draft", release_date=date(2020, 1, 1), status="finish",
                                              add_by=self.creator)
        self.url = f"/api/webtoon/{self.webtoon.id}/cover/"

    def post_cover(self, user, data, **kwargs):
        self.client.force_authenticate(user=user)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(self.url, {"cover": upload(data, **kwargs)}, format="multipart")

    def stored_file(self):
        self.webtoon.refresh_from_db()
        return Path(self.webtoon.cover.path)


class CoverOptimisationTests(CoverTestCase):
    def test_big_photo_is_resized_and_converted_to_webp(self):
        original = image_bytes((2400, 3600))
        res = self.post_cover(self.creator, original)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        path = self.stored_file()
        self.assertEqual(path.suffix, ".webp")
        self.assertEqual(path.parent.name, "covers")
        with Image.open(path) as stored:
            self.assertEqual(stored.format, "WEBP")
            self.assertEqual(stored.size, (400, 600))
        self.assertLess(path.stat().st_size, 40 * 1024)
        self.assertTrue(res.data["cover"].startswith("http://testserver/media/covers/"))

    def test_small_image_is_not_upscaled_and_ratio_is_kept(self):
        self.post_cover(self.creator, image_bytes((200, 100), "PNG"), name="c.png", content_type="image/png")
        with Image.open(self.stored_file()) as stored:
            self.assertEqual(stored.size, (200, 100))

    def test_transparent_png_keeps_transparency(self):
        data = image_bytes((300, 450), "PNG", mode="RGBA", color=(0, 0, 0, 0))
        self.post_cover(self.creator, data, name="c.png", content_type="image/png")
        with Image.open(self.stored_file()) as stored:
            self.assertEqual(stored.mode, "RGBA")

    def test_metadata_is_removed(self):
        image = Image.new("RGB", (300, 450))
        exif = image.getexif()
        exif[0x010F] = "Secret camera"
        output = io.BytesIO()
        image.save(output, "JPEG", exif=exif)
        self.post_cover(self.creator, output.getvalue())
        with Image.open(self.stored_file()) as stored:
            self.assertNotIn(0x010F, stored.getexif())


class CoverValidationTests(CoverTestCase):
    def test_not_an_image(self):
        res = self.post_cover(self.creator, b"%PDF-1.4 not an image", name="c.jpg")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.webtoon.refresh_from_db()
        self.assertFalse(self.webtoon.cover)

    def test_unsupported_format(self):
        res = self.post_cover(self.creator, image_bytes((100, 100), "BMP"), name="c.bmp", content_type="image/bmp")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_file_too_large(self):
        res = self.post_cover(self.creator, b"0" * (covers.MAX_UPLOAD_BYTES + 1))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_huge_dimensions_are_refused(self):
        with patch.object(covers, "MAX_PIXELS", 100 * 100):
            res = self.post_cover(self.creator, image_bytes((200, 200)))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_file(self):
        self.client.force_authenticate(user=self.creator)
        res = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class CoverFileLifecycleTests(CoverTestCase):
    def test_replacing_deletes_the_old_file(self):
        self.post_cover(self.creator, image_bytes())
        first = self.stored_file()
        self.post_cover(self.creator, image_bytes(color=(0, 0, 255)))
        second = self.stored_file()
        self.assertNotEqual(first, second)
        self.assertFalse(first.exists())
        self.assertTrue(second.exists())

    def test_delete_cover(self):
        self.post_cover(self.creator, image_bytes())
        path = self.stored_file()
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.delete(self.url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.webtoon.refresh_from_db()
        self.assertFalse(self.webtoon.cover)
        self.assertFalse(path.exists())

    def test_deleting_the_webtoon_deletes_the_file(self):
        self.post_cover(self.creator, image_bytes())
        path = self.stored_file()
        with self.captureOnCommitCallbacks(execute=True):
            self.webtoon.delete()
        self.assertFalse(path.exists())

    def test_cover_in_lists_and_search(self):
        self.webtoon.is_public = True
        self.webtoon.save()
        self.client.force_authenticate(user=self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url, {"cover": upload(image_bytes())}, format="multipart")
        self.client.force_authenticate(user=None)
        listed = self.client.get("/api/webtoon/").data[0]["cover"]
        found = self.client.get("/api/webtoon/search/?title=draft").data[0]["cover"]
        self.assertEqual(listed, found)
        self.assertTrue(listed.endswith(".webp"))

    def test_no_cover_is_null(self):
        self.client.force_authenticate(user=self.creator)
        self.assertIsNone(self.client.get(f"/api/webtoon/{self.webtoon.id}/").data["cover"])


class CoverPermissionTests(CoverTestCase):
    def test_anonymous(self):
        res = self.client.post(self.url, {"cover": upload(image_bytes())}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_other_user_cannot_change_it(self):
        self.webtoon.is_public = True
        self.webtoon.save()
        self.assertEqual(self.post_cover(self.other, image_bytes()).status_code, status.HTTP_403_FORBIDDEN)

    def test_creator_of_a_public_webtoon_goes_through_an_admin(self):
        self.webtoon.is_public = True
        self.webtoon.save()
        self.assertEqual(self.post_cover(self.creator, image_bytes()).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.post_cover(self.admin, image_bytes()).status_code, status.HTTP_200_OK)


class AnilistCoverTests(CoverTestCase):
    ENTRY = {
        "title": {"english": "Tower of God", "romaji": "Kami no Tou", "native": "신의 탑"},
        "description": "d", "startDate": {"year": 2010}, "status": "RELEASING", "genres": [],
        "format": "MANGA", "countryOfOrigin": "KR", "chapters": None, "staff": {"edges": []},
        "coverImage": {"extraLarge": "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/tog-xl.jpg",
                       "large": "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/tog.jpg"},
    }

    def anilist_response(self, data, content_type="image/jpeg", code=200):
        response = MagicMock(status_code=code, headers={"Content-Type": content_type})
        response.iter_content.return_value = [data]
        response.__enter__.return_value = response
        return response

    def test_import_downloads_and_optimises_the_cover(self):
        with patch("api.covers.requests.get", return_value=self.anilist_response(image_bytes((460, 650)))) as get:
            save_webtoon(self.ENTRY)
        self.assertEqual(get.call_args.args[0], self.ENTRY["coverImage"]["extraLarge"])
        webtoon = Webtoon.objects.get(title="Tower of God")
        with Image.open(webtoon.cover.path) as stored:
            self.assertEqual((stored.format, stored.size), ("WEBP", (400, 565)))

    def test_reimport_does_not_download_again(self):
        with patch("api.covers.requests.get", return_value=self.anilist_response(image_bytes())):
            save_webtoon(self.ENTRY)
        with patch("api.covers.requests.get") as get:
            save_webtoon(self.ENTRY)
        get.assert_not_called()

    def test_failing_download_does_not_stop_the_import(self):
        for response in (self.anilist_response(b"", code=404), self.anilist_response(b"<html>", "text/html"),
                         self.anilist_response(b"broken", "image/jpeg")):
            Webtoon.objects.all().delete()
            with patch("api.covers.requests.get", return_value=response):
                save_webtoon(self.ENTRY)
            webtoon = Webtoon.objects.get(title="Tower of God")
            self.assertFalse(webtoon.cover)
