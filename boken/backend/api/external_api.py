import requests
import time
from datetime import date
from api.models.webtoon import Webtoon
from api.models.release import Release
from api.models.genre import Genre
from api.models.author import Author
from django.db import transaction
from api.covers import InvalidCover, download_image, set_cover

ANILIST_URL = "https://graphql.anilist.co"
MAX_ATTEMPTS = 3
RETRY_DELAY = 60  # seconds, AniList rate limit is per minute

# AniList countryOfOrigin -> Release.language (ISO 639-1)
ORIGIN_LANGUAGE = {
    "KR": "ko",
    "CN": "zh",
    "TW": "zh",
    "JP": "ja",
}

# staff roles that count as authors (others are translators, editors, ...)
AUTHOR_ROLES = ("story", "art", "original creator")

def fetch_page(page, per_page=50):
    query = '''
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage currentPage }
        media(
          type: MANGA
          isAdult: false
          format_not: NOVEL
        ) {
          id
          title { romaji english native }
          description(asHtml: false)
          startDate { year }
          status
          genres
          format
          countryOfOrigin
          chapters
          staff { edges { role node { name { full } } } }
          coverImage { extraLarge large }
        }
      }
    }
    '''
    variables = {"page": page, "perPage": per_page}
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = requests.post(ANILIST_URL, json={"query": query, "variables": variables}, timeout=30)
        except requests.RequestException as e:
            error = str(e)
        else:
            if response.status_code == 200:
                return response.json()["data"]["Page"]
            error = f"{response.status_code} {response.text[:200]}"
        print(f"Error AniList ({error}), attempt {attempt}/{MAX_ATTEMPTS}")
        if attempt < MAX_ATTEMPTS:
            time.sleep(RETRY_DELAY)
    # stops the import (its status becomes "error") instead of retrying forever
    raise RuntimeError(f"AniList unreachable after {MAX_ATTEMPTS} attempts: {error}")

def map_status(status_str):
    mapping = {
        "FINISHED": "finish",
        "RELEASING": "in progress",
        "HIATUS": "pause",
        "CANCELLED": "cancel"
    }
    return mapping.get(status_str, "in progress")

def save_webtoon(entry, added_by=None):
    title = entry["title"].get("english") or entry["title"].get("romaji") or "Unknown"
    # covers are downloaded once: a re-import keeps the existing file
    existing = Webtoon.objects.filter(title=title).first()
    cover = None
    if not (existing and existing.cover):
        # extraLarge (~460px wide) is resized to 400x600, large (~230px) is the fallback
        images = entry.get("coverImage") or {}
        cover = download_image(images.get("extraLarge") or images.get("large"))
    with transaction.atomic():
        return _save_webtoon(entry, title, cover, added_by)


def _save_webtoon(entry, title, cover, added_by):
    authors = get_authors(entry) or ["Unknown"]
    release_year = entry.get("startDate", {}).get("year") or 2000
    status = map_status(entry.get("status"))
    genres = entry.get("genres", [])
    description = entry.get("description") or "No description available."

    webtoon, created = Webtoon.objects.update_or_create(
        title=title,
        defaults={
            "release_date": date(release_year, 1, 1),
            "status": status,
            "is_public": True,
            "waiting_review": False,
            "add_by": added_by,
        }
    )

    genre_objs = []
    for g in genres:
        genre_obj, _ = Genre.objects.get_or_create(name=g)
        genre_objs.append(genre_obj)
    webtoon.genres.set(genre_objs)
    webtoon.authors.set(Author.from_names(authors))

    # AniList only knows the original release: chapters is null while it is still releasing
    Release.objects.update_or_create(
        webtoon_id=webtoon,
        language=ORIGIN_LANGUAGE.get(entry.get("countryOfOrigin"), "ko"),
        defaults={
            "alt_title": entry["title"].get("native") or title,
            "description": description[:1000],
            "total_chapter": entry.get("chapters") or 0,
        }
    )

    if cover:
        try:
            set_cover(webtoon, cover)
        except InvalidCover:
            pass  # a broken image must not stop the import
    return created

def get_authors(entry):
    names = []
    for edge in (entry.get("staff") or {}).get("edges", []):
        role = (edge.get("role") or "").lower()
        if any(r in role for r in AUTHOR_ROLES):
            names.append(edge["node"]["name"]["full"])
    return names

def is_webtoon(entry):
    origin = entry.get("countryOfOrigin", "")
    fmt = entry.get("format", "")
    genres = entry.get("genres", [])

    if fmt == "NOVEL":
        return False
    if origin == "JP":
        return False
    if origin in ["KR", "CN"]:
        return True
    if "Webtoon" in genres or "Full Color" in genres:
        return True
    return False