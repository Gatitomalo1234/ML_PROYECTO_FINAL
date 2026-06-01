# Sistema de Inteligencia OSINT — Conflicto Irán–Israel 2026

**Curso:** Machine Learning 1 · Pregrado en Ciencia de Datos  
**Universidad:** Externado de Colombia · Docente: Julián Zuluaga  
**Equipo NIAN:** Nicolás Cárdenas · Miguel Camargo  
**Dashboard en producción:** [ais-osint.netlify.app](https://ais-osint.netlify.app)

---

## Pregunta de investigación

> ¿Es posible predecir si un evento armado en el conflicto Irán–Israel–EE.UU. resultará en víctimas fatales, usando exclusivamente fuentes abiertas y gratuitas?

**Tarea de ML:** Clasificación binaria — `target_logistico = 1 si fatalities > 0`  
**Unidad de análisis:** Evento armado individual (ataque, misil, drone, intercepcción)  
**Período:** Enero–Mayo 2026  
**Respuesta:** Parcialmente sí. ROC-AUC 0.705 en validación temporal.

---

## Fuentes de datos

| Fuente | Tipo | Cobertura | Qué aportó |
|--------|------|-----------|-----------|
| **ACLED** | Estructurada / API | 2024–2026 | Ground truth de eventos armados: actores, fechas, coordenadas, fatalidades |
| **IranWarLive** | Feed estructurado | Ene–May 2026 | Strikes, misiles, drones, objetivos — datos de 2026 con alta cobertura |
| **GDELT Cloud** | API textual | 2024–2026 | Embeddings semánticos del texto de cada evento via TF-IDF + PCA |
| **OpenSky Network** | API operacional | Snapshot 2026-04-27 | Estados de vuelos en espacio aéreo MENA (261 registros) |

> **Nota OpenSky:** Solo existe 1 snapshot del 27-04-2026. Sin histórico continuo fue imposible calcular el `flight_drop_index`. OpenSky queda documentado como fuente consultada pero no alimenta ningún modelo.

**Dataset final:** `data/processed/database.sqlite` — 15,755 eventos totales (2024–2026), 3,771 de 2026, 20 tablas con fuentes integradas.

---

## Pipeline de datos

```
data/raw/                          data/processed/
  opensky.db (snapshot)              database.sqlite (feature store)
  acled / gdelt / iranwarlive  →     event_model_table
  (vía scripts/)                     model3_embeddings_dataset.csv
                                     (generado al correr scripts)
```

**Orden de ejecución para reproducir:**

```bash
python scripts/data_extraction.py       # descarga fuentes (requiere .env)
python scripts/build_database.py        # construye database.sqlite
python scripts/prepare_modeling_dataset.py   # genera datasets de modelos
python scripts/generate_text_embeddings.py   # añade emb_pca_1..20 via TF-IDF+SVD
python scripts/train_logreg_2026.py     # entrena y evalúa LogReg L1
python scripts/compare_classifiers_2026.py   # compara 3 modelos
```

---

## Feature engineering

El dataset de modelado (`core_interpretable`) excluye `emb_pca_*` y `actor_pair` para maximizar interpretabilidad. Las variables clave son:

| Grupo | Variables |
|-------|-----------|
| **Geográficas** | `country`, `region`, `latitude`, `longitude` |
| **Evento** | `event_type`, `sub_event_type`, `weapon_type`, `target_type`, `civilian_targeting` |
| **Actores** | `actor1`, `actor2`, `attacker_category`, `attacker_is_iran/israel/hezbollah/houthi/us` |
| **Armas** | `is_drone`, `is_missile`, `is_airstrike`, `is_explosive_ied`, `is_interception` |
| **Temporales retrospectivas** | `past_attacks_7d/30d`, `past_fatalities_7d/30d`, `days_since_last_attack` |
| **Texto reducido** | `emb_pca_1..20` (TF-IDF + SVD sobre descripción del evento) |

**Target:** `target_logistico = 1 si fatalities > 0` — clasificación binaria de letalidad.

---

## Modelos comparados

**Estrategia de validación temporal (sin data leakage):**
- Train: eventos 2026 hasta abril inclusive
- Test: eventos 2026 de mayo (213 eventos, 20.7% letales)

### Resultados en test temporal (mayo 2026)

| Modelo | Accuracy | Bal. Acc. | Precision | Recall | F1 | ROC-AUC | Avg Precision |
|--------|:--------:|:---------:|:---------:|:------:|:--:|:-------:|:-------------:|
| **Logistic Regression L1** ← principal | 0.587 | 0.647 | 0.300 | **0.750** | **0.429** | **0.705** | **0.413** |
| KNN k=15 (distancia ponderada) | 0.718 | 0.545 | 0.289 | 0.250 | 0.268 | 0.642 | 0.295 |
| Gaussian Naive Bayes (baseline) | 0.291 | 0.553 | 0.226 | 1.000 | 0.368 | 0.556 | 0.227 |

### Selección del modelo principal

**Logistic Regression L1** (`C=0.1`, `class_weight="balanced"`, `solver="saga"`):
- Mejor F1 (0.429), ROC-AUC (0.705) y Average Precision (0.413)
- Recupera el **75% de los eventos letales** reales (Recall 0.75)
- L1 selecciona **33 variables de 157 codificadas** → modelo interpretable
- KNN: solo captura 25% de letales (Recall 0.250) — inaceptable para alerta temprana
- NaiveBayes: recall perfecto pero 151 falsas alarmas (precisión 22.6%)

---

## Hallazgos principales

**1. El tipo de objetivo supera al tipo de arma**  
`target_type_civilian` tiene el coeficiente más alto (+0.88 log-odds). Atacar civiles eleva la probabilidad de fatalidades más que cualquier categoría de armamento. `is_airstrike` (+0.24) y `country_Iraq` (+0.40) también contribuyen positivamente.

**2. Factores que reducen la probabilidad de letalidad**  
`country_Israel` (-0.63) e `is_interception` (-0.20): eventos en Israel y eventos de intercepcción tienen menor probabilidad de causar víctimas. Consistente con la capacidad defensiva del Iron Dome.

**3. La señal predictiva existe**  
ROC-AUC 0.705 > 0.5 del clasificador aleatorio. Con fuentes abiertas es posible anticipar el 75% de los eventos letales con 3 semanas de horizonte temporal.

**4. El desbalance de clases es crítico**  
Train: 12.9% de eventos letales. Test mayo: 20.7%. Sin `class_weight="balanced"` el modelo colapsa hacia la clase mayoritaria. El ajuste de pesos de clase es la intervención más importante del pipeline.

---

## Análisis de errores

Con umbral 0.5 en test temporal (mayo 2026):

| | Predicho 0 | Predicho 1 |
|--|:--:|:--:|
| **Real 0** (no letal) | TN = 92 | FP = 77 |
| **Real 1** (letal) | FN = 11 | TP = 33 |

- **77 falsas alarmas:** principalmente eventos de tipo `Shelling/Artillery` y `Armed Clash` sin víctimas reportadas — el modelo los sobreestima por su perfil de variables similar a eventos letales.
- **11 eventos letales perdidos:** eventos con actores inusuales y bajo historial de ataques previos — el modelo no los detecta por falta de señal retrospectiva.

---

## Dashboard

El dashboard es una experiencia cinematográfica interactiva construida en **Next.js + Three.js** que cuenta visualmente la historia del proyecto.

**Flujo de la experiencia:**
```
Boot (logo 3D NIAN) → Tipografía → Narrativa del proyecto (5 nodos) →
Revelación de la Tierra 3D → Activación del espacio aéreo → Órbita estratégica →
Vuelo al conflicto → Bloqueo de conflicto (misil) → Dashboard táctico →
Resumen final (hallazgos + créditos)
```

**Secciones del dashboard táctico (COMMAND_CENTER):**
- **Mapa Folium** — 120 eventos reales geocodificados con severidad (CRITICAL/HIGH/MEDIUM)
- **Reporte de inteligencia** — detalle del evento seleccionado: tipo, fatalidades, actores, fuente
- **Análisis ML** — comparación interactiva de los 3 modelos: selector de modelo, métrica y split temporal/CV. Radar chart + barras + curvas PR/ROC

**Datos en el dashboard:**
- `public/data/conflict_events_2026.json` — 120 eventos reales
- `public/data/model_results.json` — predicciones del modelo para mayo 2026
- `public/data/operational_map_2026.html` — mapa Folium generado con Folium

**Stack técnico:**
- Frontend: Next.js 14, Three.js, @react-three/fiber, Framer Motion, Tailwind CSS
- Mapa: Folium (Python) exportado a HTML estático
- Gráficas: SVG custom + Recharts
- Deploy: Netlify (build automático desde `main`)

---

## Estructura del repositorio

```
├── README.md                              ← este archivo
├── requirements.txt                       ← dependencias Python
├── netlify.toml                           ← config deploy Netlify
│
├── data/
│   ├── raw/opensky.db                     ← snapshot OpenSky 2026-04-27
│   └── processed/database.sqlite          ← feature store (28MB, 20 tablas)
│
├── notebooks/
│   ├── 01_pipeline_acled_gdelt.ipynb      ← pipeline de ingesta
│   ├── 02_eda_logistica_2026_executed.ipynb ← EDA con outputs reales
│   ├── 03_modelo_logistico_2026_executed.ipynb ← variantes LogReg L1/L2
│   └── 04_model_comparison.ipynb          ← comparación final 3 modelos (ejecutado)
│
├── scripts/
│   ├── data_extraction.py                 ← descarga ACLED, GDELT, RSS
│   ├── build_database.py                  ← construye database.sqlite
│   ├── data_processing.py                 ← procesamiento y merge
│   ├── prepare_modeling_dataset.py        ← feature engineering
│   ├── generate_text_embeddings.py        ← TF-IDF + SVD embeddings
│   ├── train_logreg_2026.py               ← entrenamiento LogReg L1/L2
│   ├── compare_classifiers_2026.py        ← comparación 3 modelos
│   ├── export_conflict_events.py          ← exporta JSON para dashboard
│   └── generate_classification_visualizations_2026.py ← figuras
│
├── reports/
│   ├── comparacion_modelos_clasificacion_2026.md
│   └── figures/                           ← 15 figuras: ROC, PR, matrices, coefs
│
└── dashboard/                             ← aplicación Next.js completa
    ├── src/
    │   ├── components/                    ← scene 3D, UI panels, analysis charts
    │   ├── hooks/                         ← scroll, audio, parallax
    │   ├── state/                         ← Zustand store
    │   └── systems/                       ← ExperienceController
    └── public/
        ├── data/                          ← JSONs y mapa Folium
        ├── audio/                         ← efectos de sonido
        └── textures/                      ← texturas 3D de la Tierra
```

---

## Instalación y ejecución local

### Requisitos
- Python 3.11+
- Node.js 20+
- Credenciales ACLED (registro gratuito en acleddata.com)

### Backend / scripts

```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
pip install -r requirements.txt

# Configurar credenciales (crear .env a partir del ejemplo)
# ACLED_EMAIL, ACLED_KEY, GCP_PROJECT_ID

# Reproducir el dataset desde cero
python scripts/data_extraction.py
python scripts/build_database.py
python scripts/prepare_modeling_dataset.py
python scripts/generate_text_embeddings.py
python scripts/train_logreg_2026.py
python scripts/compare_classifiers_2026.py
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:3000
```

### Notebooks

```bash
jupyter lab
# Ejecutar en orden: 01 → 02 → 03 → 04
```

---

## Limitaciones

- **OpenSky descartado como predictor:** Solo 1 snapshot del 27-04-2026. Sin histórico no fue posible calcular `flight_drop_index`. La sección de inteligencia aérea del dashboard usa datos ilustrativos.
- **Sesgo de reporteo:** Eventos con víctimas tienen mayor cobertura mediática en ACLED/IranWarLive. El modelo puede estar aprendiendo visibilidad mediática además de riesgo real.
- **Target binario simplificado:** Se modela `fatalities > 0`. No se captura la severidad del evento (1 muerto vs 100 muertes).
- **Validación temporal limitada:** Solo mayo 2026 como test (213 eventos). Un período más largo daría mayor robustez estadística.
- **Distribución variable por período:** Train (ene–abr): 12.9% letal. Test (mayo): 20.7% letal. La escala de mayo fue más intensa que el período de entrenamiento.

---

## Equipo

**NIAN** · Nicolás Cárdenas & Miguel Camargo  
Machine Learning 1 · 2026-I · Universidad Externado de Colombia
