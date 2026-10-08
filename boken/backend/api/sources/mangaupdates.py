"""
MangaUpdates (https://www.mangaupdates.com) public API v1, no key needed.

Acceptable use policy (api.mangaupdates.com): credit MangaUpdates, space the requests and cache
the results. Used here only for the chapter count of the original release of ongoing series,
which AniList does not give. The MangaUpdates id is stored on the webtoon so the series is only
searched once.
"""
import re
import threading
import time

import requests

API_URL = "https://api.mangaupdates.com/v1"
MIN_INTERVAL = 1.0  # seconds between two requests
TIMEOUT = 20

# AniList country of origin -> MangaUpdates type
EXPECTED_TYPE = {"KR": "Manhwa", "CN": "Manhua", "TW": "Manhua"}

_lock = threading.Lock()
_last_request = 0.0


def _wait():
    global _last_request
    with _lock:
        delay = MIN_INTERVAL - (time.monotonic() - _last_request)
        if delay > 0:
            time.sleep(delay)
        _last_request = time.monotonic()


def _request(method, path, **kwargs):
    _wait()
    try:
        response = requests.request(method, f"{API_URL}{path}", timeout=TIMEOUT, **kwargs)
    except requests.RequestException:
        return None
    return response.json() if response.status_code == 200 else None


def parse_chapters(status_text):
    """'652 Chapters (Ongoing) ...' -> 652 (count of the original, written by MangaUpdates editors)."""
    match = re.search(r"(\d[\d,]*)\s+Chapters?", status_text or "", flags=re.I)
    return int(match.group(1).replace(",", "")) if match else None


def _normalise(title):
    return re.sub(r"[^a-z0-9]", "", (title or "").lower())


def find_series_id(titles, country, year=None):
    """MangaUpdates id of the series matching one of the titles, the type (manhwa/manhua) and the year."""
    expected_type = EXPECTED_TYPE.get(country)
    wanted = {_normalise(t) for t in titles if t}
    for title in [t for t in titles if t]:
        data = _request("POST", "/series/search", json={"search": title, "perpage": 5})
        for result in (data or {}).get("results", []):
            record = result.get("record", {})
            if expected_type and record.get("type") != expected_type:
                continue
            same_title = _normalise(record.get("title")) in wanted
            record_year = str(record.get("year") or "")
            close_year = year is not None and record_year.isdigit() and abs(int(record_year) - year) <= 1
            if same_title and (year is None or close_year or not record_year):
                return record.get("series_id")
    return None


def series_chapters(series_id):
    """Chapter count of the original release, None if unknown."""
    data = _request("GET", f"/series/{series_id}")
    return parse_chapters((data or {}).get("status")) if data else None


def enrich(entry, known_id=None):
    """{"mangaupdates_id", "chapters"} for an AniList entry (empty dict when not found)."""
    series_id = known_id or find_series_id(
        [entry["title"].get("english"), entry["title"].get("romaji")],
        entry.get("countryOfOrigin"),
        (entry.get("startDate") or {}).get("year"),
    )
    if not series_id:
        return {}
    result = {"mangaupdates_id": series_id}
    chapters = series_chapters(series_id)
    if chapters:
        result["chapters"] = chapters
    return result
