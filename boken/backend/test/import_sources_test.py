from datetime import date
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from api import external_api
from api.external_api import clean_description, official_links, save_webtoon, start_date
from api.models.release import Release
from api.models.webtoon import Webtoon
from api.sources import mangaupdates, wikidata
from api.views import admin_command

User = get_user_model()


def anilist_entry(**overrides):
    entry = {
        "id": 119257,
        "title": {"english": "Omniscient Reader", "romaji": "Jeonjijeok Dokja Sijeom", "native": "전지적 독자 시점"},
        "description": "Dokja reads a novel.<br><br>It becomes real. <i>Wow</i>&amp;more (Source: WEBTOON)",
        "startDate": {"year": 2020, "month": 5, "day": 26},
        "status": "RELEASING",
        "genres": ["Action", "Fantasy"],
        "format": "MANGA",
        "countryOfOrigin": "KR",
        "chapters": None,
        "isAdult": False,
        "staff": {"edges": [
            {"role": "Story", "node": {"name": {"full": "Sing Shong"}}},
            {"role": "Art", "node": {"name": {"full": "Sleepy-C"}}},
            {"role": "Translator (English)", "node": {"name": {"full": "Someone"}}},
        ]},
        "coverImage": {},
        "externalLinks": [
            {"site": "Naver Webtoon", "url": "https://comic.naver.com/orv", "language": "Korean", "type": "STREAMING", "isDisabled": False},
            {"site": "WEBTOON", "url": "https://www.webtoons.com/en/orv", "language": "English", "type": "STREAMING", "isDisabled": False},
            {"site": "Tapas", "url": "https://tapas.io/orv", "language": "English", "type": "STREAMING", "isDisabled": False},
            {"site": "WEBTOON", "url": "https://www.webtoons.com/fr/orv", "language": "French", "type": "STREAMING", "isDisabled": False},
            {"site": "WEBTOON", "url": "https://www.webtoons.com/es/orv", "language": "Spanish", "type": "STREAMING", "isDisabled": True},
            {"site": "WEBTOON", "url": "https://www.webtoons.com/th/orv", "language": "Thai", "type": "STREAMING", "isDisabled": False},
            {"site": "Yen Press", "url": "https://yenpress.com/orv", "language": "English", "type": "INFO", "isDisabled": False},
        ],
    }
    entry.update(overrides)
    return entry


class DataCalibrationTests(APITestCase):
    def test_description_is_cleaned(self):
        self.assertEqual(clean_description(anilist_entry()["description"]), "Dokja reads a novel.\n\nIt becomes real. Wow&more")
        self.assertEqual(clean_description(None), "No description available.")

    def test_full_start_date(self):
        self.assertEqual(start_date(anilist_entry()), date(2020, 5, 26))
        self.assertEqual(start_date({"startDate": {"year": 2019}}), date(2019, 1, 1))
        self.assertEqual(start_date({"startDate": {}}), date(2000, 1, 1))

    def test_only_official_streaming_links_in_supported_languages(self):
        links = official_links(anilist_entry())
        self.assertEqual(set(links), {"ko", "en", "fr"})  # Spanish link disabled, Thai not supported, INFO ignored
        self.assertEqual(links["en"], {"platform": "WEBTOON", "url": "https://www.webtoons.com/en/orv"})  # first one

    def test_not_yet_released_and_adult_works_are_skipped(self):
        self.assertFalse(external_api.is_webtoon(anilist_entry(status="NOT_YET_RELEASED")))
        self.assertFalse(external_api.is_webtoon(anilist_entry(isAdult=True)))
        self.assertTrue(external_api.is_webtoon(anilist_entry()))


