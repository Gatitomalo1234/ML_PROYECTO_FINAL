# 03 - Comparacion de clasificadores 2026

Estado: 2026-05-30

## Comparacion de clasificadores 2026

Analisis ejecutado:

```text
scripts/compare_classifiers_2026.py
```

Diseno:

```text
Dataset: data/processed/model3_embeddings_dataset.csv
Filtro: eventos de 2026
Features: perfil core_interpretable, sin emb_pca_* ni actor_pair
Train: eventos hasta abril de 2026
Test: eventos de mayo de 2026
```

Modelos comparados:

```text
1. Logistic Regression L1 core con class_weight="balanced", C=0.1
2. KNN con pesos por distancia y busqueda de K en validacion cruzada
3. Gaussian Naive Bayes como baseline probabilistico simple
```

KNN se ajusto con validacion cruzada estratificada de 5 folds solo sobre el conjunto de entrenamiento. La mejor configuracion fue:

```text
K = 15
scaled = True
average_precision_cv = 0.470
f1_cv = 0.364
roc_auc_cv = 0.702
```

Resultados en prueba temporal de mayo:

| Modelo | Accuracy | Balanced Accuracy | Precision | Recall | F1 | ROC-AUC | Average Precision | TN | FP | FN | TP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Logistic Regression L1 core | 0.587 | 0.647 | 0.300 | 0.750 | 0.429 | 0.705 | 0.413 | 92 | 77 | 11 | 33 |
| Gaussian Naive Bayes | 0.291 | 0.553 | 0.226 | 1.000 | 0.368 | 0.556 | 0.227 | 18 | 151 | 0 | 44 |
| KNN k=15 scaled=True | 0.718 | 0.545 | 0.289 | 0.250 | 0.268 | 0.642 | 0.295 | 142 | 27 | 33 | 11 |

Lectura:

```text
La Regresion Logistica L1 core obtiene el mejor F1, ROC-AUC y Average Precision.
GaussianNB logra recall perfecto, pero al costo de 151 falsas alarmas.
KNN reduce las falsas alarmas a 27, pero pierde 33 de 44 eventos letales de mayo.
```

Conclusion de la comparacion:

```text
Para alerta temprana, la Regresion Logistica L1 core sigue siendo el modelo principal mas defendible.
No maximiza recall como Naive Bayes ni minimiza falsas alarmas como KNN, pero ofrece el mejor balance entre ranking probabilistico, F1, sensibilidad e interpretabilidad.
```

Salidas generadas:

```text
data/processed/classifier_comparison_2026_metrics.csv
data/processed/classifier_comparison_2026_predictions.csv
data/processed/classifier_comparison_knn_cv.csv
data/processed/classifier_comparison_logreg_odds_ratios.csv
models/classifier_comparison_2026_logistic_regression_l1_core.joblib
models/classifier_comparison_2026_knn_k15_scaledtrue.joblib
models/classifier_comparison_2026_gaussian_naive_bayes.joblib
reports/comparacion_modelos_clasificacion_2026.md
reports/figures/knn_k_search_average_precision.png
reports/figures/classifier_comparison_roc.png
reports/figures/classifier_comparison_precision_recall.png
```

