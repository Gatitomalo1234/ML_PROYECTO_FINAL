import argparse
import json
import math
import re
import sqlite3
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB_PATH = PROCESSED_DIR / "database.sqlite"

ATTACK_LIKE_ACLED_EVENT_TYPES = {
    "Battles",
    "Explosions/Remote violence",
    "Violence against civilians",
}

ATTACK_LIKE_ACLED_SUB_EVENT_TYPES = {
    "Air/drone strike",
    "Shelling/artillery/missile attack",
    "Chemical weapon",
    "Remote explosive/landmine/IED",
    "Armed clash",
    "Attack",
}


def make_sqlite_safe_columns(df):
    seen = {}
    safe_columns = []
    for column in df.columns:
        safe = re.sub(r"[^0-9A-Za-z_]+", "_", str(column)).strip("_").lower()
        if not safe:
            safe = "column"
        count = seen.get(safe, 0)
        seen[safe] = count + 1
        if count:
            safe = f"{safe}_{count + 1}"
        safe_columns.append(safe)
    df = df.copy()
    df.columns = safe_columns
    return df


def read_csv_if_exists(path):
    if not path.exists():
        return pd.DataFrame()
    try:
        return pd.read_csv(path)
    except pd.errors.EmptyDataError:
        return pd.DataFrame()


def read_jsonl_if_exists(path):
    if not path.exists():
        return pd.DataFrame()
    rows = []
    with path.open("r", encoding="utf-8") as file:
        for line in file:
            if line.strip():
                rows.append(json.loads(line))
    return pd.DataFrame(rows)


def read_json_if_exists(path):
    if not path.exists():
        return pd.DataFrame()
    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    if isinstance(payload, dict) and isinstance(payload.get("items"), list):
        rows = payload["items"]
        if not rows:
            return pd.DataFrame([{"last_updated": payload.get("last_updated"), "item_count": 0}])
        df = pd.json_normalize(rows)
        for key, value in payload.items():
            if key != "items" and not isinstance(value, (dict, list)):
                df[f"feed_{key}"] = value
        return df
    if isinstance(payload, dict):
        return pd.json_normalize(payload)
    if isinstance(payload, list):
        return pd.json_normalize(payload)
    return pd.DataFrame()


def normalize_region_from_filename(path):
    name = path.stem.lower()
    if "iran" in name or name.endswith("_ir_daily"):
        return "iran"
    if "israel" in name or name.endswith("_is_daily"):
        return "israel"
    return "global"


def date_series(frame, column):
    return pd.to_datetime(frame[column], errors="coerce", format="mixed", utc=True).dt.date


def ensure_numeric_columns(frame, columns):
    frame = frame.copy()
    for column in columns:
        if column not in frame.columns:
            frame[column] = 0
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0)
    return frame


def classify_weapon_type(text):
    text = str(text).lower()
    if any(term in text for term in ["drone", "uav"]):
        return "drone"
    if any(term in text for term in ["missile", "ballistic", "rocket"]):
        return "missile_rocket"
    if any(term in text for term in ["airstrike", "air strike", "air/drone strike", "precision munition"]):
        return "air_strike"
    if any(term in text for term in ["shelling", "artillery", "mortar"]):
        return "shelling_artillery"
    if any(term in text for term in ["ied", "landmine", "explosive"]):
        return "explosive_ied"
    if "chemical" in text:
        return "chemical"
    if any(term in text for term in ["intercept", "air defense", "air defence"]):
        return "interception_air_defense"
    return "unknown"


def classify_target_type(text):
    text = str(text).lower()
    if any(term in text for term in ["nuclear", "fordow", "natanz", "reactor"]):
        return "nuclear"
    if any(term in text for term in ["school", "hospital", "residential", "civilian", "children"]):
        return "civilian"
    if any(term in text for term in ["base", "irgc", "military", "air force", "airbase", "barracks", "compound"]):
        return "military"
    if any(term in text for term in ["oil", "port", "refinery", "power", "airport", "bridge", "dock", "jetty", "pipeline"]):
        return "infrastructure"
    if any(term in text for term in ["tehran", "tel aviv", "haifa", "city", "urban"]):
        return "urban"
    return "unknown"


