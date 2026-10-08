"""
AniList (https://anilist.co) client and import of one webtoon.

Terms (docs.anilist.co/guide/terms-of-use): free for non-commercial use, mass collection is
tolerated for purely educational projects, and the API must not be used by competing list/tracker
services. Boken is a school project: fine for now, but a public launch would need AniList's
agreement or another source. Rate limit: 90 requests/min, currently 30/min (degraded mode).

What is taken from AniList for each work:
- title (English, else romaji), native title, start date, status, genres, authors (story/art staff)
- the original release (country of origin -> language) with its chapter count when AniList has it
- one release per official translation: the "STREAMING" external links give the platform
  (WEBTOON, Tapas...), its URL and its language. Their chapter count is unknown (0).
- the cover (see api/covers.py)
Optional enrichment (api/sources): chapter count of ongoing series from MangaUpdates, localised
titles from Wikidata.
"""
import html
import re
import threading
import time
from datetime import date

import requests
from django.db import transaction

from api.covers import InvalidCover, download_image, set_cover
from api.models.author import Author
from api.models.genre import Genre
from api.models.release import Release
from api.models.webtoon import Webtoon

ANILIST_URL = "https://graphql.anilist.co"
MAX_ATTEMPTS = 3
RETRY_DELAY = 60  # seconds, AniList rate limit is per minute
MIN_INTERVAL = 2.1  # seconds between two requests: 30 requests/min while the API is degraded

# AniList countryOfOrigin -> language of the original release (ISO 639-1)
ORIGIN_LANGUAGE = {
    "KR": "ko",
    "CN": "zh",
    "TW": "zh",
    "JP": "ja",
}
# countries imported by default: Korean manhwa, Chinese and Taiwanese manhua
DEFAULT_COUNTRIES = ("KR", "CN", "TW")

# AniList external link language -> Release.language (only the languages Boken supports)
LINK_LANGUAGE = {
    "Korean": "ko",
    "Chinese": "zh",
    "Japanese": "ja",
    "English": "en",
    "French": "fr",
    "Spanish": "es",
}

# staff roles that count as authors (others are translators, editors, ...)
AUTHOR_ROLES = ("story", "art", "original creator")

MEDIA_FIELDS = """
  id
  title { romaji english native }
  description(asHtml: false)
  startDate { year month day }
  status
  genres
  format
  countryOfOrigin
  chapters
  isAdult
  staff(perPage: 25) { edges { role node { name { full } } } }
  coverImage { extraLarge large }
  externalLinks { site url language type isDisabled }
"""

PAGE_QUERY = """
query ($page: Int, $perPage: Int, $country: CountryCode, $ids: [Int]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage }
    media(type: MANGA, isAdult: false, format_not: NOVEL, sort: POPULARITY_DESC,
          countryOfOrigin: $country, id_in: $ids) {%s}
  }
}
""" % MEDIA_FIELDS

SEARCH_QUERY = """
query ($search: String) {
  Media(search: $search, type: MANGA, isAdult: false) {%s}
}
""" % MEDIA_FIELDS

_rate_lock = threading.Lock()
_last_request = 0.0


def _respect_rate_limit():
    global _last_request
    with _rate_lock:
        wait = MIN_INTERVAL - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()


def anilist_query(query, variables):
    """POST a GraphQL query, spacing requests and retrying (honours Retry-After on 429)."""
    error = "no attempt"
    for attempt in range(1, MAX_ATTEMPTS + 1):
        _respect_rate_limit()
        delay = RETRY_DELAY
        try:
            response = requests.post(ANILIST_URL, json={"query": query, "variables": variables}, timeout=30)
        except requests.RequestException as e:
            error = str(e)
        else:
            if response.status_code == 200:
                return response.json()["data"]
            if response.status_code == 404:
                return None  # Media(search) found nothing
            error = f"{response.status_code} {response.text[:200]}"
            if response.status_code == 429:
                delay = int(response.headers.get("Retry-After", RETRY_DELAY))
        print(f"Error AniList ({error}), attempt {attempt}/{MAX_ATTEMPTS}")
        if attempt < MAX_ATTEMPTS:
            time.sleep(delay)
    # stops the import (its status becomes "error") instead of retrying forever
    raise RuntimeError(f"AniList unreachable after {MAX_ATTEMPTS} attempts: {error}")


def fetch_page(page, per_page=50, country=None, ids=None):
    """One page of works, most popular first, optionally from one country or with given AniList ids."""
    variables = {"page": page, "perPage": per_page, "country": country, "ids": ids}
    # AniList answers 500 when a filter is sent as null: only send the ones that are set
    variables = {name: value for name, value in variables.items() if value is not None}
    return anilist_query(PAGE_QUERY, variables)["Page"]


def search_media(title):
    """Best AniList match for a title, None if nothing is found."""
    data = anilist_query(SEARCH_QUERY, {"search": title})
    return (data or {}).get("Media")


def map_status(status_str):
    mapping = {
        "FINISHED": "finish",
        "RELEASING": "in progress",
        "HIATUS": "pause",
        "CANCELLED": "cancel"
    }
    return mapping.get(status_str, "in progress")


def clean_description(text):
    """AniList descriptions contain HTML (<br>, <i>) and "(Source: ...)" notes."""
    if not text:
        return "No description available."
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\(Source:[^)]*\)", "", text, flags=re.I)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text[:2000] or "No description available."


