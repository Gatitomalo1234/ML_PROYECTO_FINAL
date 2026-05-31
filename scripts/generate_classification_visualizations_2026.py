from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_curve,
    roc_auc_score,
)

from train_logreg_2026 import TARGET_COLUMN, feature_columns, load_2026_data, split_temporal


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
FIGURES_DIR = REPORTS_DIR / "figures" / "classification_visuals_2026"

METRICS_PATH = PROCESSED_DIR / "classifier_comparison_2026_metrics.csv"
PREDICTIONS_PATH = PROCESSED_DIR / "classifier_comparison_2026_predictions.csv"
KNN_CV_PATH = PROCESSED_DIR / "classifier_comparison_knn_cv.csv"
ODDS_PATH = PROCESSED_DIR / "classifier_comparison_logreg_odds_ratios.csv"
GUIDE_PATH = REPORTS_DIR / "guia_visualizaciones_clasificacion_2026.md"

MODEL_PATHS = {
    "Logistic Regression L1 core": MODELS_DIR / "classifier_comparison_2026_logistic_regression_l1_core.joblib",
    "KNN k=15 scaled=True": MODELS_DIR / "classifier_comparison_2026_knn_k15_scaledtrue.joblib",
    "Gaussian Naive Bayes": MODELS_DIR / "classifier_comparison_2026_gaussian_naive_bayes.joblib",
}

MODEL_ORDER = [
    "Logistic Regression L1 core",
    "KNN k=15 scaled=True",
    "Gaussian Naive Bayes",
]

PALETTE = {
    "Logistic Regression L1 core": "#1b9e77",
    "KNN k=15 scaled=True": "#7570b3",
    "Gaussian Naive Bayes": "#d95f02",
}


