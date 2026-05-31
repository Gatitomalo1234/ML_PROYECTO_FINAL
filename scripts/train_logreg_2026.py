from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"

INPUT_PATH = PROCESSED_DIR / "model3_embeddings_dataset.csv"
METRICS_PATH = PROCESSED_DIR / "logreg_2026_metrics.csv"
PREDICTIONS_PATH = PROCESSED_DIR / "logreg_2026_predictions.csv"
COEFFICIENTS_PATH = PROCESSED_DIR / "logreg_2026_feature_coefficients.csv"
SELECTED_FEATURES_PATH = PROCESSED_DIR / "logreg_2026_l1_selected_features.csv"
MODEL_PATH_TEMPLATE = "logreg_2026_fatality_classifier_{variant}.joblib"

TARGET_COLUMN = "fatality_positive"
DATE_COLUMN = "event_date"

LEAKAGE_COLUMNS = {
    "event_id",
    "event_date",
    "fatalities",
    "target_msi",
    "has_fatalities",
    "split_recommended",
    "text_clean",
    TARGET_COLUMN,
}

FEATURE_PROFILES = {
    "full": set(),
    "core_interpretable": {"actor_pair"},
}


def load_2026_data():
    df = pd.read_csv(INPUT_PATH, low_memory=False)
    df[DATE_COLUMN] = pd.to_datetime(df[DATE_COLUMN], errors="coerce")
    df = df[df[DATE_COLUMN].dt.year.eq(2026)].copy()
    df = df.dropna(subset=[DATE_COLUMN])
    df[TARGET_COLUMN] = (pd.to_numeric(df["fatalities"], errors="coerce").fillna(0) > 0).astype(int)
    return df.sort_values(DATE_COLUMN).reset_index(drop=True)


def split_temporal(df):
    train = df[df[DATE_COLUMN] < "2026-05-01"].copy()
    test = df[df[DATE_COLUMN] >= "2026-05-01"].copy()
    return train, test


def split_random(df):
    train, test = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df[TARGET_COLUMN],
    )
    return train.copy(), test.copy()


def feature_columns(df, feature_profile="full"):
    excluded = set(LEAKAGE_COLUMNS)
    excluded.update(FEATURE_PROFILES[feature_profile])
    columns = [
        column
        for column in df.columns
        if column not in excluded and not (feature_profile == "core_interpretable" and column.startswith("emb_pca_"))
    ]
    numeric_columns = [
        column for column in columns if pd.api.types.is_numeric_dtype(df[column])
    ]
    categorical_columns = [column for column in columns if column not in numeric_columns]
    return columns, numeric_columns, categorical_columns


def make_pipeline(numeric_columns, categorical_columns, class_weight, c_value=1.0, l1_ratio=0.0):
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            (
                "onehot",
                OneHotEncoder(handle_unknown="ignore", min_frequency=5, sparse_output=True),
            ),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_columns),
            ("cat", categorical_pipeline, categorical_columns),
        ]
    )
    classifier = LogisticRegression(
        class_weight=class_weight,
        max_iter=3000,
        solver="saga",
        C=c_value,
        l1_ratio=l1_ratio,
        random_state=42,
    )
    return Pipeline(steps=[("preprocessor", preprocessor), ("classifier", classifier)])


