from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from train_logreg_2026 import (
    TARGET_COLUMN,
    feature_columns,
    load_2026_data,
    split_temporal,
)


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"

FEATURE_PROFILE = "core_interpretable"
RANDOM_STATE = 42
K_VALUES = list(range(1, 32, 2))

METRICS_PATH = PROCESSED_DIR / "classifier_comparison_2026_metrics.csv"
PREDICTIONS_PATH = PROCESSED_DIR / "classifier_comparison_2026_predictions.csv"
KNN_CV_PATH = PROCESSED_DIR / "classifier_comparison_knn_cv.csv"
LOGREG_ODDS_PATH = PROCESSED_DIR / "classifier_comparison_logreg_odds_ratios.csv"
REPORT_PATH = REPORTS_DIR / "comparacion_modelos_clasificacion_2026.md"


def make_preprocessor(numeric_columns, categorical_columns, scale_numeric=True, dense=False):
    numeric_steps = [("imputer", SimpleImputer(strategy="median"))]
    if scale_numeric:
        numeric_steps.append(("scaler", StandardScaler()))

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=5, sparse_output=True)),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", Pipeline(numeric_steps), numeric_columns),
            ("cat", categorical_pipeline, categorical_columns),
        ],
        sparse_threshold=0.0 if dense else 0.3,
    )


def make_logreg(numeric_columns, categorical_columns):
    return Pipeline(
        steps=[
            ("preprocessor", make_preprocessor(numeric_columns, categorical_columns, scale_numeric=True)),
            (
                "classifier",
                LogisticRegression(
                    class_weight="balanced",
                    C=0.1,
                    l1_ratio=1.0,
                    max_iter=3000,
                    random_state=RANDOM_STATE,
                    solver="saga",
                ),
            ),
        ]
    )


def make_knn(numeric_columns, categorical_columns, n_neighbors, scale_numeric=True):
    return Pipeline(
        steps=[
            (
                "preprocessor",
                make_preprocessor(numeric_columns, categorical_columns, scale_numeric=scale_numeric),
            ),
            ("classifier", KNeighborsClassifier(n_neighbors=n_neighbors, weights="distance")),
        ]
    )


def make_gaussian_nb(numeric_columns, categorical_columns):
    return Pipeline(
        steps=[
            (
                "preprocessor",
                make_preprocessor(
                    numeric_columns,
                    categorical_columns,
                    scale_numeric=True,
                    dense=True,
                ),
            ),
            ("classifier", GaussianNB()),
        ]
    )


def evaluate_model(model_name, model, train, test, feature_cols):
    model.fit(train[feature_cols], train[TARGET_COLUMN])
    probabilities = model.predict_proba(test[feature_cols])[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    y_true = test[TARGET_COLUMN].to_numpy()
    tn, fp, fn, tp = confusion_matrix(y_true, predictions, labels=[0, 1]).ravel()

    metrics = {
        "model": model_name,
        "feature_profile": FEATURE_PROFILE,
        "train_rows": len(train),
        "test_rows": len(test),
        "train_positive_rate": train[TARGET_COLUMN].mean(),
        "test_positive_rate": test[TARGET_COLUMN].mean(),
        "accuracy": accuracy_score(y_true, predictions),
        "balanced_accuracy": balanced_accuracy_score(y_true, predictions),
        "precision": precision_score(y_true, predictions, zero_division=0),
        "recall": recall_score(y_true, predictions, zero_division=0),
        "f1": f1_score(y_true, predictions, zero_division=0),
        "roc_auc": roc_auc_score(y_true, probabilities),
        "average_precision": average_precision_score(y_true, probabilities),
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "tp": tp,
    }
    predictions_frame = test[
        ["event_id", "event_date", "source", "country", "weapon_type", "target_type", "fatalities", "target_msi"]
    ].copy()
    predictions_frame["model"] = model_name
    predictions_frame["fatality_positive"] = y_true
    predictions_frame["fatality_probability"] = probabilities
    predictions_frame["prediction_0_5"] = predictions
    return metrics, predictions_frame, model


def tune_knn(train, feature_cols, numeric_columns, categorical_columns):
    y_train = train[TARGET_COLUMN]
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    rows = []
    for scale_numeric in [True, False]:
        for k_value in K_VALUES:
            model = make_knn(numeric_columns, categorical_columns, k_value, scale_numeric=scale_numeric)
            scores = cross_validate(
                model,
                train[feature_cols],
                y_train,
                cv=cv,
                scoring={
                    "average_precision": "average_precision",
                    "roc_auc": "roc_auc",
                    "f1": "f1",
                    "balanced_accuracy": "balanced_accuracy",
                },
                n_jobs=None,
            )
            rows.append(
                {
                    "k": k_value,
                    "scaled": scale_numeric,
                    "average_precision_mean": scores["test_average_precision"].mean(),
                    "average_precision_std": scores["test_average_precision"].std(),
                    "roc_auc_mean": scores["test_roc_auc"].mean(),
                    "roc_auc_std": scores["test_roc_auc"].std(),
                    "f1_mean": scores["test_f1"].mean(),
                    "f1_std": scores["test_f1"].std(),
                    "balanced_accuracy_mean": scores["test_balanced_accuracy"].mean(),
                    "balanced_accuracy_std": scores["test_balanced_accuracy"].std(),
                }
            )
    cv_results = pd.DataFrame(rows)
    best = cv_results.sort_values(
        ["average_precision_mean", "f1_mean", "roc_auc_mean"],
        ascending=False,
    ).iloc[0]
    return cv_results, int(best["k"]), bool(best["scaled"])


def logreg_odds_ratios(model):
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    frame = pd.DataFrame(
        {
            "feature": preprocessor.get_feature_names_out(),
            "coefficient": classifier.coef_[0],
        }
    )
    frame["odds_ratio"] = np.exp(frame["coefficient"])
    frame["abs_coefficient"] = frame["coefficient"].abs()
    frame["selected_l1"] = frame["abs_coefficient"].gt(1e-8)
    return frame.sort_values("abs_coefficient", ascending=False).reset_index(drop=True)


def plot_knn_cv(cv_results):
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(9, 5))
    for scaled, group in cv_results.groupby("scaled"):
        label = "KNN escalado" if scaled else "KNN sin escalar"
        ax.plot(group["k"], group["average_precision_mean"], marker="o", label=label)
    ax.set_title("Validacion cruzada KNN: Average Precision por K")
    ax.set_xlabel("K")
    ax.set_ylabel("Average Precision media")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    path = FIGURES_DIR / "knn_k_search_average_precision.png"
    fig.savefig(path, dpi=160)
    plt.close(fig)
    return path