def setup_style():
    plt.rcParams.update(
        {
            "figure.dpi": 120,
            "savefig.dpi": 180,
            "font.size": 10,
            "axes.titlesize": 12,
            "axes.labelsize": 10,
            "legend.fontsize": 9,
            "xtick.labelsize": 9,
            "ytick.labelsize": 9,
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )


def clean_feature_name(name):
    return (
        name.replace("num__", "")
        .replace("cat__", "")
        .replace("_infrequent_sklearn", "_infrequent")
        .replace("_", " ")
    )


def savefig(fig, filename):
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIGURES_DIR / filename
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return path


def load_inputs():
    metrics = pd.read_csv(METRICS_PATH)
    predictions = pd.read_csv(PREDICTIONS_PATH)
    knn_cv = pd.read_csv(KNN_CV_PATH)
    odds = pd.read_csv(ODDS_PATH)
    metrics["model"] = pd.Categorical(metrics["model"], MODEL_ORDER, ordered=True)
    metrics = metrics.sort_values("model").reset_index(drop=True)
    return metrics, predictions, knn_cv, odds


def plot_metrics_table(metrics):
    columns = ["model", "accuracy", "precision", "recall", "f1", "roc_auc", "average_precision"]
    table = metrics[columns].copy()
    table.to_csv(PROCESSED_DIR / "classification_visual_metrics_table.csv", index=False)

    fig, ax = plt.subplots(figsize=(11, 2.5))
    ax.axis("off")
    display = table.copy()
    metric_cols = [column for column in display.columns if column != "model"]
    display[metric_cols] = display[metric_cols].round(3)
    mpl_table = ax.table(
        cellText=display.values,
        colLabels=["Modelo", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC", "Avg. Precision"],
        cellLoc="center",
        loc="center",
    )
    mpl_table.auto_set_font_size(False)
    mpl_table.set_fontsize(9)
    mpl_table.scale(1, 1.5)
    for (row, _), cell in mpl_table.get_celld().items():
        if row == 0:
            cell.set_text_props(weight="bold")
            cell.set_facecolor("#eeeeee")
    ax.set_title("Comparacion global de metricas en prueba temporal")
    return savefig(fig, "01_tabla_metricas_modelos.png")


def plot_metrics_bars(metrics):
    metric_cols = ["accuracy", "precision", "recall", "f1", "roc_auc", "average_precision"]
    labels = ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC", "Avg. Precision"]
    x = np.arange(len(metric_cols))
    width = 0.24

    fig, ax = plt.subplots(figsize=(10, 5))
    for i, model_name in enumerate(MODEL_ORDER):
        row = metrics[metrics["model"].astype(str).eq(model_name)].iloc[0]
        ax.bar(
            x + (i - 1) * width,
            row[metric_cols].to_numpy(dtype=float),
            width=width,
            label=model_name,
            color=PALETTE[model_name],
        )
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Valor de la metrica")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=25, ha="right")
    ax.set_title("Comparacion global de desempeno por metrica")
    ax.legend(frameon=False)
    ax.grid(axis="y", alpha=0.25)
    return savefig(fig, "02_barras_metricas_modelos.png")


def plot_roc_curves(predictions):
    fig, ax = plt.subplots(figsize=(7, 6))
    for model_name in MODEL_ORDER:
        group = predictions[predictions["model"].eq(model_name)]
        fpr, tpr, _ = roc_curve(group["fatality_positive"], group["fatality_probability"])
        auc = roc_auc_score(group["fatality_positive"], group["fatality_probability"])
        ax.plot(fpr, tpr, lw=2, color=PALETTE[model_name], label=f"{model_name} (AUC={auc:.3f})")
    ax.plot([0, 1], [0, 1], ls="--", color="#777777", lw=1, label="Azar")
    ax.set_xlabel("Tasa de falsos positivos")
    ax.set_ylabel("Tasa de verdaderos positivos")
    ax.set_title("Capacidad discriminativa: curvas ROC")
    ax.legend(frameon=False)
    ax.grid(alpha=0.25)
    return savefig(fig, "03_curvas_roc_modelos.png")


def plot_precision_recall_curves(predictions):
    fig, ax = plt.subplots(figsize=(7, 6))
    base_rate = predictions["fatality_positive"].mean()
    for model_name in MODEL_ORDER:
        group = predictions[predictions["model"].eq(model_name)]
        precision, recall, _ = precision_recall_curve(
            group["fatality_positive"], group["fatality_probability"]
        )
        ap = average_precision_score(group["fatality_positive"], group["fatality_probability"])
        ax.plot(recall, precision, lw=2, color=PALETTE[model_name], label=f"{model_name} (AP={ap:.3f})")
    ax.axhline(base_rate, ls="--", color="#777777", lw=1, label=f"Tasa base={base_rate:.3f}")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Capacidad discriminativa con clase desbalanceada: Precision-Recall")
    ax.legend(frameon=False)
    ax.grid(alpha=0.25)
    return savefig(fig, "04_curvas_precision_recall_modelos.png")


def plot_normalized_confusion(metrics):
    fig, axes = plt.subplots(1, 3, figsize=(11, 3.7))
    for ax, model_name in zip(axes, MODEL_ORDER):
        row = metrics[metrics["model"].astype(str).eq(model_name)].iloc[0]
        matrix = np.array([[row["tn"], row["fp"]], [row["fn"], row["tp"]]], dtype=float)
        normalized = matrix / matrix.sum(axis=1, keepdims=True)
        image = ax.imshow(normalized, cmap="Blues", vmin=0, vmax=1)
        ax.set_title(model_name)
        ax.set_xticks([0, 1], labels=["Pred. no letal", "Pred. letal"], rotation=20, ha="right")
        ax.set_yticks([0, 1], labels=["Real no letal", "Real letal"])
        for i in range(2):
            for j in range(2):
                ax.text(
                    j,
                    i,
                    f"{normalized[i, j]:.1%}\n(n={int(matrix[i, j])})",
                    ha="center",
                    va="center",
                    color="white" if normalized[i, j] > 0.5 else "black",
                    fontsize=9,
                )
    fig.colorbar(image, ax=axes, fraction=0.025, pad=0.02)
    fig.suptitle("Matrices de confusion normalizadas por clase real", y=1.02)
    return savefig(fig, "05_matrices_confusion_normalizadas.png")


def plot_fp_fn(metrics):
    x = np.arange(len(MODEL_ORDER))
    width = 0.35
    ordered = metrics.set_index(metrics["model"].astype(str)).loc[MODEL_ORDER]

    fig, ax = plt.subplots(figsize=(8, 4.8))
    ax.bar(x - width / 2, ordered["fp"], width=width, color="#e7298a", label="Falsos positivos")
    ax.bar(x + width / 2, ordered["fn"], width=width, color="#66a61e", label="Falsos negativos")
    ax.set_ylabel("Numero de eventos")
    ax.set_xticks(x)
    ax.set_xticklabels(MODEL_ORDER, rotation=20, ha="right")
    ax.set_title("Costo operativo del error: falsas alarmas vs eventos letales omitidos")
    ax.legend(frameon=False)
    ax.grid(axis="y", alpha=0.25)
    return savefig(fig, "06_falsos_positivos_falsos_negativos.png")


def plot_logreg_coefficients(odds, top_n=16):
    top = odds.sort_values("abs_coefficient", ascending=False).head(top_n).copy()
    top = top.sort_values("coefficient")
    colors = np.where(top["coefficient"] >= 0, "#1b9e77", "#d95f02")

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(top["feature"].map(clean_feature_name), top["coefficient"], color=colors)
    ax.axvline(0, color="#555555", lw=1)
    ax.set_xlabel("Coeficiente logistico")
    ax.set_title("Regresion Logistica: ranking de coeficientes principales")
    ax.grid(axis="x", alpha=0.25)
    return savefig(fig, "07_logreg_ranking_coeficientes.png")


def plot_logreg_odds_ratios(odds, top_n=16):
    top = odds.sort_values("abs_coefficient", ascending=False).head(top_n).copy()
    top = top.sort_values("odds_ratio")
    colors = np.where(top["odds_ratio"] >= 1, "#1b9e77", "#d95f02")

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(top["feature"].map(clean_feature_name), top["odds_ratio"], color=colors)
    ax.axvline(1, color="#555555", lw=1)
    ax.set_xscale("log")
    ax.set_xlabel("Odds ratio, escala log")
    ax.set_title("Regresion Logistica: odds ratios de variables principales")
    ax.grid(axis="x", alpha=0.25)
    return savefig(fig, "08_logreg_odds_ratios.png")


def plot_knn_sensitivity(knn_cv):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), sharex=True)
    for scaled, group in knn_cv.groupby("scaled"):
        group = group.sort_values("k")
        label = "Escalado" if scaled else "Sin escalar"
        axes[0].plot(group["k"], group["average_precision_mean"], marker="o", label=label)
        axes[0].fill_between(
            group["k"],
            group["average_precision_mean"] - group["average_precision_std"],
            group["average_precision_mean"] + group["average_precision_std"],
            alpha=0.12,
        )
        axes[1].plot(group["k"], group["roc_auc_mean"], marker="o", label=f"ROC-AUC {label}")
        axes[1].plot(group["k"], group["f1_mean"], marker="s", ls="--", label=f"F1 {label}")

    best = knn_cv.sort_values(["average_precision_mean", "f1_mean", "roc_auc_mean"], ascending=False).iloc[0]
    axes[0].axvline(best["k"], color="#555555", ls="--", lw=1)
    axes[1].axvline(best["k"], color="#555555", ls="--", lw=1)
    axes[0].set_title("Curva de seleccion de K por Average Precision")
    axes[1].set_title("Sensibilidad de ROC-AUC y F1 al hiperparametro K")
    for ax in axes:
        ax.set_xlabel("Numero de vecinos K")
        ax.set_ylabel("Metrica media CV")
        ax.grid(alpha=0.25)
        ax.legend(frameon=False)
    return savefig(fig, "09_knn_sensibilidad_k.png")