class SaveWebtoonTests(APITestCase):
    def releases(self):
        webtoon = Webtoon.objects.get(anilist_id=119257)
        return {r.language: r for r in webtoon.release.all()}

    def test_original_and_official_translations(self):
        extra = {"titles": {"fr": "Omniscient Reader (FR)", "ko": "전독시"}, "mangaupdates_id": 42, "chapters": 230}
        self.assertTrue(save_webtoon(anilist_entry(), extra=extra))
        webtoon = Webtoon.objects.get(anilist_id=119257)
        self.assertEqual((webtoon.title, webtoon.mangaupdates_id, webtoon.release_date), ("Omniscient Reader", 42, date(2020, 5, 26)))
        self.assertEqual(sorted(a.name for a in webtoon.authors.all()), ["Sing Shong", "Sleepy-C"])
        releases = self.releases()
        self.assertEqual(set(releases), {"ko", "en", "fr"})
        ko, en, fr = releases["ko"], releases["en"], releases["fr"]
        # original: native title, chapter count from MangaUpdates (AniList has none while releasing)
        self.assertEqual((ko.alt_title, ko.total_chapter, ko.platform), ("전지적 독자 시점", 230, "Naver Webtoon"))
        # translations: official platform and link, localised title, unknown chapter count
        self.assertEqual((en.alt_title, en.platform, en.url, en.total_chapter),
                         ("Omniscient Reader", "WEBTOON", "https://www.webtoons.com/en/orv", 0))
        self.assertEqual(fr.alt_title, "Omniscient Reader (FR)")

    def test_reimport_updates_without_losing_data(self):
        save_webtoon(anilist_entry(), extra={"chapters": 230})
        releases = self.releases()
        releases["en"].total_chapter = 200  # set by an admin
        releases["en"].save()
        admin = User.objects.create_admin(email="a@test.com", username="admin", password="adminpass123")
        Release.objects.filter(pk=releases["fr"].pk).update(add_by=admin, alt_title="Titre choisi par un admin")

        self.assertFalse(save_webtoon(anilist_entry(status="FINISHED")))  # no MangaUpdates count this time
        releases = self.releases()
        self.assertEqual(Webtoon.objects.get(anilist_id=119257).status, "finish")
        self.assertEqual(releases["ko"].total_chapter, 230)  # known count not replaced by "unknown"
        self.assertEqual(releases["en"].total_chapter, 200)
        self.assertEqual(releases["fr"].alt_title, "Titre choisi par un admin")  # added by an admin: untouched
        self.assertEqual(Webtoon.objects.count(), 1)

    def test_same_english_title_as_another_work(self):
        user = User.objects.create_user(email="u@test.com", username="u", password="securepass123")
        Webtoon.objects.create(title="Omniscient Reader", release_date=date(2021, 1, 1), status="finish", add_by=user)
        save_webtoon(anilist_entry())
        self.assertTrue(Webtoon.objects.filter(title="Omniscient Reader (2020)", anilist_id=119257).exists())
        self.assertIsNone(Webtoon.objects.get(title="Omniscient Reader").anilist_id)  # user's webtoon untouched

    def test_older_import_without_id_is_matched_by_title(self):
        old = Webtoon.objects.create(title="Omniscient Reader", release_date=date(2020, 1, 1), status="finish", is_public=True)
        self.assertFalse(save_webtoon(anilist_entry()))
        old.refresh_from_db()
        self.assertEqual(old.anilist_id, 119257)

    def test_platform_and_url_in_the_api(self):
        save_webtoon(anilist_entry())
        webtoon = Webtoon.objects.get(anilist_id=119257)
        data = self.client.get(f"/api/webtoon/{webtoon.id}/").data
        en = next(r for r in data["releases"] if r["language"] == "en")
        self.assertEqual((en["platform"], en["url"]), ("WEBTOON", "https://www.webtoons.com/en/orv"))
        self.assertEqual(data["anilist_id"], 119257)


class AnilistClientTests(APITestCase):
    def response(self, code=200, data=None, headers=None):
        r = MagicMock(status_code=code, headers=headers or {}, text="")
        r.json.return_value = {"data": data or {"Page": {"media": [], "pageInfo": {"hasNextPage": False}}}}
        return r

    def test_page_query_filters_by_country_and_popularity(self):
        with patch("api.external_api.requests.post", return_value=self.response()) as post, \
                patch("api.external_api.time.sleep"):
            external_api.fetch_page(2, country="KR")
        body = post.call_args.kwargs["json"]
        # no "ids": null, AniList answers 500 to null filters
        self.assertEqual(body["variables"], {"page": 2, "perPage": 50, "country": "KR"})
        self.assertIn("sort: POPULARITY_DESC", body["query"])
        self.assertIn("externalLinks", body["query"])

    def test_429_waits_retry_after(self):
        responses = [self.response(429, headers={"Retry-After": "7"}), self.response()]
        with patch("api.external_api.requests.post", side_effect=responses), \
                patch("api.external_api.time.sleep") as sleep:
            external_api.fetch_page(1)
        self.assertIn(((7,),), [(c.args,) for c in sleep.call_args_list])

    def test_requests_are_spaced_for_the_rate_limit(self):
        with patch("api.external_api.time.monotonic", side_effect=[100.0, 100.0, 100.5, 100.5]), \
                patch("api.external_api.time.sleep") as sleep:
            external_api._last_request = 0.0
            external_api._respect_rate_limit()
            external_api._respect_rate_limit()
        self.assertAlmostEqual(sleep.call_args.args[0], external_api.MIN_INTERVAL - 0.5)