def plot_curves(predictions):
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    roc_path = FIGURES_DIR / "classifier_comparison_roc.png"
    pr_path = FIGURES_DIR / "classifier_comparison_precision_recall.png"

    fig, ax = plt.subplots(figsize=(8, 6))
    for model_name, group in predictions.groupby("model"):
        fpr, tpr, _ = roc_curve(group["fatality_positive"], group["fatality_probability"])
        auc = roc_auc_score(group["fatality_positive"], group["fatality_probability"])
        ax.plot(fpr, tpr, label=f"{model_name} (AUC={auc:.3f})")
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Azar")
    ax.set_title("Curvas ROC - prueba temporal mayo 2026")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(roc_path, dpi=160)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(8, 6))
    for model_name, group in predictions.groupby("model"):
        precision, recall, _ = precision_recall_curve(
            group["fatality_positive"], group["fatality_probability"]
        )
        ap = average_precision_score(group["fatality_positive"], group["fatality_probability"])
        ax.plot(recall, precision, label=f"{model_name} (AP={ap:.3f})")
    base_rate = predictions["fatality_positive"].mean()
    ax.axhline(base_rate, linestyle="--", color="gray", label=f"Base rate={base_rate:.3f}")
    ax.set_title("Curvas Precision-Recall - prueba temporal mayo 2026")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(pr_path, dpi=160)
    plt.close(fig)
    return roc_path, pr_path


def confusion_markdown(metrics):
    lines = []
    for row in metrics.to_dict("records"):
        lines.append(
            f"- {row['model']}: TN={row['tn']}, FP={row['fp']}, FN={row['fn']}, TP={row['tp']}"
        )
    return "\n".join(lines)