def get_nb_feature_separation(top_n=18):
    model = joblib.load(MODEL_PATHS["Gaussian Naive Bayes"])
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    feature_names = preprocessor.get_feature_names_out()
    theta = classifier.theta_
    var = classifier.var_
    separation = np.abs(theta[1] - theta[0]) / np.sqrt((var[1] + var[0]) / 2)
    frame = pd.DataFrame(
        {
            "feature": feature_names,
            "class0_mean": theta[0],
            "class1_mean": theta[1],
            "relative_importance": separation,
        }
    ).sort_values("relative_importance", ascending=False)
    return frame.head(top_n), model


def plot_nb_importance():
    top, _ = get_nb_feature_separation()
    top = top.sort_values("relative_importance")
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(top["feature"].map(clean_feature_name), top["relative_importance"], color="#d95f02")
    ax.set_xlabel("Separacion estandarizada entre clases")
    ax.set_title("Naive Bayes: importancia relativa por separacion de medias")
    ax.grid(axis="x", alpha=0.25)
    return savefig(fig, "10_naive_bayes_importancia_relativa.png")


def transformed_train_matrix(model):
    df = load_2026_data()
    train, _ = split_temporal(df)
    feature_cols, _, _ = feature_columns(df, "core_interpretable")
    x_train = model.named_steps["preprocessor"].transform(train[feature_cols])
    if hasattr(x_train, "toarray"):
        x_train = x_train.toarray()
    feature_names = model.named_steps["preprocessor"].get_feature_names_out()
    return pd.DataFrame(x_train, columns=feature_names), train[TARGET_COLUMN].reset_index(drop=True)


