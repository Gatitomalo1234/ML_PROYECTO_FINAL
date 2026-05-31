import re
from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
EVENT_TABLE_PATH = PROCESSED_DIR / "event_model_table.csv"


WEAPON_SCORES = {
    "unknown": 0.0,
    "interception_air_defense": 0.5,
    "drone": 1.0,
    "explosive_ied": 1.5,
    "shelling_artillery": 2.0,
    "air_strike": 3.0,
    "missile_rocket": 3.5,
    "chemical": 4.0,
}

TARGET_SCORES = {
    "unknown": 0.0,
    "military": 1.0,
    "infrastructure": 1.5,
    "nuclear": 2.0,
    "urban": 2.5,
    "civilian": 3.0,
}

MODEL_TARGET = "target_msi"

IDENTIFIER_COLUMNS = [
    "event_id",
    "event_date",
    "fatalities",
    "has_fatalities",
    "target_msi",
    "source_url",
    "text",
    "text_clean",
]

MODEL1_FEATURES = [
    "source",
    "country",
    "region",
    "latitude",
    "longitude",
    "actor1",
    "actor2",
    "actor_pair",
    "event_type",
    "sub_event_type",
    "weapon_type",
    "target_type",
    "civilian_targeting",
    "attack_like_event",
    "year",
    "month",
    "day_of_week",
    "past_attacks_7d",
    "past_attacks_30d",
    "past_fatalities_7d",
    "past_fatalities_30d",
    "days_since_last_attack",
    "attacker_category",
    "attacker_is_israel",
    "attacker_is_iran",
    "attacker_is_hezbollah",
    "attacker_is_houthi",
    "attacker_is_us",
]

MODEL2_EXTRA_FEATURES = [
    "is_drone",
    "is_missile",
    "is_airstrike",
    "is_artillery",
    "is_explosive_ied",
    "is_chemical",
    "is_interception",
    "weapon_lethality_score",
    "target_lethality_score",
    "military_severity_score",
]


def clean_text(value):
    text = "" if pd.isna(value) else str(value)
    text = text.lower()
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s/_-]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_string_columns(df, columns):
    df = df.copy()
    for column in columns:
        if column not in df.columns:
            df[column] = "unknown"
        df[column] = df[column].fillna("unknown").astype(str).str.strip()
        df.loc[df[column].eq(""), column] = "unknown"
    return df


def actor_text(row):
    values = [
        row.get("actor1", ""),
        row.get("actor2", ""),
        row.get("text", ""),
        row.get("event_type", ""),
        row.get("sub_event_type", ""),
    ]
    return " ".join("" if pd.isna(value) else str(value).lower() for value in values)


def classify_attacker_category(text):
    text = str(text).lower()
    if any(term in text for term in ["israel", "idf", "united states", " u.s", " us ", "usa", "iran"]):
        return "state"
    if any(term in text for term in ["hezbollah", "houthi", "houthis", "pmf", "irgc"]):
        return "proxy_or_state_aligned"
    if any(term in text for term in ["militia", "armed group", "fighters"]):
        return "militia"
    return "unknown"


def add_actor_features(df):
    df = df.copy()
    combined = df.apply(actor_text, axis=1)
    df["actor_pair"] = (
        df["actor1"].fillna("unknown").astype(str).str.lower().str[:80]
        + " -> "
        + df["actor2"].fillna("unknown").astype(str).str.lower().str[:80]
    )
    df["attacker_category"] = combined.map(classify_attacker_category)
    df["attacker_is_israel"] = combined.str.contains("israel|idf", regex=True).astype(int)
    df["attacker_is_iran"] = combined.str.contains("iran|irgc|tehran", regex=True).astype(int)
    df["attacker_is_hezbollah"] = combined.str.contains("hezbollah", regex=True).astype(int)
    df["attacker_is_houthi"] = combined.str.contains("houthi|houthis", regex=True).astype(int)
    df["attacker_is_us"] = combined.str.contains(
        r"\bunited states\b|\bu\.s\b|\bus\b|\busa\b|american", regex=True
    ).astype(int)
    return df


def add_military_features(df):
    df = df.copy()
    weapon = df["weapon_type"].fillna("unknown").astype(str)
    df["is_drone"] = weapon.eq("drone").astype(int)
    df["is_missile"] = weapon.eq("missile_rocket").astype(int)
    df["is_airstrike"] = weapon.eq("air_strike").astype(int)
    df["is_artillery"] = weapon.eq("shelling_artillery").astype(int)
    df["is_explosive_ied"] = weapon.eq("explosive_ied").astype(int)
    df["is_chemical"] = weapon.eq("chemical").astype(int)
    df["is_interception"] = weapon.eq("interception_air_defense").astype(int)
    df["weapon_lethality_score"] = weapon.map(WEAPON_SCORES).fillna(0.0)
    df["target_lethality_score"] = df["target_type"].fillna("unknown").astype(str).map(TARGET_SCORES).fillna(0.0)
    df["military_severity_score"] = df["weapon_lethality_score"] * df["target_lethality_score"]
    return df


