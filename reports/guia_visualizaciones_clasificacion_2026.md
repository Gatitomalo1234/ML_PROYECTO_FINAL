# Guia de visualizaciones de clasificacion 2026

Esta guia prioriza figuras utiles para informe academico y presentacion final. Todas las visualizaciones se regeneran con:

```bash
python scripts/generate_classification_visualizations_2026.py
```

## 1. Comparacion global de modelos

**Pregunta:** que modelo tiene mejor desempeno global en la prueba temporal de mayo?

**Visualizaciones:**

- Tabla comparativa: `reports\figures\classification_visuals_2026\01_tabla_metricas_modelos.png`
- Barras de metricas: `reports\figures\classification_visuals_2026\02_barras_metricas_modelos.png`

**Importancia:** resume accuracy, precision, recall, F1, ROC-AUC y Average Precision. En este problema desbalanceado, F1, recall, ROC-AUC y Average Precision pesan mas que accuracy.

**Lectura:** la Regresion Logistica L1 core domina en F1, ROC-AUC y Average Precision; KNN tiene mayor accuracy porque predice mas eventos como no letales; Naive Bayes maximiza recall con demasiadas falsas alarmas.

## 2. Capacidad discriminativa

**Pregunta:** que tan bien ordena cada modelo los eventos letales por encima de los no letales?

**Visualizaciones:**

- ROC: `reports\figures\classification_visuals_2026\03_curvas_roc_modelos.png`
- Precision-Recall: `reports\figures\classification_visuals_2026\04_curvas_precision_recall_modelos.png`

**Importancia:** ROC muestra separacion general; Precision-Recall es mas informativa cuando la clase positiva es minoritaria.

**Lectura:** curvas mas cercanas a la esquina superior izquierda en ROC y mas altas en Precision-Recall indican mejor ranking probabilistico. La linea base de PR corresponde a la tasa positiva de mayo.

## 3. Errores de clasificacion

**Pregunta:** que tipo de error comete cada modelo: falsas alarmas o eventos letales omitidos?

**Visualizaciones:**

- Matrices normalizadas: `reports\figures\classification_visuals_2026\05_matrices_confusion_normalizadas.png`
- FP vs FN: `reports\figures\classification_visuals_2026\06_falsos_positivos_falsos_negativos.png`

**Importancia:** en alerta temprana, un falso negativo puede ser mas costoso que un falso positivo, pero demasiadas falsas alarmas reducen utilidad operativa.

**Lectura:** Naive Bayes tiene FN=0 pero FP=151; KNN tiene FP=27 pero FN=33; Logistica queda en una zona intermedia mas defendible.

## 4. Regresion Logistica

**Pregunta:** que variables empujan la probabilidad hacia letalidad o no letalidad?

**Visualizaciones:**

- Ranking de coeficientes: `reports\figures\classification_visuals_2026\07_logreg_ranking_coeficientes.png`
- Odds ratios: `reports\figures\classification_visuals_2026\08_logreg_odds_ratios.png`

**Importancia:** permite justificar el modelo principal con interpretabilidad estadistica. Los coeficientes muestran direccion y magnitud; los odds ratios traducen el efecto a una escala multiplicativa.

**Lectura:** coeficientes positivos aumentan log-odds de letalidad; odds ratios mayores que 1 aumentan odds; menores que 1 los reducen.

## 5. KNN

**Pregunta:** la seleccion de K es estable o depende fuertemente del hiperparametro?

**Visualizacion:** `reports\figures\classification_visuals_2026\09_knn_sensibilidad_k.png`

**Importancia:** KNN es sensible a escala, dimensionalidad y vecindario. La curva valida que K=15 escalado fue elegido con datos de entrenamiento y no mirando mayo.

**Lectura:** el panel izquierdo selecciona K por Average Precision; el derecho muestra si ROC-AUC y F1 son estables o fluctuan.

## 6. Naive Bayes

**Pregunta:** que variables separan las clases y que tan plausible es el supuesto de independencia condicional?

**Visualizaciones:**

- Importancia relativa: `reports\figures\classification_visuals_2026\10_naive_bayes_importancia_relativa.png`
- Distribuciones por clase: `reports\figures\classification_visuals_2026\11_naive_bayes_distribuciones_variables_clave.png`
- Correlaciones condicionales: `reports\figures\classification_visuals_2026\12_naive_bayes_correlaciones_condicionales.png`

**Importancia:** Naive Bayes asume independencia condicional. Si variables clave estan correlacionadas dentro de cada clase, el supuesto es debil y ayuda a explicar probabilidades extremas.

**Lectura:** separaciones grandes indican variables informativas; correlaciones altas fuera de la diagonal sugieren dependencia entre predictores.

## 7. Analisis de probabilidades y umbral

**Pregunta:** las probabilidades separan clases y el umbral 0.5 es razonable?

**Visualizaciones:**

- Distribucion de probabilidades: `reports\figures\classification_visuals_2026\13_distribucion_probabilidades_predichas.png`
- Analisis de umbral: `reports\figures\classification_visuals_2026\14_analisis_umbral_clasificacion.png`

**Importancia:** un modelo puede tener buen ranking pero requerir otro umbral para una politica de alerta temprana.

**Lectura:** mayor separacion entre histogramas indica mejor discriminacion; el analisis de umbral muestra el intercambio precision-recall-F1.

## 8. Comparacion final

**Pregunta:** cual modelo se justifica como principal?

**Visualizacion:** `reports\figures\classification_visuals_2026\15_resumen_seleccion_modelo.png`

**Importancia:** sintetiza metricas relevantes para decision final sin saturar la presentacion.

**Lectura:** la Regresion Logistica L1 core es el compromiso mas defendible entre F1, ROC-AUC, Average Precision, sensibilidad e interpretabilidad.

## Cinco visualizaciones imprescindibles para una presentacion de 10 minutos

1. Barras de metricas entre modelos: `reports\figures\classification_visuals_2026\02_barras_metricas_modelos.png`
2. Curvas Precision-Recall: `reports\figures\classification_visuals_2026\04_curvas_precision_recall_modelos.png`
3. FP vs FN: `reports\figures\classification_visuals_2026\06_falsos_positivos_falsos_negativos.png`
4. Odds ratios de Regresion Logistica: `reports\figures\classification_visuals_2026\08_logreg_odds_ratios.png`
5. Resumen final de seleccion: `reports\figures\classification_visuals_2026\15_resumen_seleccion_modelo.png`

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