def plot_nb_key_distributions():
    top, model = get_nb_feature_separation(top_n=30)
    x_train, y_train = transformed_train_matrix(model)
    numeric_top = [feature for feature in top["feature"] if feature.startswith("num__")][:4]
    if len(numeric_top) < 4:
        numeric_top = top["feature"].head(4).tolist()

    fig, axes = plt.subplots(2, 2, figsize=(10, 7))
    axes = axes.ravel()
    for ax, feature in zip(axes, numeric_top):
        for class_value, label, color in [(0, "No letal", "#4c78a8"), (1, "Letal", "#f58518")]:
            values = x_train.loc[y_train.eq(class_value), feature]
            ax.hist(values, bins=25, density=True, alpha=0.45, label=label, color=color)
        ax.set_title(clean_feature_name(feature))
        ax.set_ylabel("Densidad")
        ax.grid(axis="y", alpha=0.2)
    axes[0].legend(frameon=False)
    fig.suptitle("Naive Bayes: distribuciones de variables clave por clase", y=1.02)
    return savefig(fig, "11_naive_bayes_distribuciones_variables_clave.png")


def plot_nb_conditional_correlations():
    top, model = get_nb_feature_separation(top_n=10)
    x_train, y_train = transformed_train_matrix(model)
    features = top["feature"].head(8).tolist()

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.8))
    for ax, class_value, title in zip(axes, [0, 1], ["Clase no letal", "Clase letal"]):
        corr = x_train.loc[y_train.eq(class_value), features].corr().fillna(0).to_numpy()
        image = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
        labels = [clean_feature_name(feature) for feature in features]
        ax.set_xticks(range(len(features)), labels=labels, rotation=45, ha="right")
        ax.set_yticks(range(len(features)), labels=labels)
        ax.set_title(title)
    fig.colorbar(image, ax=axes, fraction=0.025, pad=0.02)
    fig.suptitle("Evidencia visual sobre independencia condicional en Naive Bayes", y=1.02)
    return savefig(fig, "12_naive_bayes_correlaciones_condicionales.png")


def plot_probability_distributions(predictions):
    fig, axes = plt.subplots(1, 3, figsize=(12, 4), sharey=True)
    for ax, model_name in zip(axes, MODEL_ORDER):
        group = predictions[predictions["model"].eq(model_name)]
        for class_value, label, color in [(0, "No letal", "#4c78a8"), (1, "Letal", "#f58518")]:
            values = group.loc[group["fatality_positive"].eq(class_value), "fatality_probability"]
            ax.hist(values, bins=np.linspace(0, 1, 21), density=True, alpha=0.45, label=label, color=color)
        ax.axvline(0.5, color="#555555", ls="--", lw=1)
        ax.set_title(model_name)
        ax.set_xlabel("Probabilidad predicha")
        ax.grid(axis="y", alpha=0.2)
    axes[0].set_ylabel("Densidad")
    axes[0].legend(frameon=False)
    fig.suptitle("Distribucion de probabilidades predichas por clase real", y=1.03)
    return savefig(fig, "13_distribucion_probabilidades_predichas.png")


def plot_threshold_analysis(predictions):
    thresholds = np.linspace(0.05, 0.95, 91)
    fig, axes = plt.subplots(1, 3, figsize=(12, 4), sharey=True)
    for ax, model_name in zip(axes, MODEL_ORDER):
        group = predictions[predictions["model"].eq(model_name)]
        y_true = group["fatality_positive"].to_numpy()
        probs = group["fatality_probability"].to_numpy()
        rows = []
        for threshold in thresholds:
            pred = (probs >= threshold).astype(int)
            rows.append(
                {
                    "threshold": threshold,
                    "precision": precision_score(y_true, pred, zero_division=0),
                    "recall": recall_score(y_true, pred, zero_division=0),
                    "f1": f1_score(y_true, pred, zero_division=0),
                }
            )
        frame = pd.DataFrame(rows)
        ax.plot(frame["threshold"], frame["precision"], label="Precision", color="#4c78a8")
        ax.plot(frame["threshold"], frame["recall"], label="Recall", color="#f58518")
        ax.plot(frame["threshold"], frame["f1"], label="F1", color="#54a24b")
        ax.axvline(0.5, color="#555555", ls="--", lw=1)
        ax.set_title(model_name)
        ax.set_xlabel("Umbral")
        ax.grid(alpha=0.25)
    axes[0].set_ylabel("Valor de metrica")
    axes[0].legend(frameon=False)
    fig.suptitle("Analisis visual del umbral de clasificacion", y=1.03)
    return savefig(fig, "14_analisis_umbral_clasificacion.png")