def rolling_history(group):
    group = group.sort_values(["event_date", "event_id"]).copy()
    indexed = group.set_index("event_date")
    attack_series = indexed["attack_like_event"].fillna(0)
    fatality_series = indexed["fatalities"].fillna(0)

    group["past_attacks_7d"] = (
        attack_series.rolling("7D", closed="left").sum().fillna(0).to_numpy()
    )
    group["past_attacks_30d"] = (
        attack_series.rolling("30D", closed="left").sum().fillna(0).to_numpy()
    )
    group["past_fatalities_7d"] = (
        fatality_series.rolling("7D", closed="left").sum().fillna(0).to_numpy()
    )
    group["past_fatalities_30d"] = (
        fatality_series.rolling("30D", closed="left").sum().fillna(0).to_numpy()
    )

    last_attack_date = None
    days_since = []
    for event_date, attack_like in zip(group["event_date"], group["attack_like_event"]):
        if last_attack_date is None:
            days_since.append(999)
        else:
            days_since.append((event_date - last_attack_date).days)
        if attack_like:
            last_attack_date = event_date
    group["days_since_last_attack"] = days_since
    return group


def add_temporal_features(df):
    df = df.copy()
    df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce")
    df = df.dropna(subset=["event_date"]).sort_values(["region", "event_date", "event_id"])
    df["year"] = df["event_date"].dt.year
    df["month"] = df["event_date"].dt.month
    df["day_of_week"] = df["event_date"].dt.dayofweek
    groups = [rolling_history(group) for _, group in df.groupby("region", sort=False)]
    return pd.concat(groups, ignore_index=True)


def prepare_dataset():
    df = pd.read_csv(EVENT_TABLE_PATH)
    df = normalize_string_columns(
        df,
        [
            "source",
            "country",
            "region",
            "actor1",
            "actor2",
            "event_type",
            "sub_event_type",
            "weapon_type",
            "target_type",
            "civilian_targeting",
            "text",
        ],
    )
    df["fatalities"] = pd.to_numeric(df["fatalities"], errors="coerce").fillna(0).clip(lower=0)
    df["target_msi"] = pd.to_numeric(df["target_msi"], errors="coerce").fillna(0)
    df["attack_like_event"] = pd.to_numeric(df["attack_like_event"], errors="coerce").fillna(0).astype(int)
    df["has_fatalities"] = pd.to_numeric(df["has_fatalities"], errors="coerce").fillna(0).astype(int)
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["text_clean"] = df["text"].map(clean_text)

    df = add_actor_features(df)
    df = add_military_features(df)
    df = add_temporal_features(df)

    numeric_fill = [
        "latitude",
        "longitude",
        "past_attacks_7d",
        "past_attacks_30d",
        "past_fatalities_7d",
        "past_fatalities_30d",
        "days_since_last_attack",
    ]
    for column in numeric_fill:
        df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

    df["split_recommended"] = np.where(df["year"] <= 2025, "train_historical", "test_2026")
    return df.reset_index(drop=True)


def write_dataset(path, df, features, include_text=False):
    columns = ["event_id", "event_date", MODEL_TARGET, "fatalities", "split_recommended", *features]
    if include_text:
        columns.append("text_clean")
    columns = [column for column in columns if column in df.columns]
    df[columns].to_csv(path, index=False)


def main():
    df = prepare_dataset()
    attack_like = df[df["attack_like_event"].eq(1)].copy()

    full_path = PROCESSED_DIR / "modeling_event_dataset.csv"
    attack_like_path = PROCESSED_DIR / "modeling_event_attack_like.csv"
    model1_path = PROCESSED_DIR / "model1_structured_dataset.csv"
    model2_path = PROCESSED_DIR / "model2_military_scores_dataset.csv"
    model3_path = PROCESSED_DIR / "model3_text_ready_dataset.csv"

    df.to_csv(full_path, index=False)
    attack_like.to_csv(attack_like_path, index=False)

    model1_features = MODEL1_FEATURES
    model2_features = [*MODEL1_FEATURES, *MODEL2_EXTRA_FEATURES]
    write_dataset(model1_path, attack_like, model1_features)
    write_dataset(model2_path, attack_like, model2_features)
    write_dataset(model3_path, attack_like, model2_features, include_text=True)

    print(f"[ok] Dataset EDA completo ({len(df):,} filas) -> {full_path}")
    print(f"[ok] Dataset attack-like ({len(attack_like):,} filas) -> {attack_like_path}")
    print(f"[ok] Modelo 1 estructurado -> {model1_path}")
    print(f"[ok] Modelo 2 scores militares -> {model2_path}")
    print(f"[ok] Modelo 3 listo para embeddings -> {model3_path}")


if __name__ == "__main__":
    main()
