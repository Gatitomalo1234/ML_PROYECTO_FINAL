"use client";

import InsightWidget from "@/components/analysis/InsightWidget";
import { logregCoefficients } from "@/components/analysis/analysisData";

export default function CoefficientChart() {
  const rows = [...logregCoefficients].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 15);
  const max = Math.max(...rows.map((r) => Math.abs(r.coefficient)), 1);

  return (
    <InsightWidget 
      title="IMPACTO DE VARIABLES (REG. LOGÍSTICA)" 
      description="Magnitud y dirección de los coeficientes logísticos. Indica qué factores elevan o reducen la probabilidad de letalidad."
      insight="Ataques aéreos y misiles en blancos civiles aumentan fuertemente la letalidad. Actividades cibernéticas y marítimas tienden a no generar víctimas fatales directas."
    >
      <div className="space-y-2 h-[220px] overflow-y-auto pr-1 [scrollbar-width:thin]">
        {rows.map((r) => {
          const positive = r.coefficient >= 0;
          return (
            <div key={r.feature} className="grid grid-cols-[112px_1fr_38px] items-center gap-2">
              <div className="truncate text-[9px] text-white/55" title={r.feature}>{r.feature}</div>
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
    </InsightWidget>
  );
}

