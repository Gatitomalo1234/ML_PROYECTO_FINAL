"use client";

import Panel from "@/components/ui/primitives/Panel";
import { useExperienceStore } from "@/state/experienceStore";

export default function BottomRail() {
  const series = useExperienceStore((s) => s.chartSeries);
  return (
    <Panel title="TRÁFICO · BAJAS · CONFIANZA DEL MODELO" className="mt-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniChart label="Vuelos Activos" value={series.flights[series.flights.length - 1] ?? 0} unit="" tone="system" data={series.flights} />
        <MiniChart label="Bajas (24–48h)" value={series.fatalities[series.fatalities.length - 1] ?? 0} unit="" tone="critical" data={series.fatalities} />
        <MiniChart label="Confianza" value={Math.round((series.confidence[series.confidence.length - 1] ?? 0.62) * 100)} unit="%" tone="caution" data={series.confidence} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] tracking-[0.22em] text-white/45">
        <span className="rounded border border-white/10 bg-white/5 px-2 py-1">REGIÓN: IR/IS</span>
        <span className="rounded border border-white/10 bg-white/5 px-2 py-1">AOI: HORMUZ</span>
        <span className="rounded border border-white/10 bg-white/5 px-2 py-1">FILTRO: ANOMALÍA</span>
      </div>
    </Panel>
  );
}

function SparkLine({ data, stroke }: { data: number[]; stroke: string }) {
  if (data.length < 2) return <div className="mt-2 h-8 rounded bg-white/5" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 100;
  const H = 32;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-8 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.75" strokeLinejoin="round" />
    </svg>
  );
}

function MiniChart({
  label,
  value,
  unit,
  tone,
  data
}: {
  label: string;
  value: number;
  unit: string;
  tone: "system" | "caution" | "critical";
  data: number[];
}) {
  const color = tone === "critical" ? "text-critical-500" : tone === "caution" ? "text-caution-500" : "text-system-500";
  const stroke = tone === "critical" ? "#d34b47" : tone === "caution" ? "#d6a24a" : "#58b8c8";
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-[10px] tracking-[0.22em] text-white/45">{label.toUpperCase()}</div>
      <div className={`mt-2 text-[18px] font-medium tracking-[-0.02em] ${color}`}>
        {value}
        <span className="ml-1 text-[12px] text-white/35">{unit}</span>
      </div>
      <SparkLine data={data} stroke={stroke} />
    </div>
  );
}

