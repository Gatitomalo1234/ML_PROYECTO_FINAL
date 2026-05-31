import argparse
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

try:
    import feedparser
except ImportError:
    feedparser = None

try:
    from google.cloud import bigquery
except ImportError:  # BigQuery is optional; GDELT public API is the fallback.
    bigquery = None


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

ACLED_FIELDS = "|".join(
    [
        "event_id_cnty",
        "event_date",
        "year",
        "time_precision",
        "disorder_type",
        "event_type",
        "sub_event_type",
        "actor1",
        "actor2",
        "interaction",
        "civilian_targeting",
        "country",
        "admin1",
        "admin2",
        "admin3",
        "location",
        "latitude",
        "longitude",
        "geo_precision",
        "source",
        "source_scale",
        "notes",
        "fatalities",
        "timestamp",
    ]
)

GDELT_COUNTRY_QUERIES = {
    "IR": "Iran OR Iranian OR Tehran",
    "IS": "Israel OR Israeli OR Jerusalem",
}

RSS_FEEDS = {
    "aljazeera": "https://www.aljazeera.com/xml/rss/all.xml",
    "bbc": "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
}

IRANWARLIVE_CSV_FEEDS = {
    "strikes": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyinXiL-Ur469RUBFbu19pDta2jcrmPkJPBdPzlIlENpK_-DInxKtkM_PdxhUzG0ei0-yHhc9aqPRI/pub?gid=0&single=true&output=csv",
    "airspace": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyinXiL-Ur469RUBFbu19pDta2jcrmPkJPBdPzlIlENpK_-DInxKtkM_PdxhUzG0ei0-yHhc9aqPRI/pub?gid=1498621766&single=true&output=csv",
    "posturing": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyinXiL-Ur469RUBFbu19pDta2jcrmPkJPBdPzlIlENpK_-DInxKtkM_PdxhUzG0ei0-yHhc9aqPRI/pub?gid=1935573357&single=true&output=csv",
    "participants": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyinXiL-Ur469RUBFbu19pDta2jcrmPkJPBdPzlIlENpK_-DInxKtkM_PdxhUzG0ei0-yHhc9aqPRI/pub?gid=2133098001&single=true&output=csv",
}

IRANWARLIVE_JSON_FEEDS = {
    "machine_feed": "https://iranwarlive.com/feed.json",
    "ground_feed": "https://ground-scraper.aggeeinn.workers.dev/ground-feed.json",
    "diplomacy_feed": "https://diplomacy-scraper.aggeeinn.workers.dev/diplomacy-feed.json",
    "hormuz_feed": "https://hormuz-scraper.aggeeinn.workers.dev/hormuz-feed.json",
}

GDELT_CLOUD_BASE_URL = "https://gdeltcloud.com/api/v2"
CONFLICTSAPP_BASE_URL = "https://www.conflicts.app/api/v1"
CONFLICTSAPP_CONFLICT_ID = "iran-2026"

URGENCY_TERMS = {
    "attack",
    "attacks",
    "airstrike",
    "airstrikes",
    "blast",
    "bomb",
    "conflict",
    "dead",
    "drone",
    "escalation",
    "explosion",
    "fatalities",
    "fire",
    "missile",
    "strike",
    "war",
}


