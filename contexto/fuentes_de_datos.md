# Análisis Detallado de Fuentes de Datos (APIs y Scraping)

Para el proyecto de Machine Learning sobre la escalada del conflicto Irán-Israel-EE. UU., contamos con varias opciones de fuentes de datos gratuitas (OSINT). A continuación, presento un análisis profundo de cada una, cómo se consumen, sus pros, contras y posibles usos en el proyecto.

---

## 1. Eventos y Conflicto Estructurado

### ACLED (Armed Conflict Location & Event Data Project)
*   **¿Qué es?** Es la base de datos de oro para recolección de datos de conflictos. Registra fechas, actores, ubicaciones exactas y muertes reportadas en eventos violentos.
*   **Método de Acceso:** API REST. Requiere crear una cuenta gratuita en su portal para obtener un *API Key* y un *Email de usuario*.
*   **Formato:** JSON o CSV.
*   **Pros:** Datos extremadamente limpios y estructurados. Ya viene con variables geográficas (Lat/Lon) y categorización de eventos (ej. "Explosiones/Violencia Remota", "Batallas", "Protestas").
*   **Contras:** Tiene un retraso de publicación (los datos se actualizan semanalmente, no en tiempo real absoluto).
*   **Uso en el Proyecto:** Puede ser nuestra **variable objetivo (Target)**. Por ejemplo, predecir la cantidad de eventos ACLED en una semana, o usar incidentes previos para predecir escalada.

### UKMTO (United Kingdom Maritime Trade Operations)
*   **¿Qué es?** Entidad militar británica que emite alertas y advertencias de seguridad marítima en tiempo real (vital para el Mar Rojo y el Golfo Pérsico).
*   **Método de Acceso:** No tienen API pública. Se debe hacer **Web Scraping** (usando `BeautifulSoup` o `Selenium` en Python) de su página web de "Recent Incidents".
*   **Formato:** Texto desestructurado en HTML.
*   **Pros:** Información oficial y de primerísima mano sobre ataques a buques, secuestros o avistamientos de drones/misiles.
*   **Contras:** Requiere escribir un scraper robusto, y extraer entidades (coordenadas, tipo de ataque) del texto libre usando NLP o expresiones regulares.
*   **Uso en el Proyecto:** Excelente fuente de contexto operativo. Sirve para medir el "Riesgo Marítimo".

---

## 2. Noticias y Narrativas (Texto y NLP)

### GDELT (Global Database of Events, Language, and Tone)
*   **¿Qué es?** Una iniciativa global que monitorea medios de comunicación del todo el mundo en tiempo real, extrayendo eventos, personas, ubicaciones y, sobre todo, el **Tono** (sentimiento) de las noticias.
*   **Método de Acceso:** API 2.0 (retorna JSON) o descarga directa de archivos CSV cada 15 minutos.
*   **Pros:** Volumen masivo de datos. Ya calcula el "Tono" promedio de los artículos, lo cual ahorra trabajo de NLP.
*   **Contras:** Es **gigantesco** y a veces ruidoso. Si no se filtra bien por palabras clave (ej. "Israel", "Iran", "Gaza", "Houthis"), el volumen de datos colapsará tu computadora.
*   **Uso en el Proyecto:** Extraer la "Intensidad Mediática" (cuántas noticias hablan del conflicto) y el "Tono Promedio" (para ver si la prensa está usando lenguaje de guerra o de paz) por día.

### RSS Feeds (BBC, Al Jazeera, Google News)
*   **¿Qué es?** Archivos XML estándar que publican los medios de comunicación cada vez que suben una noticia.
*   **Método de Acceso:** Librería `feedparser` en Python. Es completamente libre y sin autenticación.
*   **Pros:** Muy fácil de consumir. Textos confiables. Permite comparar narrativas (occidente vía BBC vs. medio oriente vía Al Jazeera).
*   **Contras:** Solo da el titular, el link y a veces un pequeño resumen, no el cuerpo completo de la noticia (para eso habría que hacer scraping de cada link).
*   **Uso en el Proyecto:** Crear un corpus de texto para hacer **Clustering** de temáticas, o clasificar noticias (Clasificación Supervisada) según su nivel de urgencia usando algoritmos como Naive Bayes.

---

## 3. Movilidad y Señales Físicas

### OpenSky Network (Tráfico Aéreo)
*   **¿Qué es?** Red colaborativa de rastreo de vuelos (aviones comerciales y algunos militares).
*   **Método de Acceso:** API REST. Es gratuita pero tiene límites (100 peticiones al día sin cuenta, 4000 con cuenta gratuita).
*   **Pros:** Retorna un "State Vector" con latitud, longitud, velocidad y altitud de cada avión.
*   **Contras:** La cobertura sobre Medio Oriente puede tener "huecos". Analizar trayectorias es matemáticamente complejo.
*   **Uso en el Proyecto:** Medir el número de vuelos comerciales en el espacio aéreo de Irán/Israel/Líbano. Una caída brusca en el volumen de vuelos suele ser un excelente **predictor** de un ataque inminente.

### AISStream (Tráfico Marítimo)
*   **¿Qué es?** Datos AIS (Automatic Identification System) de barcos en tiempo real.
*   **Método de Acceso:** WebSocket API. Requiere registrarse para un API key gratuito.
*   **Pros:** Permite dibujar polígonos (ej. el Mar Rojo) y recibir un stream continuo de qué barcos están ahí y hacia dónde van.
*   **Contras:** Los WebSockets requieren mantener un script corriendo en vivo para capturar los datos y guardarlos, no permite descargar el histórico fácilmente.
*   **Uso en el Proyecto:** Calcular el volumen de buques de carga en el Mar Rojo. Si los buques se desvían hacia África, indica escalada del conflicto Houthi.

### NASA FIRMS (Fire Information for Resource Management System)
*   **¿Qué es?** Datos de satélites (MODIS/VIIRS) que detectan anomalías térmicas (incendios).
*   **Método de Acceso:** API REST gratuita (requiere registro de email) o descarga de CSV diarios por región.
*   **Pros:** Un misil, una explosión grande o infraestructura petrolera ardiendo generan firmas térmicas detectables desde el espacio.
*   **Contras:** Mucho ruido (un incendio forestal o una planta industrial normal también aparecen). Hay que cruzar los datos térmicos con bases como ACLED para validarlos.
*   **Uso en el Proyecto:** Fuente extra de validación espacial (Contexto).

---

## Resumen de Complejidad y Recomendación

Si me pides una recomendación para armar el proyecto garantizando el éxito (cumpliendo con la restricción de 3 fuentes, usando modelos de clase y sin volvernos locos con la ingeniería de datos):

1.  **Fuente Principal (Target/Eventos):** **ACLED**. Es el estándar de oro, está estructurado y es fácil de limpiar.
2.  **Fuente Secundaria (Contexto y Tono):** **GDELT (API)** o **Google News RSS**. Extraemos el volumen de noticias sobre "Irán/Israel" por día y su sentimiento.
3.  **Fuente Terciaria (Movilidad o Señal Social):** **OpenSky** (para contar aviones diarios sobre la zona de conflicto) o **YouTube Comments/Bluesky** si preferimos enfocarnos puramente en el impacto en el discurso digital.

Con estas tres fuentes, podríamos construir una unidad de análisis **"Por Día"** y entrenar un modelo (ej. Regresión Lineal o Random Forest) que prediga: *En función del tono de las noticias de hoy y del desvío de vuelos comerciales, ¿cuál será la severidad de los eventos de conflicto de mañana?*
