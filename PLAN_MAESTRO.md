# PLAN MAESTRO — Sistema OSINT de Predicción de Bajas
## Conflicto Irán-Israel · Curso ML1 · Externado de Colombia

---

> **Pregunta de Investigación Central:**
> *¿Es la caída repentina del volumen de tráfico aéreo comercial sobre la zona de conflicto (OpenSky Network) un predictor más potente del número de víctimas de un ataque inminente en las siguientes 24–48 horas que el incremento del tono beligerante en la prensa global (GDELT) y los feeds RSS (Al Jazeera / BBC)?*

> **Entregable Final:** Dashboard interactivo (HTML/JS) desplegado en Netlify/Vercel con mapa táctico, gráfica de tráfico aéreo, ticker OSINT y panel de predicción accionado por el modelo ML.

---

## Arquitectura de Referencia

```
data/raw/                    ← Data Lake: fuentes sin transformar
  opensky.db                 ← Ya existe (2026-04-27, 2 400 filas flight_states, 4 snapshots)
  acled_iran.csv / acled_israel.csv
  ucdp_630.csv / ucdp_666.csv
  gdelt_ir_daily.csv / gdelt_is_daily.csv
  rss_aljazeera.jsonl / rss_bbc.jsonl

data/processed/
  master_table.csv           ← Tabla maestra agregada (fecha × región)
  model_results.json         ← Predicciones del modelo para el dashboard
  database.sqlite            ← Feature Store final para el dashboard

models/
  baseline_knn.pkl
  baseline_logreg.pkl
  random_forest.pkl
  best_model.pkl

scripts/
  data_extraction.py         ← Ya existe (ACLED, GDELT, UCDP)
  data_processing.py         ← Ya existe (merge espacio-temporal)
  check_data_integrity.py    ← POR CREAR
  feature_engineering.py     ← POR CREAR
  train_models.py            ← POR CREAR
  run_pipeline.py            ← POR CREAR (orquestador)
  export_dashboard_data.py   ← POR CREAR

notebooks/
  01_pipeline_acled_gdelt.ipynb  ← Ya existe
  02_eda_opensky.ipynb           ← POR CREAR
  03_feature_engineering.ipynb   ← POR CREAR
  04_model_comparison.ipynb      ← POR CREAR
  05_dashboard_preview.ipynb     ← POR CREAR

dashboard/
  index.html                 ← POR CREAR (entregable final)
  assets/
    style.css
    app.js
    map.js

.github/
  workflows/
    update_data.yml          ← GitHub Actions (cron job)
```

---

## FASE 0 — Fundación y Diagnóstico de Datos Existentes
**Estado: `EN PROGRESO`**
**Objetivo:** Entender con precisión qué datos ya tenemos y qué nos falta antes de escribir una sola línea de modelo.

### Tareas
- [x] Crear `.venv` con todas las dependencias (`requirements.txt`)
- [x] Crear scripts base (`data_extraction.py`, `data_processing.py`)
- [x] Mover archivos de contexto a `contexto/`
- [x] Mover `opensky.db` a `data/raw/`
- [ ] **Crear `scripts/check_data_integrity.py`**: Script que inspeccione `opensky.db` y reporte cobertura temporal, vacíos y distribución de variables clave
- [ ] **Leer enunciado PDF** (`ml1-enunciado-osint-externado.pdf`) para asegurar que cumplimos todos los criterios de la rúbrica

### Checkpoint de Salida — FASE 0
> ✅ **No avanzar a Fase 1 hasta que:**
> 1. El script `check_data_integrity.py` haya corrido sin errores y producido un reporte en `data/processed/integrity_report.txt`
> 2. Se haya leído y documentado en `contexto/RUBRICA.md` los entregables exactos exigidos por el enunciado PDF
> 3. La cobertura de `opensky.db` esté mapeada: sabemos cuántos días hay, cuántas regiones y el % de nulos

---