def get_acled_token():
    username = os.getenv("ACLED_EMAIL")
    password = os.getenv("ACLED_KEY")

    if not username or not password:
        raise ValueError("Faltan ACLED_EMAIL o ACLED_KEY en el archivo .env")

    response = requests.post(
        "https://acleddata.com/oauth/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "username": username,
            "password": password,
            "grant_type": "password",
            "client_id": "acled",
            "scope": "authenticated",
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def fetch_acled(country, start_date, end_date):
    token = get_acled_token()
    limit = 5000
    page = 1
    rows = []

    while True:
        params = {
            "_format": "json",
            "country": country,
            "event_date": f"{start_date}|{end_date}",
            "event_date_where": "BETWEEN",
            "fields": ACLED_FIELDS,
            "limit": limit,
            "page": page,
        }
        response = requests.get(
            "https://acleddata.com/api/acled/read",
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=120,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success", False):
            raise RuntimeError(payload.get("messages", "Error desconocido en ACLED"))

        page_rows = payload.get("data", [])
        rows.extend(page_rows)
        print(f"[info] ACLED {country}: pagina {page}, {len(page_rows):,} filas")
        if len(page_rows) < limit:
            break
        page += 1

    df = pd.DataFrame(rows)
    output_path = RAW_DIR / f"acled_{country.lower().replace(' ', '_')}.csv"
    df.to_csv(output_path, index=False)
    print(f"[ok] ACLED {country}: {len(df):,} filas -> {output_path}")
    return df


GDELT_SQL = """
SELECT
  PARSE_DATE('%Y%m%d', CAST(SQLDATE AS STRING)) AS event_date,
  ActionGeo_ADM1Code AS gdelt_admin1_code,
  ROUND(ActionGeo_Lat, 1) AS lat_bin,
  ROUND(ActionGeo_Long, 1) AS lon_bin,
  COUNT(*) AS gdelt_event_count,
  SUM(NumMentions) AS gdelt_mentions,
  SUM(NumSources) AS gdelt_sources,
  SUM(NumArticles) AS gdelt_articles,
  AVG(AvgTone) AS avg_tone,
  AVG(GoldsteinScale) AS avg_goldstein,
  SUM(CASE WHEN QuadClass = 4 THEN 1 ELSE 0 END) AS material_conflict_events,
  SUM(CASE WHEN EventRootCode IN ('18', '19', '20') THEN 1 ELSE 0 END) AS high_conflict_events
FROM `gdelt-bq.gdeltv2.events_partitioned`
WHERE _PARTITIONTIME BETWEEN TIMESTAMP(@start_date) AND TIMESTAMP(@end_date)
  AND ActionGeo_CountryCode = @country_code
GROUP BY event_date, gdelt_admin1_code, lat_bin, lon_bin
"""


def fetch_gdelt_bigquery(country_code, start_date, end_date):
    project_id = os.getenv("GCP_PROJECT_ID")
    if not project_id:
        raise ValueError("Falta GCP_PROJECT_ID en el archivo .env")
    if bigquery is None:
        raise ImportError("Falta instalar google-cloud-bigquery")

    client = bigquery.Client(project=project_id)
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
            bigquery.ScalarQueryParameter("country_code", "STRING", country_code),
        ]
    )
    return client.query(GDELT_SQL, job_config=job_config).to_dataframe()


def fetch_gdelt_public_api(country_code, start_date, end_date):
    query = GDELT_COUNTRY_QUERIES.get(country_code, country_code)
    rows = []

    for window_start in pd.date_range(start=start_date, end=end_date, freq="MS"):
        window_end = min(
            window_start + pd.offsets.MonthEnd(0),
            pd.to_datetime(end_date),
        )
        if window_end < pd.to_datetime(start_date):
            continue

        params = {
            "query": query,
            "mode": "timelinevolraw",
            "format": "json",
            "startdatetime": window_start.strftime("%Y%m%d") + "000000",
            "enddatetime": window_end.strftime("%Y%m%d") + "235959",
            "maxrecords": 250,
        }
        response = requests.get(
            "https://api.gdeltproject.org/api/v2/doc/doc",
            params=params,
            timeout=60,
        )
        response.raise_for_status()
        try:
            payload = response.json()
        except ValueError as exc:
            preview = response.text[:120].replace("\n", " ")
            raise RuntimeError(f"GDELT devolvio una respuesta no JSON: {preview}") from exc

        for item in payload.get("timeline", []):
            raw_date = str(item.get("date", ""))[:8]
            if not raw_date:
                continue
            value = item.get("value", item.get("Value", 0))
            tone = item.get("tone", item.get("Tone", 0))
            rows.append(
                {
                    "event_date": pd.to_datetime(raw_date, format="%Y%m%d").date(),
                    "country_code": country_code,
                    "gdelt_mentions": value,
                    "gdelt_articles": value,
                    "avg_tone": tone,
                    "gdelt_event_count": value,
                    "material_conflict_events": 0,
                    "high_conflict_events": 0,
                }
            )
        print(f"[info] GDELT {country_code}: {window_start:%Y-%m} descargado")

    df = pd.DataFrame(rows)
    if not df.empty:
        df = (
            df.groupby(["event_date", "country_code"], as_index=False)
            .agg(
                gdelt_mentions=("gdelt_mentions", "sum"),
                gdelt_articles=("gdelt_articles", "sum"),
                avg_tone=("avg_tone", "mean"),
                gdelt_event_count=("gdelt_event_count", "sum"),
                material_conflict_events=("material_conflict_events", "sum"),
                high_conflict_events=("high_conflict_events", "sum"),
            )
            .sort_values("event_date")
        )
    return df