def plot_final_summary(metrics):
    score_cols = ["f1", "roc_auc", "average_precision", "balanced_accuracy"]
    display_names = ["F1", "ROC-AUC", "Avg. Precision", "Balanced Acc."]
    normalized = metrics.set_index(metrics["model"].astype(str)).loc[MODEL_ORDER, score_cols]

    fig, ax = plt.subplots(figsize=(8, 4.8))
    image = ax.imshow(normalized.to_numpy(dtype=float), cmap="YlGnBu", vmin=0, vmax=1)
    ax.set_xticks(range(len(score_cols)), labels=display_names, rotation=20, ha="right")
    ax.set_yticks(range(len(MODEL_ORDER)), labels=MODEL_ORDER)
    for i in range(len(MODEL_ORDER)):
        for j in range(len(score_cols)):
            value = normalized.iloc[i, j]
            ax.text(j, i, f"{value:.3f}", ha="center", va="center", color="black")
    fig.colorbar(image, ax=ax, fraction=0.035, pad=0.02)
    ax.set_title("Resumen final para seleccion del modelo principal")
    return savefig(fig, "15_resumen_seleccion_modelo.png")


def write_guide(paths):
    rel = {key: path.relative_to(BASE_DIR) for key, path in paths.items()}
    guide = f"""# Guia de visualizaciones de clasificacion 2026

Esta guia prioriza figuras utiles para informe academico y presentacion final. Todas las visualizaciones se regeneran con:

```bash
python scripts/generate_classification_visualizations_2026.py
```

## 1. Comparacion global de modelos

**Pregunta:** que modelo tiene mejor desempeno global en la prueba temporal de mayo?

**Visualizaciones:**

- Tabla comparativa: `{rel['metrics_table']}`
- Barras de metricas: `{rel['metrics_bars']}`

**Importancia:** resume accuracy, precision, recall, F1, ROC-AUC y Average Precision. En este problema desbalanceado, F1, recall, ROC-AUC y Average Precision pesan mas que accuracy.

**Lectura:** la Regresion Logistica L1 core domina en F1, ROC-AUC y Average Precision; KNN tiene mayor accuracy porque predice mas eventos como no letales; Naive Bayes maximiza recall con demasiadas falsas alarmas.

## 2. Capacidad discriminativa

**Pregunta:** que tan bien ordena cada modelo los eventos letales por encima de los no letales?

**Visualizaciones:**

- ROC: `{rel['roc']}`
- Precision-Recall: `{rel['pr']}`

**Importancia:** ROC muestra separacion general; Precision-Recall es mas informativa cuando la clase positiva es minoritaria.

**Lectura:** curvas mas cercanas a la esquina superior izquierda en ROC y mas altas en Precision-Recall indican mejor ranking probabilistico. La linea base de PR corresponde a la tasa positiva de mayo.

## 3. Errores de clasificacion

**Pregunta:** que tipo de error comete cada modelo: falsas alarmas o eventos letales omitidos?

**Visualizaciones:**

- Matrices normalizadas: `{rel['confusion']}`
- FP vs FN: `{rel['fp_fn']}`

**Importancia:** en alerta temprana, un falso negativo puede ser mas costoso que un falso positivo, pero demasiadas falsas alarmas reducen utilidad operativa.

**Lectura:** Naive Bayes tiene FN=0 pero FP=151; KNN tiene FP=27 pero FN=33; Logistica queda en una zona intermedia mas defendible.

## 4. Regresion Logistica

**Pregunta:** que variables empujan la probabilidad hacia letalidad o no letalidad?

**Visualizaciones:**

- Ranking de coeficientes: `{rel['logreg_coef']}`
- Odds ratios: `{rel['logreg_or']}`

**Importancia:** permite justificar el modelo principal con interpretabilidad estadistica. Los coeficientes muestran direccion y magnitud; los odds ratios traducen el efecto a una escala multiplicativa.

**Lectura:** coeficientes positivos aumentan log-odds de letalidad; odds ratios mayores que 1 aumentan odds; menores que 1 los reducen.

## 5. KNN

**Pregunta:** la seleccion de K es estable o depende fuertemente del hiperparametro?

**Visualizacion:** `{rel['knn']}`

**Importancia:** KNN es sensible a escala, dimensionalidad y vecindario. La curva valida que K=15 escalado fue elegido con datos de entrenamiento y no mirando mayo.

**Lectura:** el panel izquierdo selecciona K por Average Precision; el derecho muestra si ROC-AUC y F1 son estables o fluctuan.

## 6. Naive Bayes

**Pregunta:** que variables separan las clases y que tan plausible es el supuesto de independencia condicional?

**Visualizaciones:**

- Importancia relativa: `{rel['nb_importance']}`
- Distribuciones por clase: `{rel['nb_distributions']}`
- Correlaciones condicionales: `{rel['nb_correlations']}`

**Importancia:** Naive Bayes asume independencia condicional. Si variables clave estan correlacionadas dentro de cada clase, el supuesto es debil y ayuda a explicar probabilidades extremas.

**Lectura:** separaciones grandes indican variables informativas; correlaciones altas fuera de la diagonal sugieren dependencia entre predictores.

## 7. Analisis de probabilidades y umbral

**Pregunta:** las probabilidades separan clases y el umbral 0.5 es razonable?

**Visualizaciones:**

- Distribucion de probabilidades: `{rel['probabilities']}`
- Analisis de umbral: `{rel['threshold']}`

**Importancia:** un modelo puede tener buen ranking pero requerir otro umbral para una politica de alerta temprana.

**Lectura:** mayor separacion entre histogramas indica mejor discriminacion; el analisis de umbral muestra el intercambio precision-recall-F1.

## 8. Comparacion final

**Pregunta:** cual modelo se justifica como principal?

**Visualizacion:** `{rel['summary']}`

**Importancia:** sintetiza metricas relevantes para decision final sin saturar la presentacion.

**Lectura:** la Regresion Logistica L1 core es el compromiso mas defendible entre F1, ROC-AUC, Average Precision, sensibilidad e interpretabilidad.

## Cinco visualizaciones imprescindibles para una presentacion de 10 minutos

1. Barras de metricas entre modelos: `{rel['metrics_bars']}`
2. Curvas Precision-Recall: `{rel['pr']}`
3. FP vs FN: `{rel['fp_fn']}`
4. Odds ratios de Regresion Logistica: `{rel['logreg_or']}`
5. Resumen final de seleccion: `{rel['summary']}`

## Visualizaciones para anexo tecnico

- Tabla comparativa completa.
- Curvas ROC.
- Matrices de confusion normalizadas.
- Ranking de coeficientes logisticos.
- Sensibilidad de KNN a K.
- Importancia relativa de Naive Bayes.
- Distribuciones de variables clave por clase.
- Correlaciones condicionales para discutir independencia.
- Distribuciones de probabilidades predichas.
- Analisis visual del umbral.
"""
    REPORTS_DIR.mkdir(exist_ok=True)
    GUIDE_PATH.write_text(guide, encoding="utf-8")
    return GUIDE_PATH


def main():
    setup_style()
    metrics, predictions, knn_cv, odds = load_inputs()
    paths = {
        "metrics_table": plot_metrics_table(metrics),
        "metrics_bars": plot_metrics_bars(metrics),
        "roc": plot_roc_curves(predictions),
        "pr": plot_precision_recall_curves(predictions),
        "confusion": plot_normalized_confusion(metrics),
        "fp_fn": plot_fp_fn(metrics),
        "logreg_coef": plot_logreg_coefficients(odds),
        "logreg_or": plot_logreg_odds_ratios(odds),
        "knn": plot_knn_sensitivity(knn_cv),
        "nb_importance": plot_nb_importance(),
        "nb_distributions": plot_nb_key_distributions(),
        "nb_correlations": plot_nb_conditional_correlations(),
        "probabilities": plot_probability_distributions(predictions),
        "threshold": plot_threshold_analysis(predictions),
        "summary": plot_final_summary(metrics),
    }
    guide_path = write_guide(paths)
    print(f"[ok] Figuras -> {FIGURES_DIR}")
    print(f"[ok] Guia -> {guide_path}")


if __name__ == "__main__":
    main()
