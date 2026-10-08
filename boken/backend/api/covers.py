"""
Webtoon covers.

Images are stored as files (MEDIA_ROOT/covers/), the database only keeps their path.
Every image, uploaded or downloaded from AniList, is normalised before being saved:
- resized to fit in COVER_SIZE (2:3 cover ratio), never upscaled
- converted to WebP (much lighter than JPEG/PNG for the same quality), metadata removed
- first frame only for animated images
A cover is usually 20-50 KB.
"""
import io
import uuid
import warnings

import requests
from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, ImageOps, UnidentifiedImageError

COVER_SIZE = (400, 600)
WEBP_QUALITY = 80
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 40_000_000  # refuses "decompression bombs" (tiny files with huge dimensions)
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}


class InvalidCover(ValueError):
    pass


def make_cover(data):
    """Validate an image (bytes) and return the optimised WebP bytes."""
    if len(data) > MAX_UPLOAD_BYTES:
        raise InvalidCover(f"Image too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB).")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as probe:
                if probe.format not in ALLOWED_FORMATS:
                    raise InvalidCover("Unsupported format, use JPEG, PNG, WebP or GIF.")
                if probe.width * probe.height > MAX_PIXELS:
                    raise InvalidCover("Image dimensions are too large.")
                probe.verify()
            image = Image.open(io.BytesIO(data))
            image.load()
    except InvalidCover:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning, OSError, SyntaxError):
        raise InvalidCover("The file is not a valid image.")

    image = ImageOps.exif_transpose(image)  # photos taken sideways
    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    image = image.convert("RGBA" if has_alpha else "RGB")
    image.thumbnail(COVER_SIZE, Image.Resampling.LANCZOS)

    output = io.BytesIO()
    image.save(output, "WEBP", quality=WEBP_QUALITY, method=6)
    return output.getvalue()


def set_cover(webtoon, data):
    """Optimise `data` and store it as the webtoon cover, replacing (and deleting) the previous file."""
    content = make_cover(data)
    old_name = webtoon.cover.name if webtoon.cover else None
    # a new name on every change so browsers and CDNs never show a cached old cover
    webtoon.cover.save(f"{uuid.uuid4().hex}.webp", ContentFile(content), save=False)
    webtoon.save(update_fields=["cover"])
    if old_name:
        delete_file_after_commit(webtoon.cover.storage, old_name)


def remove_cover(webtoon):
    if webtoon.cover:
        storage, name = webtoon.cover.storage, webtoon.cover.name
        webtoon.cover = None
        webtoon.save(update_fields=["cover"])
        delete_file_after_commit(storage, name)


def delete_file_after_commit(storage, name):
    # if the transaction is rolled back, the database still points to the file: keep it
    transaction.on_commit(lambda: storage.delete(name))


def download_image(url, timeout=15):
    """Download an image from a URL (AniList), None if it fails or is too large."""
    if not url or not url.startswith(("https://", "http://")):
        return None
    try:
        with requests.get(url, timeout=timeout, stream=True) as response:
            if response.status_code != 200 or not response.headers.get("Content-Type", "").startswith("image/"):
                return None
            data = b""
            for chunk in response.iter_content(64 * 1024):
                data += chunk
                if len(data) > MAX_UPLOAD_BYTES:
                    return None
            return data
    except requests.RequestException:
        return None
