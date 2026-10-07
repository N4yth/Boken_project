from django.db import migrations


LANGUAGE_MAP = {
    "eng": "en", "en": "en",
    "cor": "ko", "kor": "ko", "kr": "ko", "ko": "ko",
    "chn": "zh", "zh": "zh",
    "jpn": "ja", "jp": "ja", "ja": "ja",
    "fra": "fr", "fr": "fr",
    "spa": "es", "es": "es",
}


def split_authors(apps, schema_editor):
    Webtoon = apps.get_model("api", "Webtoon")
    Author = apps.get_model("api", "Author")
    for webtoon in Webtoon.objects.all():
        names = [n.strip() for n in (webtoon.authors_old or "").split(",") if n.strip()]
        authors = [Author.objects.get_or_create(name=name)[0] for name in names]
        webtoon.authors.set(authors)


def join_authors(apps, schema_editor):
    Webtoon = apps.get_model("api", "Webtoon")
    for webtoon in Webtoon.objects.all():
        webtoon.authors_old = ", ".join(a.name for a in webtoon.authors.all()) or "Unknown"
        webtoon.save(update_fields=["authors_old"])


def normalize_languages(apps, schema_editor):
    Release = apps.get_model("api", "Release")
    for release in Release.objects.all():
        code = LANGUAGE_MAP.get((release.language or "").lower(), "ko")
        if code != release.language:
            release.language = code
            release.save(update_fields=["language"])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_author'),
    ]

    operations = [
        migrations.RunPython(split_authors, join_authors),
        migrations.RunPython(normalize_languages, migrations.RunPython.noop),
    ]
