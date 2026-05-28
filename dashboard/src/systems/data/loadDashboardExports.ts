import type { AlertItem, ThreatLevel } from "@/state/experienceTypes";

type ModelResultRow = {
  date: string;
  region: string;
  predicted_level: number;
  confidence: number;
};

type MasterRow = {
  date: string;
  region: string;
  flights_airborne?: number;
  total_fatalities?: number;
};

export async function loadDashboardExports(): Promise<
  Partial<{
    threatLevel: ThreatLevel;
    metrics: { flightsAirborne: number; flightDropIndex: number; anomalies24h: number };
    alerts: AlertItem[];
    chartSeries: { flights: number[]; fatalities: number[]; confidence: number[] };
  }>
> {
  const [model, master] = await Promise.all([
    fetch("/data/model_results.json", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<ModelResultRow[]>) : Promise.reject(new Error("model_results")))),
    fetch("/data/master_table.json", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<MasterRow[]>) : Promise.reject(new Error("master_table"))))
  ]);

  const latestModel = model.at(-1);
  const confidence = latestModel?.confidence ?? 0.6;
  const threatLevel: ThreatLevel = confidence > 0.86 ? "CRITICAL" : confidence > 0.72 ? "CAUTION" : "NOMINAL";

  const flights = master.map((r) => r.flights_airborne ?? 0).filter((v) => Number.isFinite(v));
  const fatalities = master.map((r) => r.total_fatalities ?? 0).filter((v) => Number.isFinite(v));
  const confidenceSeries = model.map((r) => r.confidence ?? 0.6).filter((v) => Number.isFinite(v));

  const lastFlights = flights.at(-1) ?? 0;
  const mean7 = mean(flights.slice(-7));
  const dropIndex = mean7 > 0 ? (lastFlights - mean7) / mean7 : 0;
  const anomalies24h = dropIndex < -0.3 ? 1 : 0;

  const alerts: AlertItem[] = [
    {
      id: "m1",
      ts: "SYNC",
      kind: "MODEL",
      title: `Model confidence ${(confidence * 100).toFixed(0)}% · Threat ${threatLevel}`
    }
  ];

  return {
    threatLevel,
    metrics: { flightsAirborne: Math.round(lastFlights), flightDropIndex: dropIndex, anomalies24h },
    alerts,
    chartSeries: { flights, fatalities, confidence: confidenceSeries }
  };
}

function mean(arr: number[]) {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