def add_msi_columns(frame):
    frame = frame.copy()
    frame["fatalities"] = pd.to_numeric(frame.get("fatalities", 0), errors="coerce").fillna(0)
    frame["target_msi"] = frame["fatalities"].clip(lower=0).map(lambda value: math.log1p(value))
    frame["has_fatalities"] = frame["fatalities"].gt(0).astype(int)
    return frame


def normalize_event_model_columns(frame):
    columns = [
        "event_id",
        "event_date",
        "source",
        "country",
        "region",
        "location",
        "latitude",
        "longitude",
        "actor1",
        "actor2",
        "event_type",
        "sub_event_type",
        "weapon_type",
        "target_type",
        "civilian_targeting",
        "attack_like_event",
        "fatalities",
        "target_msi",
        "has_fatalities",
        "confidence",
        "source_url",
        "text",
    ]
    for column in columns:
        if column not in frame.columns:
            frame[column] = ""
    return frame[columns]


def build_acled_event_model():
    frames = []
    for path in sorted(RAW_DIR.glob("acled_*.csv")):
        df = read_csv_if_exists(path)
        if df.empty:
            continue

        text = (
            df.get("event_type", "").fillna("").astype(str)
            + " "
            + df.get("sub_event_type", "").fillna("").astype(str)
            + " "
            + df.get("notes", "").fillna("").astype(str)
        )
        frame = pd.DataFrame(
            {
                "event_id": df.get("event_id_cnty", ""),
                "event_date": pd.to_datetime(df.get("event_date"), errors="coerce", format="mixed").dt.date,
                "source": "acled",
                "country": df.get("country", ""),
                "region": normalize_region_from_filename(path),
                "location": df.get("location", ""),
                "latitude": pd.to_numeric(df.get("latitude", 0), errors="coerce"),
                "longitude": pd.to_numeric(df.get("longitude", 0), errors="coerce"),
                "actor1": df.get("actor1", ""),
                "actor2": df.get("actor2", ""),
                "event_type": df.get("event_type", ""),
                "sub_event_type": df.get("sub_event_type", ""),
                "weapon_type": text.map(classify_weapon_type),
                "target_type": text.map(classify_target_type),
                "civilian_targeting": df.get("civilian_targeting", ""),
                "attack_like_event": (
                    df.get("event_type", "").isin(ATTACK_LIKE_ACLED_EVENT_TYPES)
                    | df.get("sub_event_type", "").isin(ATTACK_LIKE_ACLED_SUB_EVENT_TYPES)
                ).astype(int),
                "fatalities": df.get("fatalities", 0),
                "confidence": df.get("source_scale", ""),
                "source_url": df.get("source", ""),
                "text": text,
            }
        )
        frames.append(frame)

    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def build_iranwarlive_event_model():
    path = RAW_DIR / "iranwarlive_strikes.csv"
    df = read_csv_if_exists(path)
    if df.empty:
        return pd.DataFrame()

    text = (
        df.get("Strike_Type", "").fillna("").astype(str)
        + " "
        + df.get("Target_Description", "").fillna("").astype(str)
        + " "
        + df.get("Escalation_Context", "").fillna("").astype(str)
    )
    frame = pd.DataFrame(
        {
            "event_id": df.get("Event_ID", ""),
            "event_date": date_series(df, "Timestamp") if "Timestamp" in df.columns else pd.NaT,
            "source": "iranwarlive",
            "country": "Iran",
            "region": "iran",
            "location": "",
            "latitude": pd.to_numeric(df.get("Latitude", 0), errors="coerce"),
            "longitude": pd.to_numeric(df.get("Longitude", 0), errors="coerce"),
            "actor1": "",
            "actor2": "",
            "event_type": df.get("Strike_Type", ""),
            "sub_event_type": "",
            "weapon_type": text.map(classify_weapon_type),
            "target_type": text.map(classify_target_type),
            "civilian_targeting": text.str.lower().str.contains("civilian|school|children|hospital|residential").astype(int),
            "attack_like_event": 1,
            "fatalities": df.get("Casualties", 0),
            "confidence": df.get("Verification_Status", df.get("Verified_By", "")),
            "source_url": df.get("Source_URL", ""),
            "text": text,
        }
    )
    return frame