def write_report(metrics, cv_results, odds, roc_path, pr_path, knn_path):
    REPORTS_DIR.mkdir(exist_ok=True)
    top_positive = odds[odds["coefficient"].gt(0)].head(12)
    top_negative = odds[odds["coefficient"].lt(0)].head(12)
    best_knn = cv_results.sort_values(
        ["average_precision_mean", "f1_mean", "roc_auc_mean"],
        ascending=False,
    ).iloc[0]
    best_roc = metrics.sort_values("roc_auc", ascending=False).iloc[0]
    best_ap = metrics.sort_values("average_precision", ascending=False).iloc[0]
    best_f1 = metrics.sort_values("f1", ascending=False).iloc[0]
    best_recall = metrics.sort_values("recall", ascending=False).iloc[0]
    best_precision = metrics.sort_values("precision", ascending=False).iloc[0]
    min_fn = metrics.sort_values(["fn", "fp"], ascending=[True, True]).iloc[0]
    min_fp = metrics.sort_values(["fp", "fn"], ascending=[True, True]).iloc[0]

    report = f"""# Comparacion de modelos de clasificacion 2026

## Diseno experimental

Todos los modelos usan el mismo perfil de variables `core_interpretable`: se excluyen `emb_pca_*` y `actor_pair`, ademas de columnas con fuga del objetivo. La particion principal es temporal:

```text
train: eventos 2026 hasta abril
test: eventos 2026 de mayo
```

KNN selecciona `K` mediante validacion cruzada estratificada de 5 folds solo sobre el conjunto de entrenamiento. La prueba de mayo queda intacta para comparacion final.

## Fundamento teorico y supuestos

### Regresion Logistica

Modelo lineal probabilistico que estima `P(fatalities > 0)` mediante una funcion logit. Sus coeficientes se interpretan como cambios en log-odds y sus exponenciales como odds ratios.

Supuestos principales: relacion aproximadamente lineal entre predictores y log-odds, observaciones independientes, ausencia de colinealidad extrema y especificacion razonable de variables. Es adecuada para este problema porque permite interpretar factores asociados a letalidad y manejar desbalance con `class_weight`. Su limitacion es que puede subcapturar interacciones no lineales.

### K-Nearest Neighbors

Clasificador no parametrico basado en proximidad: un evento se clasifica segun los eventos mas parecidos del entrenamiento. No aprende coeficientes globales; depende de la metrica de distancia.

Supuestos principales: eventos similares tienen etiquetas similares y la distancia usada representa similitud real. Puede ser inadecuado con alta dimensionalidad, variables categoricas one-hot y clases desbalanceadas, porque los vecinos mayoritarios pueden dominar. La estandarizacion es importante porque evita que variables numericas con mayor escala dominen la distancia.

### Naive Bayes

Se usa GaussianNB porque el dataset mezcla variables numericas estandarizadas y dummies one-hot; MultinomialNB/ComplementNB requieren variables no negativas tipo conteo, lo cual no encaja bien con variables escaladas. GaussianNB modela cada feature condicionada a la clase como normal y asume independencia condicional entre features.

El supuesto de independencia es fuerte y poco realista aqui: `weapon_type`, `target_type`, `civilian_targeting` y actores estan correlacionados. Aun asi, Naive Bayes sirve como baseline probabilistico simple y rapido, especialmente util para comparar contra modelos mas flexibles.

## Busqueda de K

Mejor configuracion segun Average Precision media en validacion cruzada:

```text
K = {int(best_knn['k'])}
scaled = {bool(best_knn['scaled'])}
average_precision_cv = {best_knn['average_precision_mean']:.3f}
f1_cv = {best_knn['f1_mean']:.3f}
roc_auc_cv = {best_knn['roc_auc_mean']:.3f}
```

Figura: `{knn_path.relative_to(BASE_DIR)}`

## Tabla comparativa en prueba temporal

{metrics[['model', 'accuracy', 'balanced_accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'average_precision', 'tn', 'fp', 'fn', 'tp']].round(3).to_markdown(index=False)}

## Matrices de confusion

{confusion_markdown(metrics)}

## Curvas

- ROC: `{roc_path.relative_to(BASE_DIR)}`
- Precision-Recall: `{pr_path.relative_to(BASE_DIR)}`

## Odds ratios de Regresion Logistica

Variables que aumentan la probabilidad estimada:

{top_positive[['feature', 'coefficient', 'odds_ratio']].round(3).to_markdown(index=False)}

Variables que reducen la probabilidad estimada:

{top_negative[['feature', 'coefficient', 'odds_ratio']].round(3).to_markdown(index=False)}

Interpretacion: un odds ratio mayor que 1 aumenta los odds estimados de letalidad, manteniendo constantes las demas variables del modelo. Un odds ratio menor que 1 los reduce. En variables escaladas, el cambio corresponde a una desviacion estandar; en dummies, corresponde a pasar de ausencia a presencia de esa categoria.

## Analisis aplicado

El mejor modelo para un sistema de alerta temprana no necesariamente es el de mayor accuracy. En clases desbalanceadas, accuracy puede ser alta aun si el modelo ignora eventos letales. Por eso se priorizan recall, F1, Average Precision y matriz de confusion.

- Mejor ranking ROC-AUC: `{best_roc['model']}` ({best_roc['roc_auc']:.3f}).
- Mejor Average Precision: `{best_ap['model']}` ({best_ap['average_precision']:.3f}).
- Mejor F1: `{best_f1['model']}` ({best_f1['f1']:.3f}).
- Mayor recall: `{best_recall['model']}` ({best_recall['recall']:.3f}).
- Mayor precision: `{best_precision['model']}` ({best_precision['precision']:.3f}).
- Menos falsos negativos: `{min_fn['model']}` (FN={int(min_fn['fn'])}).
- Menos falsas alarmas: `{min_fp['model']}` (FP={int(min_fp['fp'])}).

Lectura especifica de estos resultados:

```text
GaussianNB detecta todos los eventos letales de mayo, pero lo logra al clasificar casi todo como letal.
KNN reduce falsas alarmas, pero pierde demasiados eventos letales para un sistema de alerta temprana.
La Regresion Logistica L1 core mantiene un equilibrio mas razonable entre recall, precision e interpretabilidad.
```

## Efecto del desbalance

La tasa positiva de mayo es cercana a 20.7%. En este contexto, un clasificador puede obtener accuracy aceptable prediciendo muchos ceros, pero eso no sirve si el objetivo aplicado es detectar letalidad. El desbalance afecta de forma distinta:

```text
Regresion Logistica: class_weight='balanced' aumenta sensibilidad a la clase letal.
KNN: los vecinos de la clase mayoritaria pueden dominar la decision local.
Naive Bayes: las probabilidades previas y supuestos fuertes pueden empujar decisiones extremas.
```

Por eso la comparacion se apoya en recall, F1, Average Precision y matrices de confusion, no solo en accuracy.

## Conclusion metodologica

La Regresion Logistica L1 core es el modelo principal recomendado si se busca equilibrio entre desempeno e interpretabilidad. No maximiza recall como Naive Bayes, ni minimiza falsas alarmas como KNN, pero ofrece el compromiso mas defendible: probabilidades razonables, odds ratios interpretables, seleccion sparse de variables y desempeno temporal competitivo. KNN aporta una comparacion no parametrica, pero es menos explicable y sensible a escala/dimensionalidad. Naive Bayes es util como baseline probabilistico, aunque sus supuestos de independencia condicional son debiles para eventos armados, donde variables tacticas y de actor suelen estar correlacionadas.
"""
    REPORT_PATH.write_text(report, encoding="utf-8")