## FASE 1 — Ingesta y Expansión del Data Lake
**Estado: `PENDIENTE`**
**Objetivo:** Obtener datos históricos de todas las fuentes en `data/raw/`. Mínimo 180 días de historia (2025-11-01 a 2026-05-13) en al menos 2 fuentes alineadas temporalmente.

### Sub-Fase 1.A — Datos de Conflicto (Ground Truth)
- [ ] **ACLED:** Ejecutar `fetch_acled("Iran", "2025-11-01", "2026-05-13")` → `acled_iran.csv`
- [ ] **ACLED:** Ejecutar `fetch_acled("Israel", "2025-11-01", "2026-05-13")` → `acled_israel.csv`
- [ ] **UCDP:** Ejecutar `fetch_ucdp(630, ...)` (Irán, ID=630) → `ucdp_630.csv`
- [ ] **UCDP:** Ejecutar `fetch_ucdp(666, ...)` (Israel, ID=666) → `ucdp_666.csv`
- [ ] **Unificar Ground Truth:** Merge ACLED + UCDP en `data/processed/ground_truth.csv` (una fila por día, columna `total_fatalities`)

### Sub-Fase 1.B — Señales Mediáticas
- [ ] **GDELT (BigQuery):** Extraer `gdelt_ir_daily.csv` para Irán (código `IR`) con columnas: `avg_tone`, `gdelt_mentions`, `material_conflict_events`, `high_conflict_events`
- [ ] **GDELT (BigQuery):** Extraer `gdelt_is_daily.csv` para Israel (código `IS`)
- [ ] **RSS Al Jazeera:** Script `feedparser` → guardar titulares en `rss_aljazeera.jsonl` (campo: `published`, `title`, `summary`)
- [ ] **RSS BBC Middle East:** Script `feedparser` → guardar en `rss_bbc.jsonl`

### Sub-Fase 1.C — Señal Física (Core del Proyecto)
- [ ] **OpenSky — Extender histórico:** El `opensky.db` actual solo tiene datos de 2026-04-27 (1 solo día). Es **crítico** hacer queries retrospectivas a la API para cubrir al menos los últimos 6 meses. Script: `scripts/data_extraction.py → fetch_opensky_historical()`
- [ ] **Regiones a monitorear:** Definir bounding boxes exactas:
  - `iran`: lat[24,40], lon[44,64]
  - `israel_lebanon`: lat[29,34], lon[34,36]
  - `red_sea_gulf`: lat[10,30], lon[32,58]

### Sub-Fase 1.D — Señal Social (Opcional si el tiempo lo permite)
- [ ] **Telegram:** Extraer volumen de mensajes por hora de 3 canales de noticias de Medio Oriente (usar `Telethon`)
- [ ] Guardar en `data/raw/telegram_channels.jsonl`

### Checkpoint de Salida — FASE 1
> ✅ **No avanzar a Fase 2 hasta que:**
> 1. Los archivos `acled_iran.csv`, `gdelt_ir_daily.csv` y `opensky.db` (extendido) existan en `data/raw/`
> 2. El rango de fechas de las tres fuentes se solape en al menos **60 días**
> 3. El script `check_data_integrity.py` confirme que hay < 20% de nulos en las columnas clave: `total_fatalities`, `avg_tone`, `flights_airborne`

---

## FASE 2 — Ingeniería de Características (Feature Engineering)
**Estado: `PENDIENTE`**
**Objetivo:** Transformar datos crudos en predictores matemáticos que el modelo pueda entender.

### Unidad de Análisis
Una fila = Un día en una región (Irán o Israel).
El índice de la tabla será `(event_date, region)`.

### Características a Construir
**Grupo A — Señal Física (Core)**
- `flights_airborne_mean_7d`: Promedio de vuelos en vuelo en los últimos 7 días
- `flight_drop_index`: `(flights_airborne_today - flights_airborne_mean_7d) / flights_airborne_mean_7d` — Es la **estrella del proyecto**
- `flight_anomaly_flag`: Binario. 1 si `flight_drop_index < -0.30` (caída > 30%)
- `ground_flight_ratio`: Razón vuelos en tierra / vuelos en el aire (proxy de alerta)