def build_gdeltcloud_event_model():
    path = RAW_DIR / "gdeltcloud_events_iran_2026.csv"
    df = read_csv_if_exists(path)
    if df.empty:
        return pd.DataFrame()

    text = (
        df.get("title", "").fillna("").astype(str)
        + " "
        + df.get("summary", "").fillna("").astype(str)
        + " "
        + df.get("actors", "").fillna("").astype(str)
    )
    frame = pd.DataFrame(
        {
            "event_id": df.get("id", ""),
            "event_date": date_series(df, "event_date") if "event_date" in df.columns else pd.NaT,
            "source": "gdeltcloud",
            "country": df.get("geo.country", df.get("query_country", "Iran")),
            "region": df.get("query_country", "iran").fillna("iran").astype(str).str.lower(),
            "location": df.get("geo.location", ""),
            "latitude": pd.to_numeric(df.get("geo.latitude", 0), errors="coerce"),
            "longitude": pd.to_numeric(df.get("geo.longitude", 0), errors="coerce"),
            "actor1": df.get("actors", ""),
            "actor2": "",
            "event_type": df.get("category", ""),
            "sub_event_type": df.get("subcategory", df.get("event_code", "")),
            "weapon_type": text.map(classify_weapon_type),
            "target_type": text.map(classify_target_type),
            "civilian_targeting": df.get("civilian_targeting", 0),
            "attack_like_event": 1,
            "fatalities": df.get("fatalities", 0),
            "confidence": df.get("metrics.confidence", ""),
            "source_url": df.get("primary_story_url", df.get("url", "")),
            "text": text,
        }
    )
    return frame


def build_event_model_table():
    frames = [
        build_acled_event_model(),
        build_iranwarlive_event_model(),
        build_gdeltcloud_event_model(),
    ]
    frames = [frame for frame in frames if not frame.empty]
    if not frames:
        return pd.DataFrame()

    events = pd.concat(frames, ignore_index=True)
    events = events.dropna(subset=["event_date"])
    events = add_msi_columns(events)
    events = normalize_event_model_columns(events)
    events = events.sort_values(["event_date", "source", "event_id"]).reset_index(drop=True)
    return events


def merge_daily_frames(frames):
    valid_frames = [frame.dropna(subset=["event_date"]) for frame in frames if not frame.empty]
    valid_frames = [frame for frame in valid_frames if not frame.empty]
    if not valid_frames:
        return pd.DataFrame(columns=["event_date", "region"])

    master = valid_frames[0]
    for frame in valid_frames[1:]:
        master = master.merge(frame, on=["event_date", "region"], how="outer")
    return master


def load_acled_daily():
    frames = []
    for path in sorted(RAW_DIR.glob("acled_*.csv")):
        df = read_csv_if_exists(path)
        if df.empty:
            continue
        df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce").dt.date
        df["fatalities"] = pd.to_numeric(df.get("fatalities", 0), errors="coerce").fillna(0)
        df["region"] = normalize_region_from_filename(path)
        daily = (
            df.groupby(["event_date", "region"], dropna=False)
            .agg(
                total_fatalities=("fatalities", "sum"),
                event_count=("event_id_cnty", "nunique")
                if "event_id_cnty" in df.columns
                else ("fatalities", "size"),
            )
            .reset_index()
        )
        frames.append(daily)
    if not frames:
        return pd.DataFrame(columns=["event_date", "region", "total_fatalities", "event_count"])
    return pd.concat(frames, ignore_index=True)


def load_gdelt_daily():
    frames = []
    for path in sorted(RAW_DIR.glob("gdelt_*_daily.csv")):
        df = read_csv_if_exists(path)
        if df.empty:
            continue
        df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce").dt.date
        df["region"] = normalize_region_from_filename(path)
        for column in [
            "gdelt_mentions",
            "gdelt_articles",
            "avg_tone",
            "material_conflict_events",
            "high_conflict_events",
        ]:
            if column not in df.columns:
                df[column] = 0
            df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)
        daily = (
            df.groupby(["event_date", "region"], dropna=False)
            .agg(
                gdelt_mentions=("gdelt_mentions", "sum"),
                gdelt_articles=("gdelt_articles", "sum"),
                avg_tone=("avg_tone", "mean"),
                material_conflict_events=("material_conflict_events", "sum"),
                high_conflict_events=("high_conflict_events", "sum"),
            )
            .reset_index()
        )
        frames.append(daily)
    if not frames:
        return pd.DataFrame(
            columns=[
                "event_date",
                "region",
                "gdelt_mentions",
                "gdelt_articles",
                "avg_tone",
                "material_conflict_events",
                "high_conflict_events",
            ]
        )
    return pd.concat(frames, ignore_index=True)


