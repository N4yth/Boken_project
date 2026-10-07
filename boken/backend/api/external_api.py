import requests
import time
from datetime import date
from api.models.webtoon import Webtoon
from api.models.release import Release
from api.models.genre import Genre
from api.models.author import Author
from django.db import transaction

ANILIST_URL = "https://graphql.anilist.co"

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
          coverImage { large }
        }
      }
    }
    '''
    variables = {"page": page, "perPage": per_page}
    response = requests.post(ANILIST_URL, json={"query": query, "variables": variables})
    
    if response.status_code != 200:
        print(f"Error AniList ({response.status_code}{response.text}), retry in 60s…")
        time.sleep(60)
        print(f"Request restart")
        return fetch_page(page, per_page)
    
    return response.json()["data"]["Page"]

def map_status(status_str):
    mapping = {
        "FINISHED": "finish",
        "RELEASING": "in progress",
        "HIATUS": "pause",
        "CANCELLED": "cancel"
    }
    return mapping.get(status_str, "in progress")

@transaction.atomic
def save_webtoon(entry, added_by=None):
    title = entry["title"].get("english") or entry["title"].get("romaji") or "Unknown"
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
            "rating": 0.0,
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