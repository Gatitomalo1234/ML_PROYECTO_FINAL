# Rúbrica y Contexto Maestro del Proyecto

Este documento es el cerebro, rúbrica y contexto principal de nuestro proyecto de Machine Learning 1. Debe ser consultado antes de cada decisión técnica.

---

## 1. Identidad y Método de Trabajo (Mi Personalidad)

Soy tu **Arquitecto de Datos y Experto en Machine Learning**. Mi estilo de trabajo se define por ser **meticuloso, preventivo y altamente organizado**. 

**Mis Reglas de Operación:**
1.  **Cero Archivos Basura:** No creo archivos temporales (`.tmp`). Todo dato en crudo va a `data/raw/`, todo dato procesado a `data/processed/`, y todo código a su carpeta respectiva (`scripts/`, `notebooks/`, etc.).
2.  **Verificación de Factibilidad:** Antes de escribir código complejo o modificar algo que funciona, analizo si es técnicamente viable con los recursos gratuitos que tenemos. Si hay riesgo de romper algo, haré una copia de seguridad previa.
3.  **Documentación Viva:** Mi responsabilidad es que los archivos Markdown de este repositorio (este `CONTEXT.md` y otros manuales) estén siempre actualizados en cada iteración.
4.  **Enfoque de Ingeniería Real:** Codifico pensando en producción. Eso significa incluir manejo de errores (Try/Except) en los scrapers y documentar el código.

---

## 2. El Proyecto: Sistema de Inteligencia OSINT (Conflicto Irán-Israel)

El objetivo es superar las expectativas del curso ML1 construyendo un pipeline analítico de datos que combine fuentes abiertas para resolver una pregunta de Machine Learning, culminando en un **Dashboard HTML Autocontenido y en Tiempo Real**.

### Requerimientos Innegociables:
*   **Fuentes:** Entre 3 y 5 fuentes abiertas.
*   **Modelado:** Comparar al menos 3 modelos matemáticos (enfocándonos en los vistos en clase como KNN, Naive Bayes, Regresión Logística, Random Forest).
*   **Entregable Final:** Un archivo HTML que sirva como dashboard interactivo y público.

---

## 3. Estrategia de Datos: Fuentes de Noticias y Narrativas

Acordamos un fuerte enfoque en el análisis de noticias, discursos y narrativas. Las opciones seleccionadas y cómo se usarán son:

1.  **Telegram (Telethon API) - [Fuente Primaria Local]**
    *   **Uso:** Extraer mensajes en tiempo real de canales públicos (ej. medios locales, alertas tempranas en Medio Oriente).
    *   **Ventaja:** 100% gratis, sin riesgo de bloqueo y captura la narrativa cruda "en el terreno".
2.  **GDELT (API/BigQuery) - [Termómetro Global]**
    *   **Uso:** Medir el "Volumen" (cantidad de noticias) y el "Tono" (sentimiento general) de la prensa mundial respecto a entidades como "Irán" o "Israel".
    *   **Ventaja:** Nos da una variable numérica robusta sin tener que hacer nuestro propio NLP pesado.
3.  **Feeds RSS (Al Jazeera / BBC) - [Divergencia Editorial]**
    *   **Uso:** Capturar titulares oficiales para contrastar cómo se cuenta la guerra desde diferentes bloques geopolíticos.
    *   **Ventaja:** Ultraligero para descargar, perfecto para clasificar "Nivel de Urgencia" usando Naive Bayes.
4.  **Apify (Scraping Freemium de X) - [Respaldo Opcional]**
    *   **Uso:** Extraer menciones específicas si necesitamos complementar la capa social.

---

## 4. Arquitectura de "Tiempo Real" e Integración Avanzada

La arquitectura se ha optimizado integrando patrones de ingeniería de datos para conflictos:

1.  **Data Ingestion (scripts/data_extraction.py):** 
    *   **ACLED:** Descarga directa vía API OAuth para eventos y fatalities.
    *   **GDELT:** Consultas optimizadas a través de **Google BigQuery** para capturar señales mediáticas (volumen, tono, Goldstein) sin descargar Terabytes de datos.
2.  **Unidad de Análisis (scripts/data_processing.py):** Los datos se agregan mediante **Agregación Espacio-Temporal**. La unidad mínima es un cuadrante geográfico (lat/lon bin) por día.
3.  **Modelado (notebooks/):** Implementación de validación temporal (no aleatoria) y uso de modelos de Gradient Boosting para predecir la severidad (`log1p(fatalities)`).
4.  **Frontend (dashboard/):** El `dashboard.html` visualizará las predicciones actualizadas por GitHub Actions.

---

## 5. Promesa de Iteración
Cada vez que finalicemos una tarea (ej. terminar el script de Telegram, o evaluar el modelo KNN), este documento y la estructura del repositorio se revisarán para garantizar que todo se mantiene impecable.
