"use client";

import ChartFrame from "@/components/analysis/ChartFrame";
import type { ModelKey, ModelMetric } from "@/components/analysis/analysisData";

function pointsToPath(points: Array<[number, number]>, w: number, h: number, pad = 24) {
  return points
    .map(([x, y], i) => {
      const px = pad + x * (w - pad * 2);
      const py = h - pad - y * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");
}

export default function LineCurveChart({
  title,
  kicker,
  models,
  curves,
  selected,
  xLabel,
  yLabel,
}: {
  title: string;
  kicker: string;
  models: ModelMetric[];
  curves: Record<ModelKey, Array<[number, number]>>;
  selected: ModelKey;
  xLabel: string;
  yLabel: string;
}) {
  const w = 260;
  const h = 150;
  const pad = 24;

  return (
    <ChartFrame title={title} kicker={kicker}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full">
        <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
        {[0.25, 0.5, 0.75].map((t) => (
          <g key={t}>
            <line x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="rgba(255,255,255,0.06)" />
            <line x1={pad + t * (w - pad * 2)} x2={pad + t * (w - pad * 2)} y1={pad} y2={h - pad} stroke="rgba(255,255,255,0.06)" />
          </g>
        ))}
        {title.includes("ROC") && <path d={pointsToPath([[0, 0], [1, 1]], w, h, pad)} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 5" fill="none" />}
        {models.map((m) => {
          const active = selected === m.key;
          return (
            <path key={m.key} d={pointsToPath(curves[m.key], w, h, pad)} fill="none" stroke={m.color} strokeWidth={active ? 2.6 : 1.5} opacity={active ? 1 : 0.38}>
              <title>{`${m.name} ${title.includes("ROC") ? "AUC" : "AP"} ${(title.includes("ROC") ? m.temporal.rocAuc : m.temporal.averagePrecision).toFixed(3)}`}</title>
            </path>
          );
        })}
        <text x={w / 2} y={h - 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.38)" letterSpacing="1.5">{xLabel}</text>
        <text x="6" y={h / 2} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.38)" letterSpacing="1.5" transform={`rotate(-90 6 ${h / 2})`}>{yLabel}</text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-2">
        {models.map((m) => (
          <span key={m.key} className="flex items-center gap-1.5 text-[9px] tracking-[0.16em] text-white/45">
            <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: m.color }} />
            {m.shortName}
          </span>
        ))}
      </div>
    </ChartFrame>
  );
}

