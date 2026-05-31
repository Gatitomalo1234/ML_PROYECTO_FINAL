# EDA - Clasificacion de letalidad 2026

Estado: 2026-05-30

## Resumen ejecutivo

El modelado principal se redefine como un problema de clasificacion binaria:

```text
fatality_positive = 1 si fatalities > 0
fatality_positive = 0 si fatalities = 0
```

La decision metodologica es entrenar y validar sobre eventos de 2026. Los anios historicos 2024-2025 quedan como contexto exploratorio porque tienen otra fuente dominante y una proporcion letal mucho mas baja.

## Dataset

Base recomendada:

```text
data/processed/model3_embeddings_dataset.csv
```

Unidad de analisis:

```text
evento attack-like
```

Rango total disponible:

```text
2024-01-01 a 2026-05-30
```

## Distribucion por periodo

| Periodo | Filas | Ceros | Letales | Tasa letal |
|---|---:|---:|---:|---:|
| 2024-2025 | 3,488 | 3,303 | 185 | 5.3% |
| 2026 | 1,632 | 1,256 | 376 | 23.0% |
| Total attack-like | 5,120 | 4,559 | 561 | 11.0% |

Lectura:

```text
El historico esta mucho mas desbalanceado y puede empujar al modelo a predecir cero.
2026 tiene menos filas, pero una proporcion de eventos letales mucho mas informativa.
```

## 2026 por fuente

| Fuente | Filas | Ceros | Letales | Tasa letal |
|---|---:|---:|---:|---:|
| IranWarLive | 956 | 710 | 246 | 25.7% |
| GDELT Cloud | 676 | 546 | 130 | 19.2% |
| Total 2026 | 1,632 | 1,256 | 376 | 23.0% |

Lectura:

```text
IranWarLive tiene mayor tasa letal que GDELT Cloud.
La variable `source` puede capturar diferencias de cobertura y debe auditarse.
```

## 2026 por mes

| Mes | Filas | Letales | Tasa letal | Fatalidades totales | Max fatalidades |
|---|---:|---:|---:|---:|---:|
| 2026-02 | 2 | 2 | 100.0% | 205 | 165 |
| 2026-03 | 1,026 | 236 | 23.0% | 3,629 | 200 |
| 2026-04 | 391 | 94 | 24.0% | 1,537 | 357 |
| 2026-05 | 213 | 44 | 20.7% | 465 | 77 |

Lectura:

```text
Febrero no tiene muestra suficiente para evaluar.
Marzo domina el entrenamiento.
Mayo es un test temporal razonable pero con menor severidad maxima que abril.
```

## 2026 por arma

| Weapon type | Filas | Letales | Tasa letal |
|---|---:|---:|---:|
| drone | 409 | 72 | 17.6% |
| air_strike | 394 | 146 | 37.1% |
| unknown | 362 | 86 | 23.8% |
| missile_rocket | 345 | 51 | 14.8% |
| explosive_ied | 75 | 19 | 25.3% |
| interception_air_defense | 41 | 1 | 2.4% |

Lectura:

```text
Air strikes tienen una tasa letal alta.
Intercepciones casi siempre son no letales.
Missile/rocket tiene muchos ceros, probablemente porque mezcla lanzamientos, impactos e intercepciones.
```

## 2026 por objetivo

| Target type | Filas | Letales | Tasa letal |
|---|---:|---:|---:|
| unknown | 622 | 163 | 26.2% |
| infrastructure | 332 | 48 | 14.5% |
| military | 324 | 50 | 15.4% |
| civilian | 256 | 101 | 39.5% |
| nuclear | 52 | 6 | 11.5% |
| urban | 46 | 8 | 17.4% |

Lectura:

```text
Eventos contra civiles tienen la tasa letal mas alta.
La categoria unknown todavia concentra muchos casos y conviene auditarla con texto.
```

## Validacion recomendada

Principal:

```text
train: febrero-marzo-abril 2026
test: mayo 2026
```

Auxiliar:

```text
split aleatorio estratificado 80/20 dentro de 2026
```

El split aleatorio sirve para comprobar si las features tienen senal. El split temporal es el resultado que debe defenderse porque respeta el orden real del tiempo.

## Resultado inicial de regresion logistica

| Split | Variante | ROC-AUC | Average Precision | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|
| Temporal hasta abril -> mayo | logreg_l2_balanced | 0.740 | 0.422 | 0.235 | 0.977 | 0.379 |
| Temporal hasta abril -> mayo | logreg_l2_unweighted | 0.717 | 0.386 | 0.295 | 0.886 | 0.443 |
| Temporal hasta abril -> mayo | logreg_l1_balanced_c01 | 0.728 | 0.439 | 0.337 | 0.705 | 0.456 |
| Temporal hasta abril -> mayo | logreg_l1_unweighted_c01 | 0.721 | 0.411 | 0.556 | 0.114 | 0.189 |
| Temporal hasta abril -> mayo | logreg_core_l1_balanced_c01 | 0.705 | 0.413 | 0.300 | 0.750 | 0.429 |
| Aleatorio estratificado 80/20 | logreg_l2_balanced | 0.788 | 0.578 | 0.478 | 0.733 | 0.579 |
| Aleatorio estratificado 80/20 | logreg_l2_unweighted | 0.788 | 0.582 | 0.756 | 0.413 | 0.534 |

Lectura:

```text
Hay senal predictiva: el ROC-AUC temporal supera 0.70.
El split aleatorio es mas optimista, como era esperable.
La variante L2 balanceada maximiza recall pero produce muchas falsas alarmas.
La variante L1 balanceada con C=0.1 reduce el modelo a 33 features no cero y mejora el F1 temporal.
La variante core L1 sin embeddings ni actor_pair queda con 24 features no cero y conserva desempeno razonable.
```

## Hallazgos metodologicos

1. La clasificacion binaria es mas adecuada como primera etapa porque el principal problema practico es distinguir eventos letales de no letales.
2. Entrenar con 2026 evita que el historico ACLED domine el aprendizaje con ceros.
3. La validacion temporal revela deriva mensual que el split aleatorio esconde.
4. El umbral 0.5 no debe asumirse como final; debe calibrarse segun costo de falsas alarmas vs falsos negativos.
5. La auditoria por fuente es necesaria porque IranWarLive y GDELT Cloud no tienen exactamente el mismo comportamiento de reporte.

## Archivos relacionados

```text
contexto/PLAN_MODELADO.md
scripts/train_logreg_2026.py
notebooks/02_eda_logistica_2026.ipynb
notebooks/03_modelo_logistico_2026.ipynb
data/processed/logreg_2026_metrics.csv
data/processed/logreg_2026_predictions.csv
data/processed/logreg_2026_feature_coefficients.csv
```
