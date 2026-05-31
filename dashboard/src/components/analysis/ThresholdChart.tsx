"use client";

import ChartFrame from "@/components/analysis/ChartFrame";
import { thresholdSeries } from "@/components/analysis/analysisData";

export default function ThresholdChart({ threshold, onThreshold }: { threshold: number; onThreshold: (v: number) => void }) {
  const nearest = thresholdSeries.reduce((a, b) => (Math.abs(b.threshold - threshold) < Math.abs(a.threshold - threshold) ? b : a), thresholdSeries[0]);
  const w = 250;
  const h = 110;
  const pad = 20;
  const path = (key: "precision" | "recall" | "f1") =>
    thresholdSeries
      .map((p, i) => {
        const x = pad + (i / (thresholdSeries.length - 1)) * (w - pad * 2);
        const y = h - pad - p[key] * (h - pad * 2);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <ChartFrame title="UMBRAL DE DECISION" kicker={`t=${threshold.toFixed(2)}`}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full">
        <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
        <path d={path("precision")} fill="none" stroke="#58b8c8" strokeWidth="1.8" />
        <path d={path("recall")} fill="none" stroke="#d34b47" strokeWidth="1.8" />
        <path d={path("f1")} fill="none" stroke="#d6a24a" strokeWidth="2.4" />
      </svg>
      <input className="w-full accent-caution-500" type="range" min="0.1" max="0.9" step="0.1" value={threshold} onChange={(e) => onThreshold(Number(e.target.value))} />
      <div className="mt-1 flex justify-between text-[9px] tracking-[0.14em] text-white/45">
        <span>PRE {(nearest.precision * 100).toFixed(0)}</span>
        <span>REC {(nearest.recall * 100).toFixed(0)}</span>
        <span>F1 {(nearest.f1 * 100).toFixed(0)}</span>
      </div>
    </ChartFrame>
  );
}

