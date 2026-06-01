# Que nos falta - Plan de accion del proyecto

Estado revisado: 2026-06-01

## DECISION FINAL: OpenSky descartado como predictor y como mapa interactivo

`data/raw/opensky.db` contiene un unico snapshot del 2026-04-27 (261 registros de `flight_states`).
Sin historico continuo de al menos 30 dias no es posible calcular el `flight_drop_index` ni construir
un mapa interactivo con valor analitico real.

**Decision:** OpenSky queda documentado como fuente consultada pero NO se usa en ningun modelo
ni se construye mapa interactivo de vuelos. La seccion "INTELIGENCIA AEREA" del dashboard
usa datos ilustrativos y lo indica con un badge visible ("DATOS ILUSTRATIVOS").

Esto esta documentado en: README.md (seccion Fuentes y Limitaciones) y en el badge del dashboard.

---

Este documento aterriza el trabajo pendiente del proyecto ML1. La prioridad inmediata es dejar de depender de datos simulados y construir una base real en `data/raw/` para poder pasar a feature engineering, modelos y dashboard.

---

## 1. Diagnostico rapido

### Lo que si existe

| Componente | Estado |
|---|---|
| Dashboard 3D cinematografico en `dashboard/` | Existe, pero trabaja con datos mock |
| `scripts/data_extraction.py` | Existe para ACLED, GDELT BigQuery y UCDP, pero el `main` no ejecuta descargas |
| `scripts/data_processing.py` | Existe para procesar ACLED/UCDP y unir ACLED con GDELT |
| `notebooks/01_pipeline_acled_gdelt.ipynb` | Existe |
| Documentacion de contexto y plan maestro | Existe |
| `data/raw/` y `data/processed/` | Existen, pero estan vacios salvo `.gitkeep` |

### Lo critico que falta

| Bloque | Faltante principal | Prioridad |
|---|---|---|
| Datos reales | ACLED, GDELT, RSS y OpenSky historico en `data/raw/` | P0 |
| Integridad | Script que reporte cobertura, nulos y rangos de fechas | P0 |
| Tabla maestra | `data/processed/master_table.csv` con una fila por fecha-region | P0 |
| Modelos | KNN, LogReg/Naive Bayes, Random Forest y comparacion | P0 |
| Notebooks | EDA, feature engineering y comparacion de modelos | P0 |
| Dashboard real | Exportar predicciones y reemplazar mocks | P1 |
| Deploy | URL publica en Vercel/Netlify | P1 |

---

## 2. Decision de enfoque

Si el tiempo es limitado, el proyecto debe avanzar en este orden:

1. Extraer datos reales.
2. Validar que las fuentes se solapen en fechas.
3. Construir una tabla maestra simple.
4. Entrenar 3 modelos aunque sean baseline.
5. Exportar resultados para el dashboard.

La extraccion de datos es el primer paso correcto. Sin archivos reales en `data/raw/`, todo lo demas queda como maqueta.

---

## 3. Plan de accion inmediato: extraccion de datos

### Objetivo de la primera jornada

Dejar en `data/raw/` al menos estas fuentes:

| Archivo esperado | Fuente | Obligatorio | Nota |
|---|---|---:|---|
| `acled_iran.csv` | ACLED API | Si | Ground truth de eventos y fatalities |
| `acled_israel.csv` | ACLED API | Si | Ground truth complementario |
| `gdelt_ir_daily.csv` | GDELT BigQuery | Si | Tono, menciones y eventos mediaticos |
| `gdelt_is_daily.csv` | GDELT BigQuery | Si | Comparacion regional |
| `rss_aljazeera.jsonl` | RSS | Si | Titulares y resumen |
| `rss_bbc.jsonl` | RSS | Si | Contraste editorial |
| `opensky.db` o `opensky_daily.csv` | OpenSky | Ideal | Senal fisica central; si no hay historico, usar plan B |

Rango recomendado inicial:

```text
2025-11-01 a 2026-05-30
```

Si alguna fuente limita el acceso, usar el mayor rango disponible y documentarlo en `data/processed/integrity_report.txt`.

---

## 4. Antes de extraer: credenciales y entorno

