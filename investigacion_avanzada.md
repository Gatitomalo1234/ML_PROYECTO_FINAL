# Investigación Avanzada: OSINT, Tiempo Real y Preguntas Innovadoras de ML

Este documento recopila la investigación profunda sobre cómo extraer datos complejos (como X/Twitter), cómo montar una arquitectura de "Tiempo Real" 100% gratuita, y propone preguntas de Machine Learning que se salen del estándar común.

---

## 1. Extracción de Datos de X (Twitter) en 2026

Sacar datos de X se ha vuelto un desafío técnico inmenso debido a las medidas anti-bots y el cierre de la API gratuita. Las librerías clásicas como `snscrape` o `twint` ya no funcionan de forma fiable.

**Opciones Reales para nuestro proyecto:**
1.  **Apify (Recomendado):** Es una plataforma de scraping. Tienen "Actors" (scripts pre-hechos) para X que son muy estables. Tienen una capa gratuita mensual que es suficiente para extraer unos miles de tweets históricos o diarios sobre el conflicto Irán-Israel. Retorna un JSON limpio.
2.  **El "Cookie Method" (Python `curl_cffi`):** Implica abrir tu navegador, copiar tu `auth_token` y `ct0` (cookies) y usarlos en Python suplantando la huella digital del navegador. **Riesgo:** Alto riesgo de que suspendan tu cuenta personal. Hay que usar una cuenta "quemable" (falsa).
3.  **Alternativa OSINT (Bluesky / Telegram):** Muchos investigadores de OSINT se han mudado a Telegram (canales de noticias de Medio Oriente) o Bluesky. Telegram tiene una API gratuita (`Telethon`) muy amigable para extraer texto de canales públicos sin riesgo de baneo.

---

## 2. Arquitectura "Tiempo Real" 100% Gratuita

Para cumplir tu deseo de que sea "en tiempo real" y que el Dashboard sea un "HTML Autocontenido", usaremos una arquitectura conocida como **Git-as-a-Platform** (GitHub Actions + GitHub Pages).

### ¿Cómo funciona el flujo?
1.  **El Motor (GitHub Actions):** Escribimos un script de Python que descarga datos de ACLED, GDELT y Apify. Usamos un archivo YAML para decirle a GitHub Actions que ejecute este script automáticamente **cada hora** (usando un CRON job).
2.  **La Base de Datos (Git Commits):** El script en Python limpia los datos, corre el modelo de Machine Learning para generar predicciones, y guarda los resultados en un archivo `data/latest_predictions.json`. Luego, el script hace un `git commit` y `git push` de forma automática.
3.  **El Dashboard (HTML Autocontenido en GitHub Pages):**
    *   Diseñamos un archivo `index.html` (con Vanilla JS y CSS).
    *   Este HTML usa un simple `fetch('data/latest_predictions.json')` para leer los datos que GitHub Actions acaba de actualizar.
    *   Lo alojamos gratis en GitHub Pages.
    *   **Resultado:** Cada vez que entres a la URL, el HTML descargará el último JSON y verás gráficos en vivo, sin pagar un solo peso en servidores (cero costo de Streamlit, AWS o Heroku).

---

## 3. Preguntas Únicas de Machine Learning (Fuera de lo común)

En lugar de hacer la típica pregunta: *"¿Habrá un ataque mañana?"*, aquí hay propuestas mucho más interesantes, académicas y que descrestarán al profesor:

### A. La Teoría del "Silencio Predictivo" (Anomalías de Silencio)
*   **Pregunta:** *¿Puede un modelo de Machine Learning detectar caídas abruptas (silencios) en el tráfico aéreo comercial (OpenSky) o en la actividad de redes sociales locales, como un indicador líder predictivo de operaciones militares inminentes?*
*   **Modelo:** Algoritmos de detección de anomalías (Isolation Forest) o Regresión Logística.
*   **Por qué es innovador:** En guerra, el silencio es más diciente que el ruido. Antes de un ataque, el espacio aéreo se vacía y se cortan las comunicaciones.

### B. Divergencia de Narrativas (Guerra de Información)
*   **Pregunta:** *Utilizando Procesamiento de Lenguaje Natural (NLP), ¿se puede medir y predecir el nivel de escalada bélica calculando la "distancia" entre la narrativa de los medios oficiales estatales (RSS Al Jazeera) y el discurso público en redes sociales (Telegram/Twitter)?*
*   **Modelo:** Clasificación NLP (Naive Bayes) combinada con Distancia Coseno en Embeddings.
*   **Por qué es innovador:** Evalúa la guerra psicológica. Si la propaganda oficial se vuelve extremadamente agresiva pero la gente habla de miedo/refugios, el modelo cruza esas variables para predecir un ataque.

### C. Fusión Cruzada: Firmas Térmicas y Sentimiento
*   **Pregunta:** *¿En qué medida la fusión de datos físicos (Anomalías térmicas de NASA FIRMS) con el sentimiento mediático (GDELT) mejora la precisión para clasificar si un evento reportado es un ataque real o desinformación?*
*   **Modelo:** Random Forest o K-Nearest Neighbors (KNN).
*   **Por qué es innovador:** Cruza el mundo físico (fuego detectado por satélite) con el mundo digital (noticias) para validar la verdad (Ground Truth).
