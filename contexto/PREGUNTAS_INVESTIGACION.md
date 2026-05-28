# Preguntas de Investigación (Guía del Proyecto ML1)

Para que el proyecto destaque, debemos alejarnos de la pregunta básica ("¿Cuándo habrá un ataque?") y enfocarnos en fenómenos más profundos que la Ciencia de Datos puede revelar cruzando nuestras 3 fuentes principales: **Telegram (narrativa local), GDELT (prensa global) y feeds RSS (titulares oficiales).**

A continuación, se presentan 3 propuestas de alto impacto, sustentadas 100% en los datos que vamos a extraer.

---

## Opción 1: El Algoritmo de "Distancia Narrativa" (Guerra de Información)
**La Pregunta:** 
> *¿En qué medida la brecha de sentimiento ("distancia narrativa") entre el reporte global de medios oficiales (GDELT) y la conversación civil local cruda (Telegram) sirve como un predictor temprano de la severidad de un incidente bélico en Medio Oriente?*

**El Sustento en los Datos:**
*   **Variable de Entrada (Features):** Calcularemos la diferencia matemática entre el "Tono Promedio" diario reportado por GDELT y el sentimiento extraído de los canales públicos de Telegram.
*   **Variable Objetivo (Target):** Severidad del conflicto al día siguiente (Validado con datos de eventos reales, clasificando en Nivel: Alto / Medio / Bajo).
*   **Modelos a usar:** Regresión Logística, K-Nearest Neighbors (KNN).
*   **Por qué impacta:** Demuestra cómo la desinformación o la divergencia de propaganda entre lo que dicen los medios de occidente y lo que habla la gente en el terreno, suele preceder a una escalada militar.

---

## Opción 2: Detección del "Silencio Predictivo" y Censura
**La Pregunta:** 
> *¿Es posible entrenar un algoritmo que detecte patrones de "silencio anómalo" (caídas drásticas en el volumen de publicaciones) en canales específicos de Telegram y los clasifique como el indicador principal de una ofensiva militar inminente en las siguientes 24 a 48 horas?*

**El Sustento en los Datos:**
*   **Variable de Entrada (Features):** Volumen de mensajes por hora en Telegram, frecuencia de publicación y varianza temporal. (Datos ultraligeros).
*   **Variable Objetivo (Target):** Ocurrencia de un ataque significativo (Binario: Sí/No).
*   **Modelos a usar:** Isolation Forest (Detección de anomalías) combinado con Naive Bayes.
*   **Por qué impacta:** Es un enfoque de inteligencia militar moderna. En la guerra contemporánea, los cortes de internet, la censura y el cese de transmisiones locales (el silencio) son el indicador más fuerte de que un ataque es inminente.

---

## Opción 3: El Índice de "Polarización Occidente vs. Oriente"
**La Pregunta:** 
> *A partir de la clasificación automatizada de titulares noticiosos de Oriente (Al Jazeera) frente a Occidente (BBC), ¿podemos modelar y predecir un "Índice de Tensión Regional" que alerte sobre la probabilidad de participación de actores externos (ej. EE. UU.) en el conflicto?*

**El Sustento en los Datos:**
*   **Variable de Entrada (Features):** Vectores de texto (TF-IDF) extraídos por RSS de medios muy específicos. 
*   **Variable Objetivo (Target):** Nivel de tensión (Regresión continua del 1 al 10).
*   **Modelos a usar:** Naive Bayes (para clasificar el texto inicial) seguido de un modelo de Regresión Lineal o Ridge/Lasso.
*   **Por qué impacta:** Usa exclusivamente Procesamiento de Lenguaje Natural (NLP). Evita usar eventos de explosiones y se concentra en cómo el "calentamiento" del discurso editorial precede a las decisiones políticas.

---

### Siguientes Pasos
Una vez seleccionemos la pregunta que más te entusiasme, ese se convertirá en nuestro **norte absoluto**. Todo el código de extracción que escribamos estará diseñado exclusivamente para conseguir las columnas (features) que esa pregunta exige.
