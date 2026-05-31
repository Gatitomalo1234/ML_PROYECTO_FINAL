# 04 - Visualizaciones para informe y presentacion

Estado: 2026-05-30

## Visualizaciones para informe y presentacion

Script reproducible:

```text
scripts/generate_classification_visualizations_2026.py
```

Guia metodologica generada:

```text
reports/guia_visualizaciones_clasificacion_2026.md
```

Directorio de figuras publicables:

```text
reports/figures/classification_visuals_2026/
```

Las visualizaciones se seleccionaron para responder preguntas analiticas concretas, evitando graficos decorativos o redundantes:

| Bloque | Pregunta | Figura principal |
|---|---|---|
| Comparacion global | Que modelo tiene mejor desempeno global? | `02_barras_metricas_modelos.png` |
| Ranking probabilistico | Que modelo separa mejor eventos letales y no letales? | `04_curvas_precision_recall_modelos.png` |
| Errores operativos | Que modelo genera mas falsas alarmas o eventos omitidos? | `06_falsos_positivos_falsos_negativos.png` |
| Interpretabilidad logistica | Que variables aumentan o reducen los odds de letalidad? | `08_logreg_odds_ratios.png` |
| Seleccion final | Que modelo se justifica como principal? | `15_resumen_seleccion_modelo.png` |

Figuras generadas:

```text
01_tabla_metricas_modelos.png
02_barras_metricas_modelos.png
03_curvas_roc_modelos.png
04_curvas_precision_recall_modelos.png
05_matrices_confusion_normalizadas.png
06_falsos_positivos_falsos_negativos.png
07_logreg_ranking_coeficientes.png
08_logreg_odds_ratios.png
09_knn_sensibilidad_k.png
10_naive_bayes_importancia_relativa.png
11_naive_bayes_distribuciones_variables_clave.png
12_naive_bayes_correlaciones_condicionales.png
13_distribucion_probabilidades_predichas.png
14_analisis_umbral_clasificacion.png
15_resumen_seleccion_modelo.png
```

Cinco visualizaciones imprescindibles para una presentacion de 10 minutos:

```text
1. 02_barras_metricas_modelos.png
2. 04_curvas_precision_recall_modelos.png
3. 06_falsos_positivos_falsos_negativos.png
4. 08_logreg_odds_ratios.png
5. 15_resumen_seleccion_modelo.png
```

Figuras recomendadas para anexo tecnico:

```text
01_tabla_metricas_modelos.png
03_curvas_roc_modelos.png
05_matrices_confusion_normalizadas.png
07_logreg_ranking_coeficientes.png
09_knn_sensibilidad_k.png
10_naive_bayes_importancia_relativa.png
11_naive_bayes_distribuciones_variables_clave.png
12_naive_bayes_correlaciones_condicionales.png
13_distribucion_probabilidades_predichas.png
14_analisis_umbral_clasificacion.png
```

