import type { AlertItem, ConflictEvent } from "@/state/experienceTypes";

export function defaultMetrics() {
  return {
    flightsAirborne: 18452,
    flightDropIndex: -0.17,
    anomalies24h: 2
  };
}

export function defaultAlerts(): AlertItem[] {
  return [
    { id: "a1", ts: "14:07:42Z", kind: "MODEL", title: "Confidence spike detected · 24–48h escalation window" },
    { id: "a2", ts: "13:58:10Z", kind: "AIRSPACE", title: "Commercial corridor density reduced · Persian Gulf" },
    { id: "a3", ts: "13:21:04Z", kind: "MARITIME", title: "AIS anomaly cluster · Eastbound transit slowdown" },
    { id: "a4", ts: "12:44:33Z", kind: "GEO", title: "High-salience media tone shift · regional coverage" },
    { id: "a5", ts: "11:19:01Z", kind: "AIRSPACE", title: "Route reroute pattern · northern bypass trend" }
  ];
}

export function defaultConflictEvents(): ConflictEvent[] {
  return [];
}

export function buildMockSeries() {
  const flights = Array.from({ length: 30 }, (_, i) => 19000 - i * 22 + Math.round(Math.sin(i * 0.45) * 160));
  const fatalities = [0, 1, 0, 2, 1, 3, 0, 4, 2, 3, 5, 1, 7, 4, 6, 8, 3, 9, 5, 11, 7, 13, 9, 15, 12, 18, 21, 26, 33, 44];
  const confidence = [0.56, 0.58, 0.57, 0.59, 0.61, 0.60, 0.62, 0.63, 0.65, 0.64, 0.66, 0.67, 0.68, 0.69, 0.70, 0.69, 0.71, 0.72, 0.73, 0.72, 0.74, 0.75, 0.76, 0.77, 0.78, 0.80, 0.82, 0.84, 0.86, 0.88];
  return { flights, fatalities, confidence };
}

export function defaultModelComparison() {
  return [
    { name: "LogReg L1 core", accuracy: 0.587, balancedAccuracy: 0.647, precision: 0.300, recall: 0.750, f1: 0.429, rocAuc: 0.705, averagePrecision: 0.413, tn: 92, fp: 77, fn: 11, tp: 33, note: "Mejor balance: F1, ROC-AUC, AP e interpretabilidad" },
    { name: "Gaussian NB", accuracy: 0.291, balancedAccuracy: 0.553, precision: 0.226, recall: 1.000, f1: 0.368, rocAuc: 0.556, averagePrecision: 0.227, tn: 18, fp: 151, fn: 0, tp: 44, note: "Recall perfecto, costo alto en falsas alarmas" },
    { name: "KNN k=15", accuracy: 0.718, balancedAccuracy: 0.545, precision: 0.289, recall: 0.250, f1: 0.268, rocAuc: 0.642, averagePrecision: 0.295, tn: 142, fp: 27, fn: 33, tp: 11, note: "Menos falsas alarmas, pero omite demasiados eventos letales" },
  ];
}