def fetch_gdelt(country_code, start_date, end_date, method="auto"):
    if method in {"auto", "bigquery"}:
        try:
            df = fetch_gdelt_bigquery(country_code, start_date, end_date)
        except Exception as exc:
            if method == "bigquery":
                raise
            print(f"[warn] GDELT BigQuery no disponible ({exc}). Intentando API publica.")
            df = fetch_gdelt_public_api(country_code, start_date, end_date)
    else:
        df = fetch_gdelt_public_api(country_code, start_date, end_date)

    output_path = RAW_DIR / f"gdelt_{country_code.lower()}_daily.csv"
    df.to_csv(output_path, index=False)
    print(f"[ok] GDELT {country_code}: {len(df):,} filas -> {output_path}")
    return df


def fetch_rss(feed_name, start_date=None, end_date=None):
    if feedparser is None:
        raise ImportError("Falta instalar feedparser para extraer RSS")

    url = RSS_FEEDS[feed_name]
    parsed = feedparser.parse(url)
    rows = []

    for entry in parsed.entries:
        published = (
            entry.get("published")
            or entry.get("updated")
            or entry.get("created")
            or datetime.utcnow().isoformat()
        )
        published_dt = pd.to_datetime(published, errors="coerce", utc=True)
        if pd.isna(published_dt):
            continue
        published_date = published_dt.date()
        if start_date and published_date < pd.to_datetime(start_date).date():
            continue
        if end_date and published_date > pd.to_datetime(end_date).date():
            continue

        title = entry.get("title", "")
        summary = entry.get("summary", "")
        text = f"{title} {summary}".lower()
        urgency_hits = sum(1 for term in URGENCY_TERMS if term in text)
        rows.append(
            {
                "source": feed_name,
                "published": published_dt.isoformat(),
                "event_date": published_date.isoformat(),
                "title": title,
                "summary": summary,
                "link": entry.get("link", ""),
                "urgency_hits": urgency_hits,
            }
        )

    output_path = RAW_DIR / f"rss_{feed_name}.jsonl"
    with output_path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"[ok] RSS {feed_name}: {len(rows):,} filas -> {output_path}")
    return pd.DataFrame(rows)


def fetch_ucdp(country_id, start_date, end_date):
    token = os.getenv("UCDP_TOKEN")
    if not token or token.startswith("tu_"):
        print("[skip] Falta UCDP_TOKEN. Saltando extraccion de UCDP.")
        return None

    base_url = "https://ucdpapi.pcr.uu.se/api/gedevents/26.1"
    params = {
        "Country": country_id,
        "StartDate": start_date,
        "EndDate": end_date,
        "pagesize": 1000,
    }
    headers = {"Authorization": f"Bearer {token}"}

    all_events = []
    page = 1
    while True:
        params["page"] = page
        response = requests.get(base_url, params=params, headers=headers, timeout=120)
        response.raise_for_status()
        data = response.json()
        events = data.get("Result", [])
        if not events:
            break

        all_events.extend(events)
        print(f"[info] UCDP {country_id}: pagina {page}")
        if page >= data.get("TotalPages", 1):
            break
        page += 1

    df = pd.DataFrame(all_events)
    output_path = RAW_DIR / f"ucdp_{country_id}.csv"
    df.to_csv(output_path, index=False)
    print(f"[ok] UCDP {country_id}: {len(df):,} filas -> {output_path}")
    return df


def fetch_iranwarlive():
    """Descarga feeds publicos declarados por IranWarLive.

    La pagina publica robots.txt, llms.txt y feeds machine-readable. Usamos esos
    endpoints directos para evitar scraping fragil del DOM.
    """
    frames = {}

    for name, url in IRANWARLIVE_CSV_FEEDS.items():
        df = pd.read_csv(url)
        output_path = RAW_DIR / f"iranwarlive_{name}.csv"
        df.to_csv(output_path, index=False)
        frames[name] = df
        print(f"[ok] IranWarLive {name}: {len(df):,} filas -> {output_path}")

    for name, url in IRANWARLIVE_JSON_FEEDS.items():
        response = requests.get(url, timeout=120)
        response.raise_for_status()
        payload = response.json()
        output_path = RAW_DIR / f"iranwarlive_{name}.json"
        with output_path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)
        item_count = len(payload.get("items", [])) if isinstance(payload, dict) else 0
        print(f"[ok] IranWarLive {name}: {item_count:,} items -> {output_path}")

    return frames


