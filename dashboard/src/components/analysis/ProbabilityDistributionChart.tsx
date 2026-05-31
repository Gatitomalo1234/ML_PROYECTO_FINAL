"use client";

import InsightWidget from "@/components/analysis/InsightWidget";
import { probabilityBins, type ModelMetric } from "@/components/analysis/analysisData";

export default function ProbabilityDistributionChart({ model }: { model: ModelMetric }) {
  const bins = probabilityBins[model.key];
  const max = Math.max(...bins.flatMap((b) => [b.nonFatal, b.fatal]), 1);

  return (
    <InsightWidget 
      title="SEPARABILIDAD DEL MODELO" 
      description={`Distribución de probabilidades predichas (${model.shortName}) para eventos letales vs no letales.`}
      insight="Un buen modelo concentra los eventos no letales (gris) a la izquierda y los letales (rojo) a la derecha, facilitando un punto de corte."
    >
      <div className="flex flex-col h-full min-h-[160px] justify-center">
        <div className="grid h-[140px] grid-cols-5 items-end gap-2">
          {bins.map((b) => (
            <div key={b.bin} className="flex h-full flex-col justify-end">
              <div className="flex items-end gap-1">
                <div className="w-1/2 rounded-t bg-white/22 transition-all hover:bg-white/40" style={{ height: `${(b.nonFatal / max) * 110}px` }} title={`No letal: ${b.nonFatal}`} />
                <div className="w-1/2 rounded-t bg-critical-500/80 transition-all hover:bg-critical-500" style={{ height: `${(b.fatal / max) * 110}px` }} title={`Letal: ${b.fatal}`} />
              </div>
              <div className="mt-2 text-center text-[9px] font-mono text-white/40">{b.bin}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-4 text-[9px] tracking-[0.16em] text-white/42">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-white/22" /> No Letal</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-critical-500/80" /> Letal</span>
        </div>
      </div>
    </InsightWidget>
  );
}

