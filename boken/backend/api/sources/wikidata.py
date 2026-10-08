"""
Wikidata (https://www.wikidata.org): structured data under CC0 (public domain), free for any use.

Gives the title of a work in each language (labels), found through the "AniList manga ID"
property (P8731). One SPARQL query per page of AniList results.
"""
import requests

SPARQL_URL = "https://query.wikidata.org/sparql"
# Wikimedia asks for a descriptive User-Agent
USER_AGENT = "Boken/1.0 (school project; webtoon reading tracker)"
LANGUAGES = ("ko", "zh", "ja", "en", "fr", "es")
TIMEOUT = 30


def localised_titles(anilist_ids):
    """{anilist_id: {language: title}} for the given AniList ids (empty when Wikidata is unreachable)."""
    ids = [str(int(i)) for i in anilist_ids if i]
    if not ids:
        return {}
    values = " ".join(f'"{i}"' for i in ids)
    languages = ", ".join(f'"{lang}"' for lang in LANGUAGES)
    query = f"""
    SELECT ?anilist ?label WHERE {{
      VALUES ?anilist {{ {values} }}
      ?item wdt:P8731 ?anilist .
      ?item rdfs:label ?label .
      FILTER(LANG(?label) IN ({languages}))
    }}"""
    try:
        response = requests.get(SPARQL_URL, params={"query": query}, timeout=TIMEOUT,
                                headers={"Accept": "application/sparql-results+json", "User-Agent": USER_AGENT})
    except requests.RequestException:
        return {}
    if response.status_code != 200:
        return {}
    titles = {}
    for row in response.json().get("results", {}).get("bindings", []):
        label = row["label"]
        titles.setdefault(int(row["anilist"]["value"]), {})[label["xml:lang"]] = label["value"][:255]
    return titles