class MangaUpdatesTests(APITestCase):
    def test_chapters_from_status_text(self):
        self.assertEqual(mangaupdates.parse_chapters("652 Chapters (Ongoing)\n18 Volumes"), 652)
        self.assertEqual(mangaupdates.parse_chapters("1,024 Chapters (Complete)"), 1024)
        self.assertIsNone(mangaupdates.parse_chapters("Ongoing"))

    def test_match_on_title_type_and_year(self):
        search = MagicMock(status_code=200)
        search.json.return_value = {"results": [
            {"record": {"series_id": 1, "title": "Omniscient Reader", "type": "Novel", "year": "2018"}},
            {"record": {"series_id": 2, "title": "Omniscient Reader", "type": "Manhwa", "year": "2020"}},
        ]}
        series = MagicMock(status_code=200)
        series.json.return_value = {"status": "230 Chapters (Ongoing)"}
        with patch("api.sources.mangaupdates.requests.request", side_effect=[search, series]), \
                patch("api.sources.mangaupdates.time.sleep"):
            self.assertEqual(mangaupdates.enrich(anilist_entry()), {"mangaupdates_id": 2, "chapters": 230})

    def test_known_id_is_not_searched_again(self):
        series = MagicMock(status_code=200)
        series.json.return_value = {"status": "10 Chapters"}
        with patch("api.sources.mangaupdates.requests.request", return_value=series) as request, \
                patch("api.sources.mangaupdates.time.sleep"):
            self.assertEqual(mangaupdates.enrich(anilist_entry(), known_id=99), {"mangaupdates_id": 99, "chapters": 10})
        self.assertEqual(request.call_count, 1)

    def test_unreachable(self):
        with patch("api.sources.mangaupdates.requests.request", side_effect=mangaupdates.requests.ConnectionError()), \
                patch("api.sources.mangaupdates.time.sleep"):
            self.assertEqual(mangaupdates.enrich(anilist_entry()), {})


class WikidataTests(APITestCase):
    def test_titles_by_anilist_id(self):
        response = MagicMock(status_code=200)
        response.json.return_value = {"results": {"bindings": [
            {"anilist": {"value": "85143"}, "label": {"xml:lang": "es", "value": "Torre de Dios"}},
            {"anilist": {"value": "85143"}, "label": {"xml:lang": "ko", "value": "신의 탑"}},
        ]}}
        with patch("api.sources.wikidata.requests.get", return_value=response) as get:
            titles = wikidata.localised_titles([85143, None])
        self.assertEqual(titles, {85143: {"es": "Torre de Dios", "ko": "신의 탑"}})
        self.assertIn('"85143"', get.call_args.kwargs["params"]["query"])
        self.assertIn("Boken", get.call_args.kwargs["headers"]["User-Agent"])

    def test_unreachable(self):
        with patch("api.sources.wikidata.requests.get", side_effect=wikidata.requests.Timeout()):
            self.assertEqual(wikidata.localised_titles([1]), {})


class AdminImportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_admin(email="admin@test.com", username="admin", password="adminpass123")
        self.client.force_authenticate(user=self.admin)
        self.saved = dict(admin_command.progress)

    def tearDown(self):
        admin_command.progress.clear()
        admin_command.progress.update(self.saved)

    def start(self, url, data, method="post"):
        with patch("api.views.admin_command.threading.Thread") as thread:
            res = getattr(self.client, method)(url, data, format="json") if method == "post" else self.client.get(url, data)
            admin_command.progress["status"] = "finish"
        return res, thread

    def test_import_parameters(self):
        res, thread = self.start("/admin/create/", {"count": 20, "countries": ["kr", "CN"], "enrich": False})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(thread.call_args.kwargs["kwargs"], {"max_count": 20, "countries": ("KR", "CN"), "enrich": False})

    def test_get_still_works_with_query_string(self):
        res, thread = self.start("/admin/create/", {"count": "5", "countries": "TW"}, method="get")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(thread.call_args.kwargs["kwargs"], {"max_count": 5, "countries": ("TW",), "enrich": True})

    def test_invalid_parameters(self):
        for data in ({"count": 0}, {"count": 9999}, {"count": "abc"}, {"countries": ["JP"]}):
            self.assertEqual(self.start("/admin/create/", data)[0].status_code, status.HTTP_400_BAD_REQUEST, data)

    def test_update_all_starts_a_job(self):
        res, thread = self.start("/admin/update_all/", {"enrich": False})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIs(thread.call_args.kwargs["target"], admin_command.update_from_anilist)

    def test_one_job_at_a_time(self):
        admin_command.progress["status"] = "in progress"
        self.assertEqual(self.client.post("/admin/update_all/").status_code, status.HTTP_409_CONFLICT)

    def test_users_cannot_run_jobs(self):
        user = User.objects.create_user(email="u@test.com", username="u", password="securepass123")
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.post("/admin/create/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post("/admin/update_all/").status_code, status.HTTP_403_FORBIDDEN)


class ImportJobTests(APITestCase):
    def setUp(self):
        self.saved = dict(admin_command.progress)

    def tearDown(self):
        admin_command.progress.clear()
        admin_command.progress.update(self.saved)

    def page(self, *entries, has_next=False):
        return {"media": list(entries), "pageInfo": {"hasNextPage": has_next}}

    def test_import_by_country_with_enrichment(self):
        pages = {
            "KR": self.page(anilist_entry(), anilist_entry(id=1, title={"english": "Japanese", "romaji": "J", "native": "J"},
                                                           countryOfOrigin="JP")),
            "CN": self.page(anilist_entry(id=2, title={"english": "A Manhua", "romaji": "M", "native": "漫画"},
                                          countryOfOrigin="CN", chapters=80, externalLinks=[])),
        }
        with patch("api.views.admin_command.fetch_page", side_effect=lambda page, country=None, **_: pages[country]), \
                patch("api.views.admin_command.wikidata.localised_titles", return_value={119257: {"fr": "Lecteur"}}), \
                patch("api.views.admin_command.mangaupdates.enrich", return_value={"mangaupdates_id": 7, "chapters": 230}) as mu:
            admin_command.create_from_anilist(max_count=10, countries=("KR", "CN"))
        progress = admin_command.progress
        self.assertEqual((progress["status"], progress["task"], progress["create"]), ("finish", "import", 2))
        self.assertEqual(mu.call_count, 1)  # only the ongoing series without chapter count
        manhua = Webtoon.objects.get(anilist_id=2)
        self.assertEqual([(r.language, r.total_chapter) for r in manhua.release.all()], [("zh", 80)])
        self.assertEqual(Release.objects.get(webtoon_id__anilist_id=119257, language="fr").alt_title, "Lecteur")
        self.assertFalse(Webtoon.objects.filter(anilist_id=1).exists())  # Japanese manga skipped

    def test_one_broken_entry_does_not_stop_the_import(self):
        broken = anilist_entry(id=5, title={"english": None, "romaji": None, "native": None}, staff=None)
        with patch("api.views.admin_command.fetch_page", return_value=self.page(anilist_entry(), broken)), \
                patch("api.views.admin_command.save_webtoon", side_effect=[True, ValueError("boom")]):
            admin_command.create_from_anilist(max_count=5, countries=("KR",), enrich=False)
        self.assertEqual(admin_command.progress["create"], 1)
        self.assertEqual(admin_command.progress["status"], "finish")
        self.assertEqual(len(admin_command.progress["errors"]), 1)

    def test_update_finds_old_imports_and_refreshes_them(self):
        old = Webtoon.objects.create(title="Omniscient Reader", release_date=date(2020, 1, 1), status="in progress", is_public=True)
        Webtoon.objects.create(title="[TEST] Fake", release_date=date(2020, 1, 1), status="finish", is_public=True)
        user = User.objects.create_user(email="u@test.com", username="u", password="securepass123")
        Webtoon.objects.create(title="Mine", release_date=date(2020, 1, 1), status="finish", add_by=user)

        def search(title):
            return anilist_entry() if title == "Omniscient Reader" else None

        with patch("api.views.admin_command.search_media", side_effect=search) as searched, \
                patch("api.views.admin_command.fetch_page", return_value=self.page(anilist_entry(status="FINISHED", chapters=551))):
            admin_command.update_from_anilist(enrich=False)
        old.refresh_from_db()
        self.assertEqual((old.anilist_id, old.status), (119257, "finish"))
        self.assertEqual(old.release.get(language="ko").total_chapter, 551)
        progress = admin_command.progress
        self.assertEqual((progress["status"], progress["updated"], progress["skipped"], progress["matched"]), ("finish", 1, 1, 1))
        self.assertEqual((progress["phase"], progress["pourcentage"]), ("refreshing", "100%"))
        self.assertNotIn("Mine", [c.args[0] for c in searched.call_args_list])  # user webtoons are not imported data

    def test_only_what_is_imported_is_enriched(self):
        entries = [anilist_entry(id=i, title={"english": f"Work {i}", "romaji": "", "native": ""}) for i in range(1, 6)]
        with patch("api.views.admin_command.fetch_page", return_value=self.page(*entries)),                 patch("api.views.admin_command.wikidata.localised_titles", return_value={}) as titles,                 patch("api.views.admin_command.mangaupdates.enrich", return_value={}) as mu:
            admin_command.create_from_anilist(max_count=2, countries=("KR",))
        self.assertEqual(admin_command.progress["create"], 2)
        self.assertEqual(mu.call_count, 2)
        self.assertEqual(titles.call_args.args[0], [1, 2])