def iter_date_windows(start_date, end_date, window_days=30):
    start = pd.to_datetime(start_date).date()
    end = pd.to_datetime(end_date).date()
    current = start
    while current <= end:
        window_end = min(current + timedelta(days=window_days - 1), end)
        yield current.isoformat(), window_end.isoformat()
        current = window_end + timedelta(days=1)


def gdeltcloud_headers():
    api_key = os.getenv("GDELT_CLOUD_API_KEY")
    if not api_key or api_key.startswith("tu_"):
        raise ValueError("Falta GDELT_CLOUD_API_KEY en .env")
    return {"Authorization": f"Bearer {api_key}"}


def request_gdeltcloud(endpoint, params):
    response = requests.get(
        f"{GDELT_CLOUD_BASE_URL}/{endpoint}",
        params=params,
        headers=gdeltcloud_headers(),
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict) and payload.get("success") is False:
        raise RuntimeError(payload.get("error") or payload.get("message") or payload)
    return payload


def fetch_gdeltcloud_country(country, start_date, end_date, limit=100):
    slug = country.lower().replace(" ", "_")
    event_rows = []
    summary_rows = []

    for window_start, window_end in iter_date_windows(start_date, end_date):
        base_params = {
            "country": country,
            "event_family": "conflict",
            "date_start": window_start,
            "date_end": window_end,
            "confidence_profile": "balanced",
        }

        summary_params = {
            **base_params,
            "group_by": "date",
        }
        summary_payload = request_gdeltcloud("events/summary", summary_params)
        summary_data = summary_payload.get("data", []) if isinstance(summary_payload, dict) else []
        for row in summary_data:
            row["query_country"] = country
            row["window_start"] = window_start
            row["window_end"] = window_end
        summary_rows.extend(summary_data)

        cursor = None
        while True:
            event_params = {
                **base_params,
                "sort": "significance",
                "limit": limit,
                "include_images": "false",
            }
            if cursor:
                event_params["cursor"] = cursor
            event_payload = request_gdeltcloud("events", event_params)
            events = event_payload.get("data", []) if isinstance(event_payload, dict) else []
            for row in events:
                row["query_country"] = country
                row["window_start"] = window_start
                row["window_end"] = window_end
            event_rows.extend(events)

            cursor = None
            if isinstance(event_payload, dict):
                cursor = (
                    event_payload.get("next_cursor")
                    or event_payload.get("cursor")
                    or event_payload.get("pagination", {}).get("next_cursor")
                )
            if not cursor or not events:
                break

        print(
            f"[info] GDELT Cloud {country}: {window_start} a {window_end}, "
            f"{len(summary_data):,} buckets, {len(event_rows):,} eventos acumulados"
        )

    events_df = pd.json_normalize(event_rows)
    summary_df = pd.json_normalize(summary_rows)

    events_path = RAW_DIR / f"gdeltcloud_events_{slug}_2026.csv"
    summary_path = RAW_DIR / f"gdeltcloud_summary_{slug}_2026.csv"
    events_df.to_csv(events_path, index=False)
    summary_df.to_csv(summary_path, index=False)
    print(f"[ok] GDELT Cloud events {country}: {len(events_df):,} filas -> {events_path}")
    print(f"[ok] GDELT Cloud summary {country}: {len(summary_df):,} filas -> {summary_path}")
    return events_df, summary_df


def fetch_gdeltcloud(start_date, end_date, countries):
    for country in countries:
        fetch_gdeltcloud_country(country, start_date, end_date)