### Variables de entorno esperadas

Crear un `.env` local a partir de `.env.example` y completar lo que aplique:

```text
ACLED_EMAIL=
ACLED_KEY=
GCP_PROJECT_ID=
UCDP_TOKEN=
```

Notas:

| Fuente | Requiere credencial | Estado en script |
|---|---:|---|
| ACLED | Si | Implementado en `fetch_acled()` |
| GDELT BigQuery | Si, via Google Cloud | Implementado en `fetch_gdelt()` |
| UCDP | Si, opcional | Implementado en `fetch_ucdp()` |
| RSS | No | Falta implementar |
| OpenSky | No/Si, segun endpoint | Falta implementar historico robusto |

### Comandos base

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Despues de instalar, probar:

```powershell
python scripts/data_extraction.py
```

Hoy ese comando solo confirma que el modulo carga. Hay que modificar el `main` o crear un orquestador para ejecutar descargas reales.

---

## 5. Cambios concretos que hay que hacer en codigo

### 5.1. `scripts/data_extraction.py`

Acciones:

1. Activar parametros por CLI con `argparse`.
2. Permitir seleccionar fuente: `acled`, `gdelt`, `ucdp`, `rss`, `all`.
3. Agregar extractor RSS con `feedparser`.
4. Agregar manejo de errores por fuente para que una API fallida no tumbe todo el pipeline.
5. Guardar siempre en `data/raw/`.

Comando objetivo:

```powershell
python scripts/data_extraction.py --source all --start 2025-11-01 --end 2026-05-30
```

Salida esperada:

```text
data/raw/acled_iran.csv
data/raw/acled_israel.csv
data/raw/gdelt_ir_daily.csv
data/raw/gdelt_is_daily.csv
data/raw/rss_aljazeera.jsonl
data/raw/rss_bbc.jsonl
```

### 5.2. `scripts/check_data_integrity.py`

Crear este script antes de modelar.

Debe reportar:

| Chequeo | Resultado esperado |
|---|---|
| Archivos presentes | Lista de archivos encontrados/faltantes |
| Rango temporal por fuente | Fecha minima y maxima |
| Numero de filas | Filas por archivo |
| Nulos clave | Porcentaje de nulos en columnas importantes |
| Solape temporal | Fechas comunes entre ACLED, GDELT, RSS/OpenSky |

Salida objetivo:

```text
data/processed/integrity_report.txt
```

### 5.3. `scripts/data_processing.py`

Despues de extraer:

1. Agregar region (`iran`, `israel`) a cada fuente.
2. Agregar ACLED por `event_date` y `region`.
3. Agregar GDELT por `event_date` y `region`.
4. Convertir RSS a features diarias: conteo de titulares y score simple de urgencia.
5. Crear `data/processed/ground_truth.csv`.

---

## 6. Plan B si una fuente se bloquea

| Problema | Plan B |
|---|---|
| ACLED no funciona por credenciales | Usar UCDP como ground truth temporal y documentar limitacion |
| GDELT BigQuery no esta configurado | Usar GDELT API 2.0 o Google News RSS como proxy de volumen mediatico |
| OpenSky no entrega historico suficiente | Crear `opensky_daily.csv` con el dia disponible y marcar OpenSky como feature exploratoria, no como predictor principal |
| RSS devuelve pocos articulos | Ampliar con Google News RSS para `Iran Israel conflict` |

Para cumplir rubrica, minimo viable:

```text
ACLED/UCDP + GDELT/RSS + OpenSky/RSS adicional
```

---

## 7. Despues de extraer: tabla maestra minima

Crear `data/processed/master_table.csv` con una fila por dia-region.

Columnas minimas:

| Columna | Fuente |
|---|---|
| `event_date` | Todas |
| `region` | Derivada |
| `total_fatalities` | ACLED/UCDP |
| `event_count` | ACLED/UCDP |
| `gdelt_mentions` | GDELT |
| `avg_tone` | GDELT |
| `material_conflict_events` | GDELT |
| `high_conflict_events` | GDELT |
| `rss_article_count` | RSS |
| `rss_urgency_score` | RSS |
| `flights_airborne` | OpenSky, si existe |
| `flight_drop_index` | Feature engineering |
| `target_alert_level` | Derivada de fatalities |