def load_gdeltcloud_summary_daily():
    path = RAW_DIR / "gdeltcloud_summary_iran_2026.csv"
    df = read_csv_if_exists(path)
    if df.empty or "key" not in df.columns:
        return pd.DataFrame(columns=["event_date", "region"])

    df["event_date"] = date_series(df, "key")
    df["region"] = df.get("query_country", "iran")
    df["region"] = df["region"].fillna("iran").astype(str).str.lower()
    df = ensure_numeric_columns(
        df,
        [
            "event_count",
            "conflict_event_count",
            "fatality_event_count",
            "fatalities",
            "fatality_event_rate",
            "country_count",
            "article_count",
            "avg_goldstein_severity",
            "avg_goldstein_scale",
            "avg_confidence",
        ],
    )

    daily = (
        df.groupby(["event_date", "region"], dropna=False)
        .agg(
            gdeltcloud_event_count=("event_count", "sum"),
            gdeltcloud_conflict_event_count=("conflict_event_count", "sum"),
            gdeltcloud_fatality_event_count=("fatality_event_count", "sum"),
            gdeltcloud_country_count=("country_count", "max"),
            gdeltcloud_article_count=("article_count", "sum"),
            gdeltcloud_avg_goldstein_severity=("avg_goldstein_severity", "mean"),
            gdeltcloud_avg_goldstein_scale=("avg_goldstein_scale", "mean"),
            gdeltcloud_avg_confidence=("avg_confidence", "mean"),
            target_gdeltcloud_fatalities=("fatalities", "sum"),
            target_gdeltcloud_fatality_event_rate=("fatality_event_rate", "mean"),
        )
        .reset_index()
    )
    return daily


def load_gdeltcloud_events_daily():
    path = RAW_DIR / "gdeltcloud_events_iran_2026.csv"
    df = read_csv_if_exists(path)
    if df.empty or "event_date" not in df.columns:
        return pd.DataFrame(columns=["event_date", "region"])

    df["event_date"] = date_series(df, "event_date")
    df["region"] = df.get("query_country", "iran")
    df["region"] = df["region"].fillna("iran").astype(str).str.lower()
    df = ensure_numeric_columns(df, ["has_fatalities", "civilian_targeting", "metrics.article_count"])

    daily = (
        df.groupby(["event_date", "region"], dropna=False)
        .agg(
            gdeltcloud_detail_event_count=("id", "nunique") if "id" in df.columns else ("event_date", "size"),
            gdeltcloud_detail_fatality_event_count=("has_fatalities", "sum"),
            gdeltcloud_civilian_targeting_count=("civilian_targeting", "sum"),
            gdeltcloud_detail_article_count=("metrics.article_count", "sum"),
        )
        .reset_index()
    )
    return daily


def load_iranwarlive_strikes_daily():
    path = RAW_DIR / "iranwarlive_strikes.csv"
    df = read_csv_if_exists(path)
    if df.empty or "Timestamp" not in df.columns:
        return pd.DataFrame(columns=["event_date", "region"])

    df["event_date"] = date_series(df, "Timestamp")
    df["region"] = "iran"
    df = ensure_numeric_columns(df, ["Casualties"])
    daily = (
        df.groupby(["event_date", "region"], dropna=False)
        .agg(
            iranwarlive_strike_count=("Event_ID", "nunique")
            if "Event_ID" in df.columns
            else ("Timestamp", "size"),
            target_iranwarlive_strike_casualties=("Casualties", "sum"),
            target_attack_mortality_rate=("Casualties", "mean"),
        )
        .reset_index()
    )
    return daily


def load_iranwarlive_airspace_daily():
    path = RAW_DIR / "iranwarlive_airspace.csv"
    df = read_csv_if_exists(path)
    if df.empty or "Timestamp" not in df.columns:
        return pd.DataFrame(columns=["event_date", "region"])

    df["event_date"] = date_series(df, "Timestamp")
    df["region"] = df.get("Country", "global").fillna("global").astype(str).str.lower()
    status = df.get("Status", "").fillna("").astype(str).str.lower()
    df["airspace_restriction_flag"] = status.str.contains("closed|restricted|suspended|ban|avoid").astype(int)
    daily = (
        df.groupby(["event_date", "region"], dropna=False)
        .agg(
            iranwarlive_airspace_updates=("Status", "size"),
            iranwarlive_airspace_restrictions=("airspace_restriction_flag", "sum"),
        )
        .reset_index()
    )
    return daily


