# Sistema de Inteligencia OSINT — Conflicto Irán–Israel 2026

**Curso:** Machine Learning 1 · Pregrado en Ciencia de Datos  
**Universidad:** Externado de Colombia  
**Equipo:** Nicolás Cárdenas · Miguel Camargo  
**Dashboard:** [Ver en vivo →](https://ais-osint.netlify.app) *(URL de producción)*

---

## Pregunta de investigación

> ¿Es posible predecir si un evento armado en el conflicto Irán–Israel–EE.UU. resultará en víctimas fatales, usando exclusivamente fuentes abiertas y gratuitas?

**Tarea de ML:** Clasificación binaria — `P(fatalities > 0 | evento armado)`  
**Unidad de análisis:** Evento armado individual (ataque, misil, drone, intercepcción)  
**Período:** Enero–Mayo 2026

---

## Fuentes de datos

| Fuente | Tipo | Qué aporta |
|--------|------|-----------|
| **ACLED** | Estructurada / API | Ground truth de eventos armados, actores, fechas, coordenadas y fatalidades |
| **IranWarLive / GDELT Cloud** | Textual / feed | Titulares y registros de 2026; embeddings semánticos via PCA |
| **OpenSky Network** | Operacional / API | Estados de vuelos en espacio aéreo MENA (snapshot 2026-04-27) |
| **UKMTO** | Contexto marítimo | Incidentes en Estrecho de Ormuz y Golfo Pérsico |

---

## Modelos comparados

| Modelo | ROC-AUC | F1 | Recall | Precision |
|--------|--------:|---:|-------:|----------:|
| Regresión Logística L1 (principal) | 0.705 | 0.429 | 0.750 | 0.300 |
| KNN k=15 con distancia ponderada | 0.642 | 0.268 | 0.250 | 0.289 |
| Gaussian Naive Bayes (baseline) | 0.556 | 0.368 | 1.000 | 0.226 |

Validación temporal: entrenamiento en eventos hasta abril 2026, prueba en mayo 2026.  
La Regresión Logística L1 con `class_weight="balanced"` obtiene el mejor balance F1/ROC-AUC y es el modelo principal.

---

## Estructura del repositorio

```
├── data/
│   ├── raw/              # Datos crudos (gitignored — ver instrucciones abajo)
│   │   └── opensky.db    # Estados de vuelos OpenSky (incluido, 2026-04-27)
│   └── processed/        # Artefactos procesados (gitignored)
│       └── database.sqlite
├── models/               # Modelos entrenados .joblib (gitignored)
├── notebooks/
│   ├── 01_pipeline_acled_gdelt.ipynb        # Pipeline de ingesta
│   ├── 02_eda_logistica_2026_executed.ipynb # EDA del dataset de modelado
│   ├── 03_modelo_logistico_2026_executed.ipynb # Variantes LogReg L1/L2
│   └── 04_model_comparison.ipynb            # Comparación LogReg vs KNN vs NaiveBayes
├── scripts/
│   ├── data_extraction.py       # Descarga ACLED, GDELT, RSS
│   ├── data_processing.py       # Procesamiento y merge espacio-temporal
│   ├── train_logreg_2026.py     # Entrenamiento Regresión Logística
│   └── compare_classifiers_2026.py  # Comparación de 3 clasificadores
├── reports/
│   ├── comparacion_modelos_clasificacion_2026.md
│   └── figures/                 # Curvas ROC, PR, matrices de confusión
├── dashboard/                   # Aplicación Next.js (frontend)
│   └── public/data/             # JSON exportados para el dashboard
├── contexto/                    # Documentación metodológica
├── requirements.txt
└── netlify.toml
```

---

## Instalación y ejecución local

### 1. Clonar y preparar entorno

```bash
git clone <url-del-repo>
cd "Proyecto Final ML"

python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

### 2. Configurar credenciales (para reproducir la extracción de datos)

Crear un archivo `.env` en la raíz:

```env
ACLED_EMAIL=tu@email.com
ACLED_KEY=tu_api_key
GCP_PROJECT_ID=tu_proyecto_bigquery
```

Las credenciales de ACLED se obtienen en [acleddata.com](https://acleddata.com/register/).  
Google BigQuery requiere una cuenta de servicio con acceso a `gdelt-bq`.

### 3. Reproducir el dataset (opcional — los datos procesados están gitignored)

```bash
# Extracción de datos (requiere .env configurado)
python scripts/data_extraction.py --source acled --start 2026-01-01 --end 2026-05-31

# Procesamiento y construcción del dataset de modelado
python scripts/data_processing.py

# Entrenamiento de modelos
python scripts/train_logreg_2026.py
python scripts/compare_classifiers_2026.py
```

### 4. Ejecutar el dashboard localmente

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:3000
```

### 5. Ejecutar los notebooks

```bash
jupyter lab
```

Orden recomendado:
1. `01_pipeline_acled_gdelt.ipynb` — cómo se construye el dataset
2. `02_eda_logistica_2026_executed.ipynb` — análisis exploratorio
3. `03_modelo_logistico_2026_executed.ipynb` — variantes de LogReg
4. `04_model_comparison.ipynb` — comparación final de los 3 modelos

---

## Hallazgos principales

- **La señal existe:** ROC-AUC 0.705 en validación temporal indica que los patrones observados hasta abril predicen parte del comportamiento de mayo.
- **El tipo de objetivo importa más que el arma:** `target_type_civilian` es el coeficiente más alto (+0.88); ataques a civiles elevan fuertemente la probabilidad de fatalidades.
- **El trade-off precision/recall es central:** Con umbral 0.5 la LogReg L1 recupera el 75% de los eventos letales con 30% de precisión. Subir el umbral mejora precisión pero pierde eventos reales.
- **Naive Bayes como límite superior de recall:** Con recall perfecto (1.0) pero 151 falsas alarmas, sirve como cota superior de detección bruta.

## Limitaciones

- **Cobertura de OpenSky:** Solo 1 snapshot del 27 de abril de 2026. No fue posible obtener histórico suficiente para construir el `flight_drop_index` como predictor principal.
- **Sesgo de reporteo ACLED:** Los eventos con víctimas tienen mayor cobertura mediática y mayor probabilidad de aparecer en ACLED. El modelo puede estar aprendiendo también visibilidad mediática, no solo riesgo real.
- **Distribución 2024-2025 vs 2026:** Las tasas de letalidad difieren significativamente entre períodos, por eso el modelo se restringe a 2026.
- **Target binario simplificado:** Se modela `fatalities > 0` en lugar de número de víctimas. Esto pierde información sobre la severidad del evento.
- **Validación temporal limitada:** Solo mayo 2026 como conjunto de prueba (213 eventos). Un período más largo daría mayor robustez estadística a las métricas.

---

## Despliegue

El dashboard está desplegado en Netlify con build automático desde `main`.  
Configuración en `netlify.toml`: base `dashboard/`, comando `npm run build`.