Target sugerido:

```text
0 = sin muertes
1 = baja intensidad, 1 a 10 muertes
2 = alta intensidad, mas de 10 muertes
```

---

## 8. Notebooks que hay que crear

| Notebook | Proposito | Prioridad |
|---|---|---|
| `02_eda_opensky.ipynb` | Ver cobertura y anomalias de vuelos | P1 |
| `03_feature_engineering.ipynb` | Validar `flight_drop_index`, lags y RSS score | P0 |
| `04_model_comparison.ipynb` | Comparar minimo 3 modelos con metricas | P0 |
| `05_dashboard_preview.ipynb` | Revisar JSON final antes de dashboard | P1 |

El mas importante para la nota es `04_model_comparison.ipynb`.

Debe incluir:

| Metrica | Requerida |
|---|---:|
| Accuracy | Si |
| Precision macro | Si |
| Recall macro | Si |
| F1 macro | Si |
| Matriz de confusion | Si |
| Feature importance de Random Forest | Si |

---

## 9. Modelos minimos

Entrenar al menos:

| Modelo | Archivo esperado |
|---|---|
| KNN | `models/baseline_knn.pkl` |
| Regresion Logistica | `models/baseline_logreg.pkl` |
| Naive Bayes o Random Forest | `models/random_forest.pkl` |
| Mejor modelo | `models/best_model.pkl` |

Validacion recomendada:

```text
Train: 2025-11-01 a 2026-03-31
Test:  2026-04-01 a 2026-05-30
```

Evitar `train_test_split` aleatorio porque mezcla futuro con pasado.

---

## 10. Conexion con dashboard

El dashboard hoy usa datos simulados. El objetivo es producir:

```text
data/processed/model_results.json
```

Formato:

```json
[
  {
    "date": "2026-05-30",
    "region": "iran",
    "predicted_level": 1,
    "confidence": 0.72
  }
]
```

Pendiente luego:

1. Crear `scripts/export_dashboard_data.py`.
2. Copiar/exportar JSON a una ruta servible por el dashboard.
3. Hacer que el frontend llame `fetch('/data/model_results.json')`.
4. Reemplazar el indicador de datos simulados por estado real.

---

## 11. Checklist operativo P0

### Dia 1: extraccion y diagnostico

- [ ] Completar `.env`.
- [ ] Instalar dependencias.
- [ ] Modificar `scripts/data_extraction.py` para ejecutar ACLED, GDELT y RSS por CLI.
- [ ] Ejecutar extraccion para Iran e Israel.
- [ ] Verificar que `data/raw/` tenga archivos reales.
- [ ] Crear `scripts/check_data_integrity.py`.
- [ ] Generar `data/processed/integrity_report.txt`.

### Dia 2: procesamiento y tabla maestra

- [ ] Crear `ground_truth.csv`.
- [ ] Agregar GDELT por dia-region.
- [ ] Convertir RSS a features diarias.
- [ ] Crear `master_table.csv`.
- [ ] Documentar cobertura y nulos.

### Dia 3: modelos y notebook de rubrica

- [ ] Crear `scripts/train_models.py`.
- [ ] Entrenar 3 modelos.
- [ ] Guardar `.pkl` en `models/`.
- [ ] Crear `04_model_comparison.ipynb`.
- [ ] Exportar `model_results.json`.

### Dia 4: dashboard y entrega

- [ ] Conectar dashboard a `model_results.json`.
- [ ] Verificar visualmente paneles.
- [ ] Deploy en Vercel/Netlify.
- [ ] Pegar URL publica en la documentacion de entrega.

---

## 12. Proxima accion recomendada

Empezar por este cambio:

```text
Crear/editar scripts/data_extraction.py para que realmente descargue:
ACLED Iran + ACLED Israel + GDELT IR + GDELT IS + RSS Al Jazeera + RSS BBC.
```

Primer criterio de exito:

```text
data/raw/ deja de estar vacio y check_data_integrity.py confirma al menos 60 dias de solape temporal entre fuentes.
```