def load_iranwarlive_feed_daily(file_name, timestamp_column, prefix):
    path = RAW_DIR / file_name
    df = read_json_if_exists(path)
    if df.empty or timestamp_column not in df.columns:
        return pd.DataFrame(columns=["event_date", "region"])

    df["event_date"] = date_series(df, timestamp_column)
    df["region"] = "iran"
    daily = (
        df.groupby(["event_date", "region"], dropna=False)
        .size()
        .reset_index(name=f"{prefix}_event_count")
    )
    return daily


def load_conflictsapp_days_daily():
    path = RAW_DIR / "conflictsapp_days.csv"
    df = read_csv_if_exists(path)
    if df.empty or "day" not in df.columns:
        return pd.DataFrame(columns=["event_date", "region"])

    df["event_date"] = date_series(df, "day")
    df["region"] = "global"
    death_columns = [
        "casualties.us.kia",
        "casualties.israel.kia",
        "casualties.israel.civilians",
        "casualties.iran.killed",
        "casualties.lebanon.killed",
    ]
    df = ensure_numeric_columns(df, ["escalation", *death_columns])
    df["target_conflictsapp_reported_deaths"] = df[death_columns].sum(axis=1)
    df = df.sort_values("event_date")
    df["target_conflictsapp_daily_deaths_estimate"] = (
        df["target_conflictsapp_reported_deaths"].diff().fillna(df["target_conflictsapp_reported_deaths"]).clip(lower=0)
    )

    return df[
        [
            "event_date",
            "region",
            "escalation",
            "target_conflictsapp_reported_deaths",
            "target_conflictsapp_daily_deaths_estimate",
        ]
    ].rename(columns={"escalation": "conflictsapp_escalation"})


def load_conflictsapp_events_daily():
    path = RAW_DIR / "conflictsapp_events.csv"
    df = read_csv_if_exists(path)
    if df.empty or "timestamp" not in df.columns:
        return pd.DataFrame(columns=["event_date", "region"])

    df["event_date"] = date_series(df, "timestamp")
    df["region"] = "global"
    severity = df.get("severity", "").fillna("").astype(str).str.lower()
    event_type = df.get("type", "").fillna("").astype(str).str.lower()
    df["high_severity_flag"] = severity.str.contains("high|critical").astype(int)
    df["military_event_flag"] = event_type.str.contains("military|strike|attack").astype(int)
    if "verified" in df.columns:
        df["verified"] = pd.to_numeric(df["verified"], errors="coerce").fillna(0)
    else:
        df["verified"] = 0

    daily = (
        df.groupby(["event_date", "region"], dropna=False)
        .agg(
            conflictsapp_event_count=("id", "nunique") if "id" in df.columns else ("timestamp", "size"),
            conflictsapp_high_severity_count=("high_severity_flag", "sum"),
            conflictsapp_military_event_count=("military_event_flag", "sum"),
            conflictsapp_verified_count=("verified", "sum"),
        )
        .reset_index()
    )
    return daily


def load_rss_daily():
    frames = []
    for path in sorted(RAW_DIR.glob("rss_*.jsonl")):
        df = read_jsonl_if_exists(path)
        if df.empty:
            continue
        df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce").dt.date
        df["region"] = "global"
        df["urgency_hits"] = pd.to_numeric(df.get("urgency_hits", 0), errors="coerce").fillna(0)
        daily = (
            df.groupby(["event_date", "region"], dropna=False)
            .agg(
                rss_article_count=("title", "size"),
                rss_urgency_score=("urgency_hits", "mean"),
            )
            .reset_index()
        )
        frames.append(daily)
    if not frames:
        return pd.DataFrame(columns=["event_date", "region", "rss_article_count", "rss_urgency_score"])
    return pd.concat(frames, ignore_index=True)