def request_conflictsapp(path, params=None):
    response = requests.get(
        f"{CONFLICTSAPP_BASE_URL}/{path.lstrip('/')}",
        params=params or {},
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    if not payload.get("ok", False):
        raise RuntimeError(payload.get("error", payload))
    return payload.get("data")


def write_conflictsapp_csv(name, data):
    output_path = RAW_DIR / f"conflictsapp_{name}.csv"
    if isinstance(data, dict):
        rows = [data]
    else:
        rows = data or []
    df = pd.json_normalize(rows)
    df.to_csv(output_path, index=False)
    print(f"[ok] Conflicts.app {name}: {len(df):,} filas -> {output_path}")
    return df


def fetch_conflictsapp(conflict_id=CONFLICTSAPP_CONFLICT_ID):
    bootstrap = request_conflictsapp("bootstrap")
    write_conflictsapp_csv("bootstrap", bootstrap)

    conflict = request_conflictsapp(f"conflicts/{conflict_id}")
    write_conflictsapp_csv("conflict", conflict)

    days = request_conflictsapp(f"conflicts/{conflict_id}/days")
    write_conflictsapp_csv("days", days)

    events = request_conflictsapp(
        f"conflicts/{conflict_id}/events",
        params={"limit": 1000, "lite": "false"},
    )
    write_conflictsapp_csv("events", events)

    actors = request_conflictsapp(
        f"conflicts/{conflict_id}/actors",
        params={"lite": "false"},
    )
    write_conflictsapp_csv("actors", actors)

    map_data = request_conflictsapp(f"conflicts/{conflict_id}/map/data")
    for dataset_name in ["strikes", "missiles", "targets", "assets", "threatZones", "heatPoints"]:
        write_conflictsapp_csv(f"map_{dataset_name.lower()}", map_data.get(dataset_name, []))

    actor_meta = [
        {"actor_id": actor_id, **meta}
        for actor_id, meta in map_data.get("actorMeta", {}).items()
    ]
    write_conflictsapp_csv("map_actor_meta", actor_meta)


def run_extraction(source, start_date, end_date, gdelt_method, gdeltcloud_countries):
    tasks = []
    if source in {"all", "acled"}:
        tasks.extend(
            [
                ("ACLED Iran", lambda: fetch_acled("Iran", start_date, end_date)),
                ("ACLED Israel", lambda: fetch_acled("Israel", start_date, end_date)),
            ]
        )
    if source in {"all", "gdelt"}:
        tasks.extend(
            [
                ("GDELT IR", lambda: fetch_gdelt("IR", start_date, end_date, gdelt_method)),
                ("GDELT IS", lambda: fetch_gdelt("IS", start_date, end_date, gdelt_method)),
            ]
        )
    if source in {"all", "rss"}:
        tasks.extend(
            [
                ("RSS Al Jazeera", lambda: fetch_rss("aljazeera", start_date, end_date)),
                ("RSS BBC", lambda: fetch_rss("bbc", start_date, end_date)),
            ]
        )
    if source in {"all", "ucdp"}:
        tasks.extend(
            [
                ("UCDP Iran", lambda: fetch_ucdp(630, start_date, end_date)),
                ("UCDP Israel", lambda: fetch_ucdp(666, start_date, end_date)),
            ]
        )
    if source in {"all", "iranwarlive"}:
        tasks.append(("IranWarLive public feeds", fetch_iranwarlive))
    if source in {"all", "gdeltcloud"}:
        tasks.append(("GDELT Cloud", lambda: fetch_gdeltcloud(start_date, end_date, gdeltcloud_countries)))
    if source in {"all", "conflictsapp"}:
        tasks.append(("Conflicts.app", fetch_conflictsapp))

    failures = []
    for name, task in tasks:
        try:
            task()
        except Exception as exc:
            failures.append((name, str(exc)))
            print(f"[error] {name}: {exc}")

    if failures:
        print("\nExtraccion terminada con errores:")
        for name, error in failures:
            print(f"- {name}: {error}")
        raise SystemExit(1)

    print("\nExtraccion terminada sin errores.")


def parse_args():
    parser = argparse.ArgumentParser(description="Extrae fuentes OSINT para el proyecto ML1.")
    parser.add_argument(
        "--source",
        choices=[
            "all",
            "acled",
            "gdelt",
            "gdeltcloud",
            "rss",
            "ucdp",
            "iranwarlive",
            "conflictsapp",
        ],
        default="all",
        help="Fuente a extraer.",
    )
    parser.add_argument("--start", default="2025-11-01", help="Fecha inicial YYYY-MM-DD.")
    parser.add_argument(
        "--end",
        default=datetime.now().strftime("%Y-%m-%d"),
        help="Fecha final YYYY-MM-DD.",
    )
    parser.add_argument(
        "--gdelt-method",
        choices=["auto", "bigquery", "api"],
        default="auto",
        help="Metodo de GDELT. auto intenta BigQuery y cae a API publica.",
    )
    parser.add_argument(
        "--gdeltcloud-countries",
        nargs="+",
        default=["Iran"],
        help="Paises para GDELT Cloud usando nombres en ingles. Ej: Iran Israel.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_extraction(args.source, args.start, args.end, args.gdelt_method, args.gdeltcloud_countries)
