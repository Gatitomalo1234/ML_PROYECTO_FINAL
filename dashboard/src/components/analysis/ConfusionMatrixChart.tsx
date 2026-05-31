"use client";

import ChartFrame from "@/components/analysis/ChartFrame";
import type { ModelMetric } from "@/components/analysis/analysisData";

export default function ConfusionMatrixChart({ model }: { model: ModelMetric }) {
  const cells = [
    { label: "TN", value: model.temporal.tn, color: "#58b8c8" },
    { label: "FP", value: model.temporal.fp, color: "#d6a24a" },
    { label: "FN", value: model.temporal.fn, color: "#d34b47" },
    { label: "TP", value: model.temporal.tp, color: "#6cc18f" },
  ];
  const max = Math.max(...cells.map((c) => c.value), 1);

  return (
    <ChartFrame title="MATRIZ DE CONFUSION" kicker={model.shortName}>
      <div className="grid grid-cols-2 gap-1.5">
        {cells.map((c) => (
          <div key={c.label} className="rounded border border-white/10 px-2 py-2 text-center" style={{ backgroundColor: `${c.color}${Math.round(25 + (c.value / max) * 70).toString(16).padStart(2, "0")}` }}>
            <div className="text-[8px] tracking-[0.2em] text-white/45">{c.label}</div>
            <div className="mt-1 font-mono text-[20px] text-white/80">{c.value}</div>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}

