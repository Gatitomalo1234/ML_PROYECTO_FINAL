"use client";

import InsightWidget from "@/components/analysis/InsightWidget";
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
    <InsightWidget 
      title="SENSIBILIDAD A HIPERPARÁMETROS (K-NN)" 
      description="Evaluación del número de vecinos (K) y su impacto en las métricas durante Cross Validation."
      insight="Un K=15 maximiza el F1-Score sin perder generalidad. K menores sobreajustan al ruido local (overfitting)."
    >
      <div className="flex flex-col items-center justify-center h-full min-h-[160px]">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-[140px]">
          <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
          <path d={path("rocAuc")} fill="none" stroke="#58b8c8" strokeWidth="2"><title>ROC-AUC medio CV</title></path>
          <path d={path("f1")} fill="none" stroke="#d6a24a" strokeWidth="2"><title>F1 medio CV</title></path>
          {knnSensitivity.map((p, i) => {
            const x = pad + (i / (knnSensitivity.length - 1)) * (w - pad * 2);
            return p.k === 15 ? <line key={p.k} x1={x} x2={x} y1={pad} y2={h - pad} stroke="rgba(214,162,74,0.55)" strokeDasharray="3 4" /> : null;
          })}
        </svg>
        <div className="mt-4 flex gap-3 text-[9px] tracking-[0.16em] text-white/42">
          <span className="text-system-500 font-semibold">ROC-AUC</span>
          <span className="text-caution-500 font-semibold">F1</span>
          <span>K seleccionado: 15</span>
        </div>
      </div>
    </InsightWidget>
  );
}

