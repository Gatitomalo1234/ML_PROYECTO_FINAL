"use client";

import Panel from "@/components/ui/primitives/Panel";
import { useExperienceStore } from "@/state/experienceStore";

export default function LeftRail() {
  const metrics = useExperienceStore((s) => s.metrics);
  return (
    <div className="flex h-full flex-col gap-6">
      <Panel title="TRÁFICO DE RED">
        <Metric label="Vuelos Activos" value={metrics.flightsAirborne.toLocaleString()} tone="system" />
        <Metric label="Índice de Caída" value={`${(metrics.flightDropIndex * 100).toFixed(1)}%`} tone={metrics.flightDropIndex < -0.2 ? "caution" : "system"} />
        <Metric label="Anomalías (24h)" value={metrics.anomalies24h.toString()} tone={metrics.anomalies24h > 0 ? "caution" : "system"} />
      </Panel>
      <Panel title="SISTEMA RADAR">
        <div className="text-xs tracking-[0.18em] text-white/45">AOI: ESTRECHO DE HORMUZ</div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-white/60">
          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">ESCÁNER: ACTIVO</div>
          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">FILTRO: AIRE/MAR</div>
          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">RANGO: 180NM</div>
          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">GANANCIA: AUTO</div>
        </div>
      </Panel>
      <Panel title="MONITOR DE ANOMALÍAS">
        <AnomalyMonitor dropIndex={metrics.flightDropIndex} anomalies={metrics.anomalies24h} />
      </Panel>
    </div>
  );
}

function AnomalyMonitor({ dropIndex, anomalies }: { dropIndex: number; anomalies: number }) {
  const isAnomaly = dropIndex < -0.15 || anomalies > 0;
  const severity  = Math.min(Math.abs(dropIndex), 1.0);
  const color     = isAnomaly ? "text-caution-500" : "text-system-500";
  const barColor  = isAnomaly ? "bg-caution-500" : "bg-system-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-widest text-white/50">ANOMALÍA DE VUELO</span>
        <span className={`font-mono text-xs font-medium ${color}`}>
          {isAnomaly ? `−${Math.round(Math.abs(dropIndex) * 100)}%` : "NOMINAL"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.round(severity * 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md border border-white/8 bg-white/4 px-3 py-2">
          <div className="tracking-wider text-white/40">REGIÓN</div>
          <div className="mt-1 font-mono text-sm text-white/70">HORMUZ</div>
        </div>
        <div className="rounded-md border border-white/8 bg-white/4 px-3 py-2">
          <div className="tracking-wider text-white/40">VENTANA</div>
          <div className="mt-1 font-mono text-sm text-white/70">24H</div>
        </div>
      </div>
      {isAnomaly && (
        <div className="rounded-md border border-caution-500/25 bg-caution-500/10 px-3 py-2">
          <div className="font-mono text-[10px] tracking-widest text-caution-500">
            TRÁFICO REDUCIDO · {anomalies} EVENTOS
          </div>
        </div>
      )}
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

