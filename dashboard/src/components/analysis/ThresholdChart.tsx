"use client";

import InsightWidget from "@/components/analysis/InsightWidget";
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
    <InsightWidget 
      title="ANÁLISIS DE UMBRAL (TRADE-OFF)" 
      description="Impacto de ajustar el punto de decisión de probabilidad."
      insight="Aumentar el umbral eleva la Precisión (menos falsas alarmas) pero reduce el Recall (se escapan más eventos reales)."
    >
      <div className="flex flex-col h-full min-h-[160px] justify-center">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-[120px]">
          <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
          <path d={path("precision")} fill="none" stroke="#58b8c8" strokeWidth="1.8"><title>Precisión</title></path>
          <path d={path("recall")} fill="none" stroke="#d34b47" strokeWidth="1.8"><title>Recall</title></path>
          <path d={path("f1")} fill="none" stroke="#d6a24a" strokeWidth="2.4"><title>F1 Score</title></path>
          {/* Vertical line for current threshold */}
          <line 
            x1={pad + ((threshold - 0.1) / 0.8) * (w - pad * 2)} 
            x2={pad + ((threshold - 0.1) / 0.8) * (w - pad * 2)} 
            y1={pad} y2={h - pad} 
            stroke="rgba(255,255,255,0.4)" strokeDasharray="3 4" 
          />
        </svg>
        <div className="mt-2">
          <input className="w-full accent-caution-500" type="range" min="0.1" max="0.9" step="0.1" value={threshold} onChange={(e) => onThreshold(Number(e.target.value))} />
        </div>
        <div className="mt-2 flex justify-between text-[9.5px] font-mono tracking-[0.14em] text-white/60">
          <span className="text-system-500">PRE {(nearest.precision * 100).toFixed(0)}%</span>
          <span className="text-critical-500">REC {(nearest.recall * 100).toFixed(0)}%</span>
          <span className="text-caution-500">F1 {(nearest.f1 * 100).toFixed(0)}%</span>
        </div>
      </div>
    </InsightWidget>
  );
}

