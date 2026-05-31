"use client";

import ChartFrame from "@/components/analysis/ChartFrame";
import { logregCoefficients } from "@/components/analysis/analysisData";

export default function CoefficientChart() {
  const rows = [...logregCoefficients].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 15);
  const max = Math.max(...rows.map((r) => Math.abs(r.coefficient)), 1);

  return (
    <ChartFrame title="COEFICIENTES LOGISTICOS" kicker="impacto log-odds">
      <div className="space-y-1.5">
        {rows.map((r) => {
          const positive = r.coefficient >= 0;
          return (
            <div key={r.feature} className="grid grid-cols-[112px_1fr_38px] items-center gap-2">
              <div className="truncate text-[9px] text-white/45" title={r.feature}>{r.feature}</div>
              <div className="relative h-2 rounded bg-white/8">
                <div className="absolute left-1/2 top-0 h-full w-px bg-white/16" />
                <div
                  className="absolute top-0 h-full rounded"
                  style={{
                    width: `${(Math.abs(r.coefficient) / max) * 50}%`,
                    left: positive ? "50%" : undefined,
                    right: positive ? undefined : "50%",
                    backgroundColor: positive ? "#58b8c8" : "#d34b47",
                  }}
                />
              </div>
              <div className={positive ? "font-mono text-[9px] text-system-500" : "font-mono text-[9px] text-critical-500"}>{r.coefficient.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}

