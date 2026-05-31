# 02 - Resultados de regresion logistica

Estado: 2026-05-30

## Resultado inicial

Con el dataset actual, el experimento inicial muestra:

| Split | Variante | ROC-AUC | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| Temporal hasta abril -> mayo | logreg_l2_balanced | 0.740 | 0.235 | 0.977 | 0.379 |
| Temporal hasta abril -> mayo | logreg_l2_unweighted | 0.717 | 0.295 | 0.886 | 0.443 |
| Temporal hasta abril -> mayo | logreg_l1_balanced_c01 | 0.728 | 0.337 | 0.705 | 0.456 |
| Temporal hasta abril -> mayo | logreg_l1_unweighted_c01 | 0.721 | 0.556 | 0.114 | 0.189 |
| Aleatorio estratificado 80/20 | logreg_l2_balanced | 0.788 | 0.478 | 0.733 | 0.579 |
| Aleatorio estratificado 80/20 | logreg_l2_unweighted | 0.788 | 0.756 | 0.413 | 0.534 |
| Aleatorio estratificado 80/20 | logreg_l1_balanced_c01 | 0.746 | 0.421 | 0.680 | 0.520 |

Conclusion inicial:

```text
Existe senal predictiva, pero el desempeno temporal es mas exigente que el aleatorio.
El L2 balanceado captura casi todos los eventos letales, pero genera muchas falsas alarmas.
El L1 balanceado con C=0.1 ofrece el mejor compromiso inicial entre interpretabilidad y F1 temporal.
```

## Seleccion de features con L1

La regularizacion L1 se usa como seleccion de variables dentro del mismo marco logistico. En el experimento actual:

| Variante | Features codificadas no cero | ROC-AUC temporal | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| logreg_l1_balanced_c1 | 90 | 0.743 | 0.243 | 0.977 | 0.389 |
| logreg_l1_unweighted_c1 | 83 | 0.719 | 0.337 | 0.795 | 0.473 |
| logreg_l1_balanced_c03 | 56 | 0.723 | 0.302 | 0.886 | 0.451 |
| logreg_l1_unweighted_c03 | 54 | 0.689 | 0.500 | 0.273 | 0.353 |
| logreg_l1_balanced_c01 | 33 | 0.728 | 0.337 | 0.705 | 0.456 |
| logreg_l1_unweighted_c01 | 28 | 0.721 | 0.556 | 0.114 | 0.189 |
| logreg_core_l1_balanced_c01 | 24 | 0.705 | 0.300 | 0.750 | 0.429 |
| logreg_core_l1_unweighted_c01 | 20 | 0.694 | 0.000 | 0.000 | 0.000 |

Modelo recomendado para explicabilidad:

```text
logreg_l1_balanced_c01
```

Razon:

```text
Reduce el espacio codificado de 157 features a 33 features no cero.
Mantiene ROC-AUC temporal competitivo.
Mejora precision frente al L2 balanceado sin perder completamente el recall.
```

Variante core interpretable:

```text
logreg_core_l1_balanced_c01
```

Esta variante excluye:

```text
emb_pca_*
actor_pair
```

Lectura:

```text
El core interpretable baja de 157 a 110 features codificadas posibles y L1 deja 24 no cero.
Pierde algo de ROC-AUC/F1 frente al L1 full, pero es mas defendible si la prioridad es explicabilidad.
El core unweighted con umbral 0.5 predice todo como no letal, por lo que no es candidato principal.
```