**Grupo B — Señal Mediática**
- `gdelt_tone_lag1`: Tono de GDELT del día anterior
- `gdelt_tone_lag3`: Tono de 3 días atrás
- `gdelt_mentions_7d_sum`: Total de menciones en los últimos 7 días
- `high_conflict_events_lag1`: Eventos de alta conflictividad del día anterior
- `rss_urgency_score`: Score Naive Bayes de urgencia de los titulares RSS del día

**Grupo C — Variables de Control**
- `day_of_week`: 0-6 (los ataques tienen patrones semanales)
- `is_ramadan`: Binario (período de mayor sensibilidad)
- `fatalities_lag1`, `fatalities_lag7`: Variable objetivo rezagada (autoregresivo)

### Tareas
- [ ] Crear `scripts/feature_engineering.py` con todas las funciones anteriores
- [ ] Crear `notebooks/03_feature_engineering.ipynb` para visualizar y validar cada feature
- [ ] Generar `data/processed/master_table.csv` con todas las columnas

### Checkpoint de Salida — FASE 2
> ✅ **No avanzar a Fase 3 hasta que:**
> 1. `master_table.csv` exista con al menos 120 filas sin nulos en los Grupos A y B
> 2. La correlación de Pearson entre `flight_drop_index` y `total_fatalities` sea calculada y documentada en `notebooks/03_feature_engineering.ipynb`
> 3. Si `|r| < 0.15`, considerar redefinir la feature o añadir más fuentes antes de modelar

---

## FASE 3 — Modelado y Comparación
**Estado: `PENDIENTE`**
**Objetivo:** Entrenar y comparar los modelos exigidos por la rúbrica (mínimo 3).

### Estrategia de Validación
**Obligatoria: Validación Temporal (Walk-Forward)**
- Train: 2025-11-01 → 2026-03-31
- Test: 2026-04-01 → 2026-05-13
- NO usar `train_test_split` aleatorio (sería hacer trampa con datos futuros)

### Modelos a Entrenar
| # | Modelo | Tipo | Justificación Académica |
|---|--------|------|------------------------|
| 1 | K-Nearest Neighbors (KNN) | Clasificación/Regresión | Visto en clase, intuitivo |
| 2 | Regresión Logística (multinomial) | Clasificación | Visto en clase, interpretable |
| 3 | Naive Bayes (GaussianNB) | Clasificación | Visto en clase, buen baseline para texto |
| 4 | Random Forest | Clasificación/Regresión | Robusto, importancia de features |
| 5 | HistGradientBoosting | Regresión | Mejor precisión esperada |

### Variable Objetivo
Clasificación en 3 niveles de alerta:
- `0` = Sin muertes (fatalities = 0)
- `1` = Baja intensidad (1–10 muertes)
- `2` = Alta intensidad (> 10 muertes)

### Tareas
- [ ] Crear `scripts/train_models.py` con pipeline de entrenamiento reproducible
- [ ] Crear `notebooks/04_model_comparison.ipynb` con métricas para cada modelo
- [ ] Guardar todos los modelos en `models/` (`.pkl`)
- [ ] Documentar Feature Importance de Random Forest
- [ ] Generar `data/processed/model_results.json` con predicciones del período de test

### Métricas a Reportar
- Accuracy, Precision, Recall, F1-Score (macro)
- Matriz de Confusión por modelo
- Curva ROC si aplica

### Checkpoint de Salida — FASE 3
> ✅ **No avanzar a Fase 4 hasta que:**
> 1. Los 5 modelos estén entrenados y sus métricas documentadas en el notebook
> 2. Al menos 1 modelo supere al baseline Naive Bayes en F1-Score
> 3. `model_results.json` exista y tenga el formato `{date, region, predicted_level, confidence}`
> 4. El análisis de importancia confirme si `flight_drop_index` está entre los top-5 predictores

---

## FASE 4 — Dashboard Interactivo
**Estado: `PENDIENTE`**
**Objetivo:** Construir la interfaz visual táctica que integre modelo + datos en tiempo real.