def start_date(entry):
    start = entry.get("startDate") or {}
    year = start.get("year") or 2000
    try:
        return date(year, start.get("month") or 1, start.get("day") or 1)
    except ValueError:
        return date(year, 1, 1)


def official_links(entry):
    """{language: {"platform", "url"}} of the official streaming platforms, first link per language."""
    links = {}
    for link in entry.get("externalLinks") or []:
        language = LINK_LANGUAGE.get(link.get("language") or "")
        if link.get("type") != "STREAMING" or link.get("isDisabled") or not language or language in links:
            continue
        links[language] = {"platform": (link.get("site") or "")[:100], "url": link.get("url") or ""}
    return links


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

    if entry.get("isAdult") or "Hentai" in genres:
        return False
    if entry.get("status") == "NOT_YET_RELEASED":
        return False
    if fmt == "NOVEL":
        return False
    if origin == "JP":
        return False
    if origin in ["KR", "CN", "TW"]:
        return True
    if "Webtoon" in genres or "Full Color" in genres:
        return True
    return False


def entry_title(entry):
    return entry["title"].get("english") or entry["title"].get("romaji") or "Unknown"


def find_imported(entry):
    """Webtoon already imported for this AniList work (by id, else an older import with the same title)."""
    anilist_id = entry.get("id")
    if anilist_id:
        webtoon = Webtoon.objects.filter(anilist_id=anilist_id).first()
        if webtoon:
            return webtoon
    return Webtoon.objects.filter(title=entry_title(entry), anilist_id__isnull=True, add_by__isnull=True).first()


def free_title(entry):
    """Title for a new webtoon: different works can share an English title, add the year then the id."""
    title = entry_title(entry)
    if not Webtoon.objects.filter(title=title).exists():
        return title
    year = (entry.get("startDate") or {}).get("year")
    candidate = f"{title} ({year})" if year else title
    if not Webtoon.objects.filter(title=candidate).exists():
        return candidate
    return f"{title} (AniList {entry.get('id')})"


def save_webtoon(entry, added_by=None, extra=None):
    """
    Create or update the webtoon of an AniList entry. Returns True when it was created.
    `extra` (optional): {"titles": {language: title}, "mangaupdates_id": int, "chapters": int}
    """
    extra = extra or {}
    existing = find_imported(entry)
    # covers are downloaded once: a re-import keeps the existing file
    cover = None
    if not (existing and existing.cover):
        # extraLarge (~460px wide) is resized to 400x600, large (~230px) is the fallback
        images = entry.get("coverImage") or {}
        cover = download_image(images.get("extraLarge") or images.get("large"))
    with transaction.atomic():
        return _save_webtoon(entry, existing, cover, added_by, extra)


def _save_webtoon(entry, webtoon, cover, added_by, extra):
    created = webtoon is None
    fields = {
        "release_date": start_date(entry),
        "status": map_status(entry.get("status")),
        "is_public": True,
        "waiting_review": False,
        "anilist_id": entry.get("id"),
    }
    if extra.get("mangaupdates_id"):
        fields["mangaupdates_id"] = extra["mangaupdates_id"]
    if created:
        webtoon = Webtoon.objects.create(title=free_title(entry), add_by=added_by, **fields)
    else:
        for name, value in fields.items():
            setattr(webtoon, name, value)
        webtoon.save()

    webtoon.genres.set([Genre.objects.get_or_create(name=g)[0] for g in entry.get("genres") or []])
    webtoon.authors.set(Author.from_names(get_authors(entry) or ["Unknown"]))

    description = clean_description(entry.get("description"))
    titles = extra.get("titles") or {}
    links = official_links(entry)
    original = ORIGIN_LANGUAGE.get(entry.get("countryOfOrigin"), "ko")

    # original release: AniList only knows its chapter count once finished, MangaUpdates fills ongoing ones
    chapters = entry.get("chapters") or extra.get("chapters") or 0
    _save_release(webtoon, original, {
        "alt_title": entry["title"].get("native") or titles.get(original) or webtoon.title,
        "description": description,
        "total_chapter": chapters,
        **links.get(original, {}),
    })

    # official translations (legal platforms only), chapter count unknown
    for language, link in links.items():
        if language == original:
            continue
        english = entry["title"].get("english") if language == "en" else None
        _save_release(webtoon, language, {
            "alt_title": titles.get(language) or english or webtoon.title,
            "description": description,
            **link,
        })

    if cover:
        try:
            set_cover(webtoon, cover)
        except InvalidCover:
            pass  # a broken image must not stop the import
    return created


def _save_release(webtoon, language, values):
    values = {**values, "alt_title": values["alt_title"][:255], "url": values.get("url", "")[:500]}
    release = Release.objects.filter(webtoon_id=webtoon, language=language).first()
    if release is None:
        Release.objects.create(webtoon_id=webtoon, language=language, **{
            "total_chapter": 0, "platform": "", "url": "", **values,
        })
        return
    if release.add_by_id is not None:
        return  # added by a user or an admin: the import does not overwrite it
    for name, value in values.items():
        # never replace a known chapter count with "unknown"
        if name == "total_chapter" and not value:
            continue
        setattr(release, name, value)
    release.save()
