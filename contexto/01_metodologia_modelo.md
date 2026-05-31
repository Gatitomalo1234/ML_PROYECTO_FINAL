# 01 - Metodologia del modelo logistico

Estado: 2026-05-30

## Objetivo

Construir un clasificador binario para estimar la probabilidad de que un evento armado de 2026 tenga fatalidades reportadas.

```text
target_logistico = 1 si fatalities > 0
target_logistico = 0 si fatalities = 0
```

El proyecto deja de usar como modelo principal una prediccion continua de severidad. La razon metodologica es que el problema observado esta dominado por ceros y mezcla dos procesos distintos:

```text
1. ocurrencia de letalidad
2. severidad condicional a que exista letalidad
```

Para esta etapa, nos concentramos solo en el primer proceso: clasificar si el evento sera letal o no.

## Dataset principal

La base recomendada es:

```text
data/processed/model3_embeddings_dataset.csv
```

Este archivo contiene eventos `attack_like`, variables estructuradas, scores militares y componentes semanticos `emb_pca_*` generados desde el texto.

El entrenamiento se restringe a:

```text
year(event_date) = 2026
```

Motivo:

```text
2024-2025 proviene principalmente de ACLED y tiene una proporcion letal mucho mas baja.
2026 proviene de IranWarLive/GDELT Cloud y representa mejor el regimen operativo actual.
```

## Columnas excluidas por fuga

No usar como predictores:

```text
event_id
event_date
fatalities
target_msi
has_fatalities
split_recommended
text_clean
target_logistico
```

`fatalities`, `target_msi` y `has_fatalities` son informacion directa del objetivo.

## Features candidatas

Estructuradas:

```text
source
country
region
latitude
longitude
actor1
actor2
actor_pair
event_type
sub_event_type
weapon_type
target_type
civilian_targeting
attack_like_event
year
month
day_of_week
```

Temporales retrospectivas:

```text
past_attacks_7d
past_attacks_30d
past_fatalities_7d
past_fatalities_30d
days_since_last_attack
```

Actores:

```text
attacker_category
attacker_is_israel
attacker_is_iran
attacker_is_hezbollah
attacker_is_houthi
attacker_is_us
```

Scores militares:

```text
is_drone
is_missile
is_airstrike
is_artillery
is_explosive_ied
is_chemical
is_interception
weapon_lethality_score
target_lethality_score
military_severity_score
```

Texto reducido:

```text
emb_pca_1 ... emb_pca_20
```

## Modelo principal

Regresion logistica con preprocesamiento:

```text
numeric features -> imputacion mediana -> StandardScaler
categorical features -> imputacion moda -> OneHotEncoder
classifier -> LogisticRegression
```

Se reportan variantes L2 y L1:

```text
L2: modelo logistico regularizado, sin seleccion fuerte de variables
L1: modelo logistico sparse; muchos coeficientes quedan exactamente en cero
```

Interpretacion esperada:

```text
class_weight="balanced" prioriza recall de eventos letales.
sin pesos de clase suele ser mas conservador.
L1 permite seleccionar un subconjunto mas interpretable de features.
```

## Validacion

Validacion principal:

```text
train: eventos 2026 hasta abril
test: eventos 2026 de mayo
```

Esta es la evaluacion de referencia porque simula una pregunta predictiva real:

```text
Con informacion observada hasta abril, que tan bien anticipamos mayo?
```

Validacion auxiliar:

```text
split aleatorio estratificado 80/20 dentro de 2026
```

El split aleatorio solo mide si existe senal interna. No debe reemplazar la validacion temporal porque mezcla eventos contemporaneos y puede sobreestimar desempeno.

## Metricas

Metricas principales:

```text
ROC-AUC
Average Precision
Balanced Accuracy
Precision
Recall
F1
Brier Score
Matriz de confusion
```

Lectura recomendada:

```text
ROC-AUC / Average Precision -> calidad del ranking probabilistico
Precision / Recall / F1 -> utilidad con umbral 0.5
Brier Score -> calibracion probabilistica
```

## Implementacion

Script reproducible:

```text
scripts/train_logreg_2026.py
```

Salidas:

```text
data/processed/logreg_2026_metrics.csv
data/processed/logreg_2026_predictions.csv
data/processed/logreg_2026_feature_coefficients.csv
data/processed/logreg_2026_l1_selected_features.csv
models/logreg_2026_fatality_classifier_logreg_l2_balanced.joblib
models/logreg_2026_fatality_classifier_logreg_l2_unweighted.joblib
models/logreg_2026_fatality_classifier_logreg_l1_balanced_c01.joblib
models/logreg_2026_fatality_classifier_logreg_l1_unweighted_c01.joblib
models/logreg_2026_fatality_classifier_logreg_core_l1_balanced_c01.joblib
models/logreg_2026_fatality_classifier_logreg_core_l1_unweighted_c01.joblib
```

Notebook principal:

```text
notebooks/03_modelo_logistico_2026.ipynb
```

## Riesgos metodologicos

| Riesgo | Mitigacion |
|---|---|
| Cambio de distribucion entre meses | Usar validacion temporal como referencia |
| Desbalance 2026 | Comparar modelo balanceado y sin pesos |
| Fuga del objetivo | Excluir `fatalities`, `has_fatalities`, `target_msi` |
| Sesgo por fuente | Reportar resultados por `source` y revisar coeficientes |
| Texto dominante | Usar PCA semantico y comparar con/sin embeddings en iteraciones futuras |

