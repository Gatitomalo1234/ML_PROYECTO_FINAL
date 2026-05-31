"use client";

import ChartFrame from "@/components/analysis/ChartFrame";
import { probabilityBins, type ModelMetric } from "@/components/analysis/analysisData";

export default function ProbabilityDistributionChart({ model }: { model: ModelMetric }) {
  const bins = probabilityBins[model.key];
  const max = Math.max(...bins.flatMap((b) => [b.nonFatal, b.fatal]), 1);

  return (
    <ChartFrame title="DISTRIBUCION DE PROBABILIDADES" kicker={model.shortName}>
      <div className="grid h-28 grid-cols-5 items-end gap-1.5">
        {bins.map((b) => (
          <div key={b.bin} className="flex h-full flex-col justify-end">
            <div className="flex items-end gap-0.5">
              <div className="w-1/2 rounded-t bg-white/22" style={{ height: `${(b.nonFatal / max) * 86}px` }} title={`No letal: ${b.nonFatal}`} />
              <div className="w-1/2 rounded-t bg-critical-500/80" style={{ height: `${(b.fatal / max) * 86}px` }} title={`Letal: ${b.fatal}`} />
            </div>
            <div className="mt-1 text-center text-[8px] text-white/32">{b.bin}</div>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}

