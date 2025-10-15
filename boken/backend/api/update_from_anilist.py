import requests
import time
from datetime import date

from django.db import transaction
from api.models.webtoon import Webtoon
from api.models.genre import Genre
from api.models.release import Release

ANILIST_URL = "https://graphql.anilist.co"

# -------------------------------
# Requête GraphQL AniList
# -------------------------------
def fetch_page(page, per_page=50):
    query = '''
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage currentPage }
        media(type: MANGA) {
          id
          title { romaji english }
          description(asHtml: false)
          startDate { year }
          status
          genres
          format
          countryOfOrigin
          staff { edges { node { name { full } } } }
          coverImage { large }
        }
      }
    }
    '''
    variables = {"page": page, "perPage": per_page}
    response = requests.post(ANILIST_URL, json={"query": query, "variables": variables})
    
    if response.status_code != 200:
        print(f"⚠️ Erreur AniList ({response.status_code}), retry dans 5s…")
        time.sleep(5)
        return fetch_page(page, per_page)
    
    return response.json()["data"]["Page"]


# -------------------------------
# Filtre manhwa / manhua / webtoon
# -------------------------------
def is_webtoon(entry):
    origin = entry.get("countryOfOrigin", "")
    fmt = entry.get("format", "")
    genres = entry.get("genres", [])

    if 'Hentai' in genres:
        return False
    if fmt == "NOVEL":
        return False
    if origin == "JP":
        return False
    if origin in ["KR", "CN"]:
        return True
    if "Webtoon" in genres or "Full Color" in genres:
        return True
    return False


# -------------------------------
# Conversion statut AniList → modèle Django
# -------------------------------
def map_status(status_str):
    mapping = {
        "FINISHED": "finish",
        "RELEASING": "in progress",
        "HIATUS": "pause",
        "CANCELLED": "pause"
    }
    return mapping.get(status_str, "in progress")


# -------------------------------
# Sauvegarde Webtoon + Release + Genres
# -------------------------------
@transaction.atomic
def save_webtoon(entry):
    title = entry["title"].get("english") or entry["title"].get("romaji") or "Unknown"
    authors = ", ".join([s["node"]["name"]["full"] for s in entry.get("staff", {}).get("edges", [])]) or "Unknown"
    release_year = entry.get("startDate", {}).get("year") or 2000
    status = map_status(entry.get("status"))
    genres = entry.get("genres", [])
    description = entry.get("description") or "No description available."

    webtoon, created = Webtoon.objects.update_or_create(
        title=title,
        defaults={
            "authors": authors,
            "release_date": date(release_year, 1, 1),
            "status": status,
            "is_public": True,
            "rating": 0.0,
            "waiting_review": False,
            "add_by": None,
        }
    )

    genre_objs = []
    for g in genres:
        genre_obj, _ = Genre.objects.get_or_create(name=g)
        genre_objs.append(genre_obj)
    webtoon.genres.set(genre_objs)

    Release.objects.get_or_create(
        alt_title=title,
        webtoon_id=webtoon,
        defaults={
            "description": description[:1000],
            "language": "kor" if entry.get("countryOfOrigin") == "KR" else "chn",
            "total_chapter": 0,
        }
    )

    print(f"✅ {'Créé' if created else 'Déjà présent'} : {title}")
    return created


# -------------------------------
# Routine principale (max 100)
# -------------------------------
def update_all_from_anilist(max_count=100):
    page = 1
    has_next = True
    created_count = 0

    print(f"🚀 Début de la mise à jour (max {max_count} webtoons)")

    while has_next and created_count < max_count:
        data = fetch_page(page)
        medias = data["media"]
        has_next = data["pageInfo"]["hasNextPage"]

        for entry in medias:
            if is_webtoon(entry):
                created = save_webtoon(entry)
                if created:
                    created_count += 1
                    if created_count >= max_count:
                        print(f"🛑 Limite atteinte ({max_count} webtoons)")
                        return

        page += 1
        time.sleep(0.5)

    print(f"✅ Mise à jour terminée ({created_count} webtoons ajoutés)")
