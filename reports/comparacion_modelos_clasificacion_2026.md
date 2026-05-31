# Comparacion de modelos de clasificacion 2026

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
K = 15
scaled = True
average_precision_cv = 0.470
f1_cv = 0.364
roc_auc_cv = 0.702
```

Figura: `reports\figures\knn_k_search_average_precision.png`

## Tabla comparativa en prueba temporal

| model                       |   accuracy |   balanced_accuracy |   precision |   recall |    f1 |   roc_auc |   average_precision |   tn |   fp |   fn |   tp |
|:----------------------------|-----------:|--------------------:|------------:|---------:|------:|----------:|--------------------:|-----:|-----:|-----:|-----:|
| Logistic Regression L1 core |      0.587 |               0.647 |       0.3   |     0.75 | 0.429 |     0.705 |               0.413 |   92 |   77 |   11 |   33 |
| Gaussian Naive Bayes        |      0.291 |               0.553 |       0.226 |     1    | 0.368 |     0.556 |               0.227 |   18 |  151 |    0 |   44 |
| KNN k=15 scaled=True        |      0.718 |               0.545 |       0.289 |     0.25 | 0.268 |     0.642 |               0.295 |  142 |   27 |   33 |   11 |

## Matrices de confusion

- Logistic Regression L1 core: TN=92, FP=77, FN=11, TP=33
- Gaussian Naive Bayes: TN=18, FP=151, FN=0, TP=44
- KNN k=15 scaled=True: TN=142, FP=27, FN=33, TP=11

## Curvas

- ROC: `reports\figures\classifier_comparison_roc.png`
- Precision-Recall: `reports\figures\classifier_comparison_precision_recall.png`

## Odds ratios de Regresion Logistica

Variables que aumentan la probabilidad estimada:

| feature                        |   coefficient |   odds_ratio |
|:-------------------------------|--------------:|-------------:|
| cat__target_type_civilian      |         0.88  |        2.412 |
| cat__country_Iraq              |         0.401 |        1.493 |
| cat__target_type_unknown       |         0.391 |        1.478 |
| cat__civilian_targeting_True   |         0.34  |        1.405 |
| num__is_airstrike              |         0.237 |        1.268 |
| num__latitude                  |         0.127 |        1.135 |
| cat__actor1_infrequent_sklearn |         0.118 |        1.125 |
| num__days_since_last_attack    |         0.041 |        1.042 |
| num__is_explosive_ied          |         0.02  |        1.02  |

Variables que reducen la probabilidad estimada:

| feature                                   |   coefficient |   odds_ratio |
|:------------------------------------------|--------------:|-------------:|
| cat__country_Israel                       |        -0.631 |        0.532 |
| cat__sub_event_type_Disrupted weapons use |        -0.218 |        0.804 |
| num__is_interception                      |        -0.196 |        0.822 |
| num__is_missile                           |        -0.142 |        0.867 |
| num__longitude                            |        -0.12  |        0.887 |
| cat__civilian_targeting_False             |        -0.109 |        0.896 |
| num__attacker_is_hezbollah                |        -0.098 |        0.907 |
| cat__attacker_category_state              |        -0.088 |        0.915 |
| num__past_attacks_30d                     |        -0.075 |        0.928 |
| num__attacker_is_houthi                   |        -0.06  |        0.942 |
| cat__target_type_infrastructure           |        -0.05  |        0.951 |
| num__past_fatalities_7d                   |        -0.028 |        0.972 |

Interpretacion: un odds ratio mayor que 1 aumenta los odds estimados de letalidad, manteniendo constantes las demas variables del modelo. Un odds ratio menor que 1 los reduce. En variables escaladas, el cambio corresponde a una desviacion estandar; en dummies, corresponde a pasar de ausencia a presencia de esa categoria.

## Analisis aplicado

El mejor modelo para un sistema de alerta temprana no necesariamente es el de mayor accuracy. En clases desbalanceadas, accuracy puede ser alta aun si el modelo ignora eventos letales. Por eso se priorizan recall, F1, Average Precision y matriz de confusion.

- Mejor ranking ROC-AUC: `Logistic Regression L1 core` (0.705).
- Mejor Average Precision: `Logistic Regression L1 core` (0.413).
- Mejor F1: `Logistic Regression L1 core` (0.429).
- Mayor recall: `Gaussian Naive Bayes` (1.000).
- Mayor precision: `Logistic Regression L1 core` (0.300).
- Menos falsos negativos: `Gaussian Naive Bayes` (FN=0).
- Menos falsas alarmas: `KNN k=15 scaled=True` (FP=27).

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
