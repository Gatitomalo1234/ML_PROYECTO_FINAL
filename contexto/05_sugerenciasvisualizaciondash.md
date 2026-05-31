# 05 - Sugerencias para visualizacion y dashboard

Estado: 2026-05-30

## Siguiente iteracion

1. Ajustar umbral de decision usando validacion temporal.
2. Revisar calibracion probabilistica.
3. Comparar el modelo con y sin `source`.
4. Agregar una tabla de falsos positivos y falsos negativos para auditoria cualitativa.

## Sugerencias para dashboard

Priorizar una vista de decision operativa con:

1. Probabilidad predicha de letalidad por evento.
2. Umbral de decision ajustable.
3. Conteo dinamico de verdaderos positivos, falsos positivos, falsos negativos y verdaderos negativos.
4. Tabla auditable de eventos con mayor riesgo predicho.
5. Filtros por `source`, pais, region, actor y tipo de arma.

Visualizaciones recomendadas:

| Bloque | Visualizacion | Uso |
|---|---|---|
| Resumen del modelo | Tarjetas de Precision, Recall, F1, ROC-AUC y Average Precision | Comunicar desempeno global |
| Decision operacional | Slider de umbral + matriz de confusion | Explorar el costo entre falsas alarmas y eventos omitidos |
| Priorizacion | Ranking de eventos por probabilidad predicha | Identificar casos de mayor riesgo |
| Explicabilidad | Odds ratios del modelo logistico | Justificar variables asociadas a mayor o menor letalidad |
| Auditoria | Tabla de falsos positivos y falsos negativos | Revisar errores cualitativamente |
| Espacio geografico | Mapa por coordenadas con color por probabilidad | Observar concentraciones territoriales |
| Tiempo | Serie temporal diaria/semanal de riesgo promedio y eventos letales | Detectar cambios en la dinamica |

Lectura sugerida para el dashboard:

```text
El dashboard no debe presentar el modelo como prediccion determinista.
Debe mostrarlo como herramienta de priorizacion y auditoria de riesgo.
El umbral debe poder moverse porque distintas decisiones toleran costos distintos.
```

