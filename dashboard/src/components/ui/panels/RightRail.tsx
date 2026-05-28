"use client";

import Panel from "@/components/ui/primitives/Panel";
import { useExperienceStore } from "@/state/experienceStore";

const KIND_COLOR: Record<string, string> = {
  MODEL:    "text-caution-500 border-caution-500/30",
  AIRSPACE: "text-system-500 border-system-500/30",
  GEO:      "text-white/60 border-white/15",
  MARITIME: "text-critical-500 border-critical-500/30",
};

export default function RightRail() {
  const alerts = useExperienceStore((s) => s.alerts);
  const models = useExperienceStore((s) => s.modelComparison);
  const best = models.reduce((a, b) => (b.f1 > a.f1 ? b : a), models[0]);

  return (
    <div className="flex h-full flex-col gap-4">
      <Panel title="ALERTAS">
        <div className="space-y-2">
          {alerts.slice(0, 5).map((a) => {
            const cls = KIND_COLOR[a.kind] ?? "text-white/60 border-white/15";
            return (
              <div key={a.id} className="rounded border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] tracking-[0.22em] ${cls}`}>{a.kind}</span>
                  <span className="text-[10px] tracking-[0.22em] text-white/35">{a.ts}</span>
                </div>
                <div className="mt-1.5 text-[11px] leading-snug text-white/65">{a.title}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="COMPARACIÓN DE MODELOS">
        <div className="space-y-1">
          {models.map((m) => {
            const isBest = m.name === best.name;
            return (
              <div
                key={m.name}
                className={`flex items-center justify-between rounded px-2 py-1.5 ${isBest ? "bg-system-500/10 border border-system-500/20" : "border border-transparent"}`}
              >
                <span className={`text-[10px] tracking-tactical ${isBest ? "text-system-500" : "text-white/50"}`}>
                  {m.name.toUpperCase()}
                </span>
                <div className="flex gap-3">
                  <span className={`text-[10px] font-medium ${isBest ? "text-system-500" : "text-white/55"}`}>
                    {(m.f1 * 100).toFixed(0)}% F1
                  </span>
                  <span className="text-[10px] text-white/30">
                    {(m.accuracy * 100).toFixed(0)}% ACC
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

