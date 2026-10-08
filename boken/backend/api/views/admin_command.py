"""
Admin commands that fill and refresh the catalogue from external sources (see api/external_api.py).

- POST /admin/create/     import new webtoons      {"count": 150, "countries": ["KR", "CN", "TW"], "enrich": true}
- POST /admin/update_all/ refresh imported webtoons {"enrich": true}
- GET  /admin/update/     progress of the running / last job
Only one job runs at a time (409 otherwise). GET still works on /admin/create/ and
/admin/update_all/ (parameters in the query string) for older clients.
"""
import threading
from datetime import datetime, timezone

from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.external_api import (
    DEFAULT_COUNTRIES, entry_title, fetch_page, is_webtoon, save_webtoon, search_media,
)
from api.models.webtoon import Webtoon
from api.permissions import IsAdmin
from api.sources import mangaupdates, wikidata

MAX_COUNT = 500
MAX_ERRORS_KEPT = 20

progress = {"status": "not started", "create": 0, "already found": 0, "pourcentage": "0%"}
_job_lock = threading.Lock()


# ---- requests ----

def _params(request):
    return request.data if request.method == "POST" else request.query_params


def _as_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).lower() not in ("0", "false", "no")


def _start(target, **kwargs):
    with _job_lock:
        if progress.get("status") == "in progress":
            return Response({"message": "a job is already running", "progress": progress},
                            status=status.HTTP_409_CONFLICT)
        progress["status"] = "in progress"
    threading.Thread(target=target, kwargs=kwargs, daemon=True).start()
    return Response({"message": "threading start", "parameters": kwargs}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_new(request):
    params = _params(request)
    try:
        count = int(params.get("count", 150))
    except (TypeError, ValueError):
        return Response({"count": ["Must be a number."]}, status=status.HTTP_400_BAD_REQUEST)
    if not 1 <= count <= MAX_COUNT:
        return Response({"count": [f"Must be between 1 and {MAX_COUNT}."]}, status=status.HTTP_400_BAD_REQUEST)
    countries = params.get("countries") or list(DEFAULT_COUNTRIES)
    if isinstance(countries, str):
        countries = [c.strip() for c in countries.split(",") if c.strip()]
    countries = [c.upper() for c in countries]
    if not countries or any(c not in DEFAULT_COUNTRIES for c in countries):
        return Response({"countries": [f"Choose among {', '.join(DEFAULT_COUNTRIES)}."]},
                        status=status.HTTP_400_BAD_REQUEST)
    return _start(create_from_anilist, max_count=count, countries=tuple(countries),
                  enrich=_as_bool(params.get("enrich")))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_all(request):
    return _start(update_from_anilist, enrich=_as_bool(_params(request).get("enrich")))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_progress(request):
    return Response(progress)


# ---- jobs ----

def _reset(task, total):
    # progress is updated in place so readers of admin_command.progress always see the live dict
    progress.clear()
    progress.update({
        "status": "in progress",
        "task": task,
        "phase": None,
        "create": 0,
        "matched": 0,
        "updated": 0,
        "already found": 0,
        "skipped": 0,
        "errors": [],
        "pourcentage": "0%",
        "total": total,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
    })


def _step(done, total):
    progress["pourcentage"] = f"{min(100, int(done / max(total, 1) * 100))}%"


def _error(entry, exc):
    progress["errors"] = (progress["errors"] + [f"{entry_title(entry)}: {exc}"])[-MAX_ERRORS_KEPT:]


def _finish():
    # without this a crash or the last page would leave the status stuck on "in progress"
    progress["status"] = "error" if "error" in progress else "finish"
    progress["finished_at"] = datetime.now(timezone.utc).isoformat()
    if threading.current_thread() is not threading.main_thread():
        connection.close()


def _extras(entries, enrich, known_ids=None):
    """Localised titles (Wikidata) for a page, and chapters of ongoing series (MangaUpdates)."""
    if not enrich:
        return {}
    titles = wikidata.localised_titles([e.get("id") for e in entries])
    extras = {}
    for entry in entries:
        extra = {"titles": titles.get(entry.get("id"), {})}
        if not entry.get("chapters"):
            extra.update(mangaupdates.enrich(entry, (known_ids or {}).get(entry.get("id"))))
        extras[entry.get("id")] = extra
    return extras


def create_from_anilist(max_count=150, countries=DEFAULT_COUNTRIES, enrich=True):
    """Import up to `max_count` new webtoons, most popular first, country by country."""
    _reset("import", max_count)
    try:
        for country in countries:
            page, has_next = 1, True
            while has_next and progress["create"] < max_count:
                data = fetch_page(page, country=country)
                has_next = data["pageInfo"]["hasNextPage"]
                entries = [e for e in data["media"] if is_webtoon(e)]
                new = [e for e in entries if not Webtoon.objects.filter(anilist_id=e.get("id")).exists()]
                progress["already found"] += len(entries) - len(new)
                # enrich only what will be imported (MangaUpdates is ~2 requests per ongoing series)
                new = new[:max_count - progress["create"]]
                extras = _extras(new, enrich)
                for entry in new:
                    try:
                        if save_webtoon(entry, extra=extras.get(entry.get("id"))):
                            progress["create"] += 1
                        else:
                            progress["already found"] += 1
                    except Exception as exc:  # one broken entry must not stop the import
                        _error(entry, exc)
                    _step(progress["create"], max_count)
                    if progress["create"] >= max_count:
                        return
                page += 1
    except Exception as e:
        progress["error"] = str(e)
    finally:
        _finish()


def update_from_anilist(enrich=True):
    """Refresh every imported webtoon: status, chapters, official translations, titles, missing covers."""
    imported = Webtoon.objects.filter(add_by__isnull=True)
    _reset("update", imported.count())
    try:
        # 1. webtoons imported before the AniList id was stored: find them by title (exact match only)
        pending = list(imported.filter(anilist_id__isnull=True))
        progress["phase"] = "matching"  # "pourcentage" is the progress of the current phase
        for done, webtoon in enumerate(pending, 1):
            entry = search_media(webtoon.title)
            titles = {entry["title"].get("english"), entry["title"].get("romaji")} if entry else set()
            if entry and webtoon.title in titles and not Webtoon.objects.filter(anilist_id=entry["id"]).exists():
                webtoon.anilist_id = entry["id"]
                webtoon.save(update_fields=["anilist_id"])
                progress["matched"] += 1
            else:
                progress["skipped"] += 1
            _step(done, len(pending))

        # 2. refresh by id, 50 per request
        progress["phase"] = "refreshing"
        progress["pourcentage"] = "0%"
        known = dict(imported.filter(anilist_id__isnull=False).values_list("anilist_id", "mangaupdates_id"))
        ids = list(known)
        done = 0
        for start in range(0, len(ids), 50):
            entries = fetch_page(1, ids=ids[start:start + 50])["media"]
            extras = _extras(entries, enrich, known)
            for entry in entries:
                try:
                    save_webtoon(entry, extra=extras.get(entry.get("id")))
                    progress["updated"] += 1
                except Exception as exc:
                    _error(entry, exc)
                done += 1
                _step(done, len(ids))
    except Exception as e:
        progress["error"] = str(e)
    finally:
        _finish()
