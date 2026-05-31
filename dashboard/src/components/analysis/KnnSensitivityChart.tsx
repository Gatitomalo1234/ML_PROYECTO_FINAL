"use client";

import ChartFrame from "@/components/analysis/ChartFrame";
import { knnSensitivity } from "@/components/analysis/analysisData";

export default function KnnSensitivityChart() {
  const w = 250;
  const h = 120;
  const pad = 22;
  const path = (key: "f1" | "rocAuc") =>
    knnSensitivity
      .map((p, i) => {
        const x = pad + (i / (knnSensitivity.length - 1)) * (w - pad * 2);
        const y = h - pad - p[key] * (h - pad * 2);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <ChartFrame title="SENSIBILIDAD KNN" kicker="K vs metricas CV">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full">
        <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
        <path d={path("rocAuc")} fill="none" stroke="#58b8c8" strokeWidth="2"><title>ROC-AUC medio CV</title></path>
        <path d={path("f1")} fill="none" stroke="#d6a24a" strokeWidth="2"><title>F1 medio CV</title></path>
        {knnSensitivity.map((p, i) => {
          const x = pad + (i / (knnSensitivity.length - 1)) * (w - pad * 2);
          return p.k === 15 ? <line key={p.k} x1={x} x2={x} y1={pad} y2={h - pad} stroke="rgba(214,162,74,0.55)" strokeDasharray="3 4" /> : null;
        })}
      </svg>
      <div className="flex gap-3 text-[9px] tracking-[0.16em] text-white/42">
        <span className="text-system-500">ROC-AUC</span>
        <span className="text-caution-500">F1</span>
        <span>K seleccionado: 15</span>
      </div>
    </ChartFrame>
  );
}