### Stack Tecnológico
- **Mapa:** MapLibre GL JS (renderizado 3D, capas de calor)
- **Gráficas:** ECharts (línea de tráfico aéreo, barra de severidad)
- **DB en Browser:** sql.js (lectura de `database.sqlite` sin servidor)
- **Datos dinámicos:** `fetch('data/model_results.json')` (actualizado por GitHub Actions)
- **Despliegue:** Netlify (dominio gratuito `*.netlify.app`)

### Componentes del Dashboard
1. **Header:** Contador en vivo de días del conflicto + indicador de nivel de alerta actual
2. **Mapa Táctico (centro):** Eventos ACLED/UCDP como círculos de calor + rastros de vuelos de OpenSky
3. **Panel Izquierdo:** Gráfica de línea "Tráfico Aéreo vs. Bajas" — el gráfico estrella del proyecto
4. **Panel Derecho:** Predicción del modelo para las próximas 24h + barra de confianza
5. **Ticker Inferior:** Feed RSS en tiempo real con score de urgencia

### Tareas
- [ ] Crear `dashboard/index.html` con estructura base
- [ ] Crear `dashboard/assets/style.css` (tema dark/cyber)
- [ ] Crear `dashboard/assets/map.js` (capa de MapLibre)
- [ ] Crear `dashboard/assets/app.js` (lógica de charts y predicciones)
- [ ] Crear `scripts/export_dashboard_data.py` (genera los JSON para el dash)
- [ ] Configurar `netlify.toml` en la raíz del repo
- [ ] Conectar repo a Netlify y hacer primer deploy

### Checkpoint de Salida — FASE 4
> ✅ **No entregar hasta que:**
> 1. El dashboard cargue en Netlify en < 4 segundos
> 2. El mapa muestre al menos 10 eventos históricos correctamente geocodificados
> 3. La gráfica de tráfico aéreo muestre la anomalía del `flight_drop_index`
> 4. El panel de predicción muestre el nivel de alerta correcto para el período de test

---

## FASE 5 — Automatización y Producción
**Estado: `PENDIENTE`**
**Objetivo:** Hacer que el dashboard se actualice solo, sin intervención manual.

### Tareas
- [ ] Crear `.github/workflows/update_data.yml` con cron job cada 6 horas
- [ ] El workflow ejecuta: `scripts/run_pipeline.py` → extrae datos → corre modelo → genera `model_results.json` → hace commit automático
- [ ] Configurar Netlify para que haga redeploy automático en cada push a `main`
- [ ] Probar el ciclo completo end-to-end

### Checkpoint de Salida — FASE 5
> ✅ **Proyecto completo cuando:**
> 1. El workflow de GitHub Actions haya corrido exitosamente al menos 3 veces
> 2. La URL de Netlify sea pública y funcional
> 3. Los datos del dashboard tengan menos de 12 horas de antigüedad en el momento de la entrega

---

## Requerimientos Innegociables del Curso (Rúbrica)
| Criterio | Solución en este Plan |
|---|---|
| Mínimo 3 fuentes abiertas | OpenSky, ACLED/UCDP, GDELT + RSS (4–5 fuentes) |
| Mínimo 3 modelos comparados | KNN, Regresión Logística, Naive Bayes, Random Forest, HistGB |
| Entregable HTML interactivo | Dashboard en Netlify (Fase 4) |
| Pregunta de ML clara | "¿Predice mejor el silencio aéreo (OpenSky) que el tono mediático (GDELT)?" |

---

## Estado General del Proyecto

| Fase | Nombre | Estado |
|------|--------|--------|
| 0 | Fundación y Diagnóstico | 🟡 En Progreso |
| 1 | Ingesta del Data Lake | ⬜ Pendiente |
| 2 | Feature Engineering | ⬜ Pendiente |
| 3 | Modelado y Comparación | ⬜ Pendiente |
| 4 | Dashboard Interactivo | ⬜ Pendiente |
| 5 | Automatización y Producción | ⬜ Pendiente |

*Última actualización: 2026-05-13*