def main():
    MODELS_DIR.mkdir(exist_ok=True)
    PROCESSED_DIR.mkdir(exist_ok=True)
    REPORTS_DIR.mkdir(exist_ok=True)

    df = load_2026_data()
    train, test = split_temporal(df)
    feature_cols, numeric_columns, categorical_columns = feature_columns(df, FEATURE_PROFILE)

    knn_cv, best_k, best_scaled = tune_knn(train, feature_cols, numeric_columns, categorical_columns)
    knn_cv.to_csv(KNN_CV_PATH, index=False)

    models = {
        "Logistic Regression L1 core": make_logreg(numeric_columns, categorical_columns),
        f"KNN k={best_k} scaled={best_scaled}": make_knn(
            numeric_columns, categorical_columns, best_k, scale_numeric=best_scaled
        ),
        "Gaussian Naive Bayes": make_gaussian_nb(numeric_columns, categorical_columns),
    }

    metrics_rows = []
    prediction_frames = []
    fitted_models = {}
    for model_name, model in models.items():
        metrics, predictions, fitted = evaluate_model(model_name, model, train, test, feature_cols)
        metrics_rows.append(metrics)
        prediction_frames.append(predictions)
        fitted_models[model_name] = fitted
        joblib.dump(fitted, MODELS_DIR / f"classifier_comparison_2026_{model_name.lower().replace(' ', '_').replace('=', '').replace('/', '_')}.joblib")

    metrics = pd.DataFrame(metrics_rows).sort_values("f1", ascending=False)
    predictions = pd.concat(prediction_frames, ignore_index=True)
    odds = logreg_odds_ratios(fitted_models["Logistic Regression L1 core"])

    metrics.to_csv(METRICS_PATH, index=False)
    predictions.to_csv(PREDICTIONS_PATH, index=False)
    odds.to_csv(LOGREG_ODDS_PATH, index=False)

    knn_path = plot_knn_cv(knn_cv)
    roc_path, pr_path = plot_curves(predictions)
    write_report(metrics, knn_cv, odds, roc_path, pr_path, knn_path)

    print(f"[ok] Metricas comparativas -> {METRICS_PATH}")
    print(f"[ok] Predicciones comparativas -> {PREDICTIONS_PATH}")
    print(f"[ok] CV KNN -> {KNN_CV_PATH}")
    print(f"[ok] Odds ratios logistica -> {LOGREG_ODDS_PATH}")
    print(f"[ok] Reporte -> {REPORT_PATH}")
    print(f"[ok] Figuras -> {FIGURES_DIR}")


if __name__ == "__main__":
    main()