def evaluate_split(name, variant, feature_profile, model, train, test, feature_cols):
    model.fit(train[feature_cols], train[TARGET_COLUMN])
    probabilities = model.predict_proba(test[feature_cols])[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    y_true = test[TARGET_COLUMN].to_numpy()
    tn, fp, fn, tp = confusion_matrix(y_true, predictions, labels=[0, 1]).ravel()
    coefficients = model.named_steps["classifier"].coef_[0]
    total_features = len(coefficients)
    nonzero_features = int(np.count_nonzero(np.abs(coefficients) > 1e-8))

    metrics = {
        "split": name,
        "variant": variant,
        "feature_profile": feature_profile,
        "train_rows": len(train),
        "test_rows": len(test),
        "train_positive_rate": train[TARGET_COLUMN].mean(),
        "test_positive_rate": test[TARGET_COLUMN].mean(),
        "roc_auc": roc_auc_score(y_true, probabilities),
        "average_precision": average_precision_score(y_true, probabilities),
        "brier_score": brier_score_loss(y_true, probabilities),
        "accuracy": accuracy_score(y_true, predictions),
        "balanced_accuracy": balanced_accuracy_score(y_true, predictions),
        "precision": precision_score(y_true, predictions, zero_division=0),
        "recall": recall_score(y_true, predictions, zero_division=0),
        "f1": f1_score(y_true, predictions, zero_division=0),
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "tp": tp,
        "total_features_after_encoding": total_features,
        "nonzero_features": nonzero_features,
        "zeroed_features": total_features - nonzero_features,
        "nonzero_feature_rate": nonzero_features / total_features,
    }

    prediction_frame = test[
        ["event_id", "event_date", "source", "country", "weapon_type", "target_type", "fatalities", "target_msi"]
    ].copy()
    prediction_frame["split"] = name
    prediction_frame["variant"] = variant
    prediction_frame["feature_profile"] = feature_profile
    prediction_frame["fatality_positive"] = y_true
    prediction_frame["fatality_probability"] = probabilities
    prediction_frame["prediction_0_5"] = predictions
    return metrics, prediction_frame


def coefficients_frame(variant, model, numeric_columns, categorical_columns, config):
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    feature_names = preprocessor.get_feature_names_out()
    coefficients = classifier.coef_[0]
    frame = pd.DataFrame(
        {
            "variant": variant,
            "feature_profile": config["feature_profile"],
            "c_value": config["c_value"],
            "l1_ratio": config["l1_ratio"],
            "class_weight": config["class_weight"] or "none",
            "feature": feature_names,
            "coefficient": coefficients,
            "odds_ratio": np.exp(coefficients),
        }
    )
    frame["abs_coefficient"] = frame["coefficient"].abs()
    frame["selected_l1"] = frame["abs_coefficient"].gt(1e-8)
    frame = frame.sort_values("abs_coefficient", ascending=False).reset_index(drop=True)
    frame["numeric_feature_count"] = len(numeric_columns)
    frame["categorical_feature_count"] = len(categorical_columns)
    return frame


def main():
    df = load_2026_data()

    temporal_train, temporal_test = split_temporal(df)
    random_train, random_test = split_random(df)

    metrics = []
    predictions = []
    MODELS_DIR.mkdir(exist_ok=True)

    variants = [
        {
            "name": "logreg_l2_balanced",
            "feature_profile": "full",
            "class_weight": "balanced",
            "c_value": 1.0,
            "l1_ratio": 0.0,
        },
        {
            "name": "logreg_l2_unweighted",
            "feature_profile": "full",
            "class_weight": None,
            "c_value": 1.0,
            "l1_ratio": 0.0,
        },
        {
            "name": "logreg_l1_balanced_c1",
            "feature_profile": "full",
            "class_weight": "balanced",
            "c_value": 1.0,
            "l1_ratio": 1.0,
        },
        {
            "name": "logreg_l1_unweighted_c1",
            "feature_profile": "full",
            "class_weight": None,
            "c_value": 1.0,
            "l1_ratio": 1.0,
        },
        {
            "name": "logreg_l1_balanced_c03",
            "feature_profile": "full",
            "class_weight": "balanced",
            "c_value": 0.3,
            "l1_ratio": 1.0,
        },
        {
            "name": "logreg_l1_unweighted_c03",
            "feature_profile": "full",
            "class_weight": None,
            "c_value": 0.3,
            "l1_ratio": 1.0,
        },
        {
            "name": "logreg_l1_balanced_c01",
            "feature_profile": "full",
            "class_weight": "balanced",
            "c_value": 0.1,
            "l1_ratio": 1.0,
        },
        {
            "name": "logreg_l1_unweighted_c01",
            "feature_profile": "full",
            "class_weight": None,
            "c_value": 0.1,
            "l1_ratio": 1.0,
        },
        {
            "name": "logreg_core_l1_balanced_c01",
            "feature_profile": "core_interpretable",
            "class_weight": "balanced",
            "c_value": 0.1,
            "l1_ratio": 1.0,
        },
        {
            "name": "logreg_core_l1_unweighted_c01",
            "feature_profile": "core_interpretable",
            "class_weight": None,
            "c_value": 0.1,
            "l1_ratio": 1.0,
        },
    ]
    coefficient_frames = []
    for config in variants:
        variant = config["name"]
        feature_profile = config["feature_profile"]
        feature_cols, numeric_columns, categorical_columns = feature_columns(df, feature_profile)
        model = make_pipeline(
            numeric_columns,
            categorical_columns,
            config["class_weight"],
            config["c_value"],
            config["l1_ratio"],
        )
        temporal_metrics, temporal_predictions = evaluate_split(
            "temporal_train_until_apr_test_may",
            variant,
            feature_profile,
            model,
            temporal_train,
            temporal_test,
            feature_cols,
        )
        temporal_metrics["c_value"] = config["c_value"]
        temporal_metrics["l1_ratio"] = config["l1_ratio"]
        temporal_metrics["class_weight"] = config["class_weight"] or "none"
        metrics.append(temporal_metrics)
        predictions.append(temporal_predictions)
        coefficient_frames.append(
            coefficients_frame(variant, model, numeric_columns, categorical_columns, config)
        )
        joblib.dump(model, MODELS_DIR / MODEL_PATH_TEMPLATE.format(variant=variant))

        random_model = make_pipeline(
            numeric_columns,
            categorical_columns,
            config["class_weight"],
            config["c_value"],
            config["l1_ratio"],
        )
        random_metrics, random_predictions = evaluate_split(
            "random_stratified_80_20",
            variant,
            feature_profile,
            random_model,
            random_train,
            random_test,
            feature_cols,
        )
        random_metrics["c_value"] = config["c_value"]
        random_metrics["l1_ratio"] = config["l1_ratio"]
        random_metrics["class_weight"] = config["class_weight"] or "none"
        metrics.append(random_metrics)
        predictions.append(random_predictions)

    pd.DataFrame(metrics).to_csv(METRICS_PATH, index=False)
    pd.concat(predictions, ignore_index=True).to_csv(PREDICTIONS_PATH, index=False)
    coefficients = pd.concat(coefficient_frames, ignore_index=True)
    coefficients.to_csv(COEFFICIENTS_PATH, index=False)
    coefficients[
        coefficients["l1_ratio"].eq(1.0) & coefficients["selected_l1"]
    ].to_csv(SELECTED_FEATURES_PATH, index=False)

    print(f"[ok] Metricas -> {METRICS_PATH}")
    print(f"[ok] Predicciones -> {PREDICTIONS_PATH}")
    print(f"[ok] Coeficientes de modelos temporales -> {COEFFICIENTS_PATH}")
    print(f"[ok] Features seleccionadas por L1 -> {SELECTED_FEATURES_PATH}")
    print(f"[ok] Modelos temporales -> {MODELS_DIR}")


if __name__ == "__main__":
    main()
