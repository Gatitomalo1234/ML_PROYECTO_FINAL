"use client";

import ChartFrame from "@/components/analysis/ChartFrame";
import { metricLabels, type MetricKey, type ModelMetric, type SplitKey } from "@/components/analysis/analysisData";

export default function MetricBarChart({
  models,
  metric,
  split,
  selected,
  onSelect,
}: {
  models: ModelMetric[];
  metric: MetricKey;
  split: SplitKey;
  selected: string;
  onSelect: (key: ModelMetric["key"]) => void;
}) {
  return (
    <ChartFrame title="BARRAS POR METRICA" kicker={metricLabels[metric]}>
      <div className="space-y-2">
        {models.map((m) => {
          const value = m[split][metric];
          const active = selected === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              className={`grid w-full grid-cols-[78px_1fr_42px] items-center gap-2 rounded border px-2 py-1.5 text-left transition ${active ? "border-white/22 bg-white/8" : "border-white/8 bg-white/4 hover:bg-white/7"}`}
            >
              <span className="text-[9px] tracking-[0.18em] text-white/48">{m.shortName.toUpperCase()}</span>
              <span className="h-2 rounded-full bg-white/8">
                <span className="block h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: m.color }} />
              </span>
              <span className="font-mono text-[10px] text-white/65">{(value * 100).toFixed(0)}</span>
            </button>
          );
        })}
      </div>
    </ChartFrame>
  );
}

