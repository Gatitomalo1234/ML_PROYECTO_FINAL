"use client";

import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/components/ui/primitives/Panel";
import { useExperienceStore } from "@/state/experienceStore";

const AIRLINES = [
  { code: "IKA", flight: "W5 106",  from: "Tehran",   to: "Dubai",   alt: "35,000ft", speed: "478kts", status: "NOMINAL" },
  { code: "TLV", flight: "LY 083",  from: "Tel Aviv",  to: "London",  alt: "38,000ft", speed: "491kts", status: "NOMINAL" },
  { code: "DXB", flight: "EK 971",  from: "Dubai",    to: "Karachi", alt: "32,000ft", speed: "461kts", status: "NOMINAL" },
  { code: "BAH", flight: "GF 131",  from: "Bahrain",  to: "Cairo",   alt: "36,000ft", speed: "472kts", status: "CAUTION" },
  { code: "MCT", flight: "WY 047",  from: "Muscat",   to: "Mumbai",  alt: "34,000ft", speed: "455kts", status: "NOMINAL" },
];

const AIRPORTS = [
  { iata: "IKA", name: "Imam Khomeini", country: "Iran",    traffic: 72,  delta: -18 },
  { iata: "TLV", name: "Ben Gurion",    country: "Israel",  traffic: 131, delta: -41 },
  { iata: "DXB", name: "Dubai Intl.",   country: "UAE",     traffic: 203, delta: +3  },
  { iata: "BAH", name: "Bahrain Intl.", country: "Bahrain", traffic: 58,  delta: -7  },
];

export default function AviationLeftRail() {
  const metrics = useExperienceStore((s) => s.metrics);

  return (
    <div className="flex h-full flex-col gap-5">
      <Panel title="FLUJO DE TRÁFICO AÉREO">
        <Metric label="Vuelos en Ruta"  value={metrics.flightsAirborne.toLocaleString()} tone="system" />
        <Metric label="Anomalías 24h"   value={metrics.anomalies24h.toString()} tone={metrics.anomalies24h > 0 ? "caution" : "system"} />
        <Metric label="Índice de Caída" value={`${(metrics.flightDropIndex * 100).toFixed(1)}%`} tone={metrics.flightDropIndex < -0.2 ? "caution" : "system"} />
      </Panel>

      <Panel title="AEROPUERTOS — REGIÓN LEVANTE">
        <div className="space-y-2">
          {AIRPORTS.map((ap) => (
            <div key={ap.iata} className="flex items-center justify-between rounded-md border border-white/5 bg-white/3 px-3 py-2">
              <div>
                <div className="font-mono text-[11px] font-semibold text-white/80">{ap.iata}</div>
                <div className="text-[9px] tracking-widest text-white/40">{ap.name.toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-white/70">{ap.traffic}<span className="text-[9px] text-white/35"> mov/h</span></div>
                <div className={`text-[10px] font-medium ${ap.delta < 0 ? "text-caution-500" : "text-system-500"}`}>
                  {ap.delta > 0 ? "+" : ""}{ap.delta}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "system" | "caution" }) {
  const color = tone === "caution" ? "text-caution-500" : "text-system-500";
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
      <div className="text-xs tracking-widest text-white/50">{label.toUpperCase()}</div>
      <div className={`font-mono text-base font-medium tracking-wide ${color}`}>{value}</div>
    </div>
  );
}
