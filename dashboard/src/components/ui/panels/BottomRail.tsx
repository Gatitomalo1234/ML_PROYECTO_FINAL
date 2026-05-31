"use client";

import Panel from "@/components/ui/primitives/Panel";
import { useExperienceStore } from "@/state/experienceStore";

export default function BottomRail() {
  const series = useExperienceStore((s) => s.chartSeries);
  const models = useExperienceStore((s) => s.modelComparison);
  const best = models.reduce((a, b) => (b.f1 > a.f1 ? b : a), models[0]);

  return (
    <Panel title="RESULTADOS CLASIFICACION 2026" className="mt-4">
      <div className="grid grid-cols-4 gap-3">
        <MiniChart label="F1 temporal" value={Math.round((best?.f1 ?? 0) * 100)} unit="%" tone="system" data={models.map((m) => m.f1)} />
        <MiniChart label="ROC-AUC" value={Math.round((best?.rocAuc ?? 0) * 100)} unit="%" tone="system" data={models.map((m) => m.rocAuc ?? 0)} />
        <MiniChart label="Recall letal" value={Math.round((best?.recall ?? 0) * 100)} unit="%" tone="caution" data={models.map((m) => m.recall)} />
        <MiniChart label="Letales mayo" value={series.fatalities[series.fatalities.length - 1] ?? 0} unit="" tone="critical" data={series.fatalities} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] tracking-[0.22em] text-white/45">
        <span className="rounded border border-system-500/20 bg-system-500/8 px-2 py-1">SELECCION: LOGREG L1 CORE</span>
        <span className="rounded border border-white/10 bg-white/5 px-2 py-1">TRAIN: 2026 HASTA ABRIL</span>
        <span className="rounded border border-white/10 bg-white/5 px-2 py-1">TEST: MAYO 2026</span>
        <span className="rounded border border-white/10 bg-white/5 px-2 py-1">OBJETIVO: FATALITIES &gt; 0</span>
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
  data,
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
      <div className={`mt-2 text-[18px] font-medium ${color}`}>
        {value}
        <span className="ml-1 text-[12px] text-white/35">{unit}</span>
      </div>
      <SparkLine data={data} stroke={stroke} />
    </div>
  );
}
