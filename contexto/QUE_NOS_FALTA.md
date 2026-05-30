# ¿Qué nos falta? — Estado del Proyecto al 30 de Mayo 2026

---

## ✅ Lo que SÍ existe

| Componente | Estado |
|---|---|
| Dashboard 3D cinematográfico (Next.js + Three.js) | ✅ Completo y pulido |
| Paneles del COMMAND_CENTER (LeftRail, RightRail, CenterPanel, BottomRail) | ✅ Construidos (datos mock) |
| `opensky.db` — 1 día de datos (2026-04-27) | ✅ Existe (insuficiente) |
| `scripts/data_extraction.py` y `data_processing.py` | ✅ Existen |
| `notebooks/01_pipeline_acled_gdelt.ipynb` | ✅ Existe |
| Plan maestro, contexto y preguntas de investigación documentados | ✅ Documentado |

---

## 🔴 CRÍTICO — El corazón del proyecto ML (no existe nada aún)

### Datos reales

| Archivo que falta | Fuente | Dónde va |
|---|---|---|
| `acled_iran.csv` | ACLED API | `data/raw/` |
| `acled_israel.csv` | ACLED API | `data/raw/` |
| `gdelt_ir_daily.csv` | GDELT / BigQuery | `data/raw/` |
| `gdelt_is_daily.csv` | GDELT / BigQuery | `data/raw/` |
| `rss_aljazeera.jsonl` | Feed RSS Al Jazeera | `data/raw/` |
| `rss_bbc.jsonl` | Feed RSS BBC | `data/raw/` |
| OpenSky histórico extendido (+180 días) | OpenSky API | `data/raw/opensky.db` |

### Procesamiento y modelos

| Archivo que falta | Descripción |
|---|---|
| `data/processed/master_table.csv` | Tabla maestra agregada (fecha × región) con todas las features |
| `data/processed/ground_truth.csv` | ACLED + UCDP unificados, una fila por día |
| `data/processed/model_results.json` | Predicciones del modelo para alimentar el dashboard |
| `models/baseline_knn.pkl` | Modelo KNN entrenado |
| `models/baseline_logreg.pkl` | Regresión Logística entrenada |
| `models/random_forest.pkl` | Random Forest entrenado |
| `models/best_model.pkl` | Mejor modelo final |

### Scripts que faltan

| Script | Propósito |
|---|---|
| `scripts/check_data_integrity.py` | Inspecciona fuentes y reporta cobertura, nulos y vacíos |
| `scripts/feature_engineering.py` | Construye `flight_drop_index`, lags de GDELT, score RSS |
| `scripts/train_models.py` | Pipeline reproducible de entrenamiento (KNN, LogReg, RF, HistGB) |
| `scripts/run_pipeline.py` | Orquestador end-to-end (extrae → procesa → entrena → exporta) |
| `scripts/export_dashboard_data.py` | Genera los JSON para el dashboard desde el modelo entrenado |

---

## 🔴 CRÍTICO — Notebooks exigidos por la rúbrica

| Notebook | Propósito | Estado |
|---|---|---|
| `02_eda_opensky.ipynb` | EDA de vuelos: cobertura, nulos, distribución temporal | ❌ No existe |
| `03_feature_engineering.ipynb` | Construir y validar `flight_drop_index` y demás features | ❌ No existe |
| `04_model_comparison.ipynb` | **Métricas de 3+ modelos**: accuracy, F1, matriz de confusión, ROC | ❌ No existe |
| `05_dashboard_preview.ipynb` | Preview de los datos que alimentarán el dashboard | ❌ No existe |

El notebook `04_model_comparison.ipynb` es el más importante para la rúbrica — debe mostrar:
- Accuracy, Precision, Recall, F1-Score (macro) por modelo
- Matriz de confusión por modelo
- Feature importance de Random Forest
- Comparación clara de cuál modelo gana y por qué

---

## 🟠 IMPORTANTE — Conectar datos reales al dashboard

El dashboard actualmente **solo muestra datos simulados** (`mockData.ts`). La función `hydrateFromExports()` ya existe en el store pero nunca se llama con datos reales.

Pasos pendientes:
1. `export_dashboard_data.py` genera `model_results.json` con el formato `{date, region, predicted_level, confidence}`
2. El dashboard hace `fetch('/data/model_results.json')` al cargar y llama `hydrateFromExports()`
3. El badge `DATOS SIMULADOS · PIPELINE NO CONECTADO` desaparece y pasa a `OK`
4. Los paneles (LeftRail, RightRail, CenterPanel) muestran cifras reales del modelo

---

## 🟡 DESPLIEGUE — Sin URL pública

| Qué falta | Detalle |
|---|---|
| `vercel.json` en la raíz del repo | Configuración de despliegue para Next.js |
| Primer deploy en Vercel | Conectar el repo y publicar |
| URL pública funcional | Necesaria para la entrega al profesor |
| GitHub Actions (`update_data.yml`) | Cron job cada 6h: extrae datos → corre modelo → hace commit (opcional pero impresiona) |

---

## 📋 Checklist de la Rúbrica

| Criterio | Estado | Prioridad |
|---|---|---|
| ≥ 3 fuentes abiertas con datos reales extraídos | 🔴 Solo OpenSky existe | P0 |
| ≥ 3 modelos ML entrenados y comparados | 🔴 Cero modelos | P0 |
| Notebook con métricas (F1, accuracy, confusion matrix) | 🔴 No existe | P0 |
| Feature engineering documentado | 🔴 No existe | P0 |
| Pregunta de investigación clara y respondida | ✅ Definida | — |
| Dashboard HTML interactivo | 🟡 Existe pero datos mock, sin deploy | P1 |
| Dashboard con datos reales del modelo | 🔴 No conectado | P1 |
| URL pública accesible por el profesor | 🔴 No hay deploy | P1 |
| Feature importance documentada | 🔴 No existe | P1 |
| Automatización con GitHub Actions | ⬜ Opcional | P2 |

---

## 🗓 Orden de ejecución recomendado

```
1. Extraer datos reales
   └─ Correr data_extraction.py para ACLED + GDELT + RSS
   └─ Extender opensky.db con histórico de 6 meses

2. Feature engineering
   └─ Crear master_table.csv con flight_drop_index y lags de GDELT
   └─ Validar en notebooks/03_feature_engineering.ipynb

3. Entrenar y comparar modelos
   └─ notebooks/04_model_comparison.ipynb
   └─ Guardar models/*.pkl

4. Exportar resultados
   └─ export_dashboard_data.py → model_results.json

5. Conectar datos reales al dashboard
   └─ fetch('/data/model_results.json') en el frontend
   └─ Verificar que los paneles muestren cifras reales

6. Deploy en Vercel
   └─ vercel.json + primer push
   └─ URL pública para entrega
```

---

*Documento generado: 2026-05-30*