def build_master_table():
    acled = load_acled_daily()
    gdelt = load_gdelt_daily()
    gdeltcloud_summary = load_gdeltcloud_summary_daily()
    gdeltcloud_events = load_gdeltcloud_events_daily()
    iranwarlive_strikes = load_iranwarlive_strikes_daily()
    iranwarlive_airspace = load_iranwarlive_airspace_daily()
    iranwarlive_ground = load_iranwarlive_feed_daily(
        "iranwarlive_ground_feed.json", "timestamp", "iranwarlive_ground"
    )
    iranwarlive_diplomacy = load_iranwarlive_feed_daily(
        "iranwarlive_diplomacy_feed.json", "timestamp", "iranwarlive_diplomacy"
    )
    conflictsapp_days = load_conflictsapp_days_daily()
    conflictsapp_events = load_conflictsapp_events_daily()
    rss = load_rss_daily()

    master = merge_daily_frames(
        [
            acled,
            gdelt,
            gdeltcloud_summary,
            gdeltcloud_events,
            iranwarlive_strikes,
            iranwarlive_airspace,
            iranwarlive_ground,
            iranwarlive_diplomacy,
            conflictsapp_days,
            conflictsapp_events,
        ]
    )
    if not rss.empty:
        rss_global = rss.drop(columns=["region"]).groupby("event_date", as_index=False).sum()
        master = master.merge(rss_global, on="event_date", how="left")

    if master.empty:
        return master

    numeric_columns = [
        "total_fatalities",
        "event_count",
        "gdelt_mentions",
        "gdelt_articles",
        "avg_tone",
        "material_conflict_events",
        "high_conflict_events",
        "rss_article_count",
        "rss_urgency_score",
    ]
    numeric_columns.extend(
        [
            column
            for column in master.columns
            if column not in {"event_date", "region"} and column not in numeric_columns
        ]
    )
    for column in numeric_columns:
        if column not in master.columns:
            master[column] = 0
        master[column] = pd.to_numeric(master[column], errors="coerce").fillna(0)

    if "target_gdeltcloud_fatalities" not in master.columns:
        master["target_gdeltcloud_fatalities"] = 0
    master["target_total_fatalities"] = master["total_fatalities"]
    master.loc[master["target_total_fatalities"].eq(0), "target_total_fatalities"] = master.loc[
        master["target_total_fatalities"].eq(0), "target_gdeltcloud_fatalities"
    ]

    master["target_alert_level"] = pd.cut(
        master["target_total_fatalities"],
        bins=[-1, 0, 10, float("inf")],
        labels=[0, 1, 2],
    ).astype(int)
    master = master.sort_values(["event_date", "region"]).reset_index(drop=True)
    return master


def write_raw_tables(connection):
    for path in sorted(RAW_DIR.glob("*.csv")):
        table_name = path.stem.lower()
        df = make_sqlite_safe_columns(read_csv_if_exists(path))
        df.to_sql(table_name, connection, if_exists="replace", index=False)

    for path in sorted(RAW_DIR.glob("*.jsonl")):
        table_name = path.stem.lower()
        df = make_sqlite_safe_columns(read_jsonl_if_exists(path))
        df.to_sql(table_name, connection, if_exists="replace", index=False)

    for path in sorted(RAW_DIR.glob("*.json")):
        table_name = path.stem.lower()
        df = make_sqlite_safe_columns(read_json_if_exists(path))
        df.to_sql(table_name, connection, if_exists="replace", index=False)


def build_database(db_path=DEFAULT_DB_PATH):
    master = build_master_table()
    event_model = build_event_model_table()
    with sqlite3.connect(db_path) as connection:
        write_raw_tables(connection)
        master.to_sql("master_table", connection, if_exists="replace", index=False)
        event_model.to_sql("event_model_table", connection, if_exists="replace", index=False)

    master_path = PROCESSED_DIR / "master_table.csv"
    event_model_path = PROCESSED_DIR / "event_model_table.csv"
    master.to_csv(master_path, index=False)
    event_model.to_csv(event_model_path, index=False)
    print(f"[ok] SQLite final -> {db_path}")
    print(f"[ok] Master table ({len(master):,} filas) -> {master_path}")
    print(f"[ok] Event model table ({len(event_model):,} filas) -> {event_model_path}")


def parse_args():
    parser = argparse.ArgumentParser(description="Construye la base SQLite final del proyecto.")
    parser.add_argument("--db-path", default=str(DEFAULT_DB_PATH), help="Ruta de salida SQLite.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    build_database(Path(args.db_path))
