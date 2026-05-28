import type { AlertItem } from "@/state/experienceTypes";

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

export function buildMockSeries() {
  const flights = Array.from({ length: 30 }, (_, i) => 19000 - i * 22 + Math.round(Math.sin(i * 0.45) * 160));
  const fatalities = Array.from({ length: 30 }, (_, i) => Math.max(0, Math.round(Math.sin(i * 0.28 - 1.2) * 6 + (i > 22 ? 9 : 2))));
  const confidence = Array.from({ length: 30 }, (_, i) => Math.min(0.96, Math.max(0.35, 0.55 + Math.sin(i * 0.22) * 0.12 + (i > 24 ? 0.18 : 0))));
  return { flights, fatalities, confidence };
}

export function defaultModelComparison() {
  return [
    { name: "Random Forest",  f1: 0.81, accuracy: 0.83, precision: 0.82, recall: 0.80 },
    { name: "Hist GradBoost", f1: 0.79, accuracy: 0.81, precision: 0.80, recall: 0.78 },
    { name: "Logistic Reg",   f1: 0.71, accuracy: 0.73, precision: 0.72, recall: 0.70 },
    { name: "KNN",            f1: 0.67, accuracy: 0.69, precision: 0.68, recall: 0.66 },
    { name: "Naive Bayes",    f1: 0.61, accuracy: 0.63, precision: 0.62, recall: 0.60 },
  ];
}

