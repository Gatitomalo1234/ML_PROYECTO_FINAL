"use client";

import Panel from "@/components/ui/primitives/Panel";
import { useExperienceStore } from "@/state/experienceStore";

const KIND_COLOR: Record<string, string> = {
  MODEL: "text-caution-500 border-caution-500/30",
  AIRSPACE: "text-system-500 border-system-500/30",
  GEO: "text-white/60 border-white/15",
  MARITIME: "text-critical-500 border-critical-500/30",
};

export default function RightRail() {
  const alerts = useExperienceStore((s) => s.alerts);
  const models = useExperienceStore((s) => s.modelComparison);
  const best = models.reduce((a, b) => (b.f1 > a.f1 ? b : a), models[0]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <Panel title="ALERTAS">
        <div className="space-y-2">
          {alerts.slice(0, 4).map((a) => {
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

      <Panel title="COMPARACION DE MODELOS">
        <div className="space-y-2">
          {models.map((m) => {
            const isBest = m.name === best.name;
            return (
              <div
                key={m.name}
                className={`rounded border px-2.5 py-2 ${isBest ? "border-system-500/25 bg-system-500/10" : "border-white/10 bg-white/5"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] tracking-tactical ${isBest ? "text-system-500" : "text-white/58"}`}>
                    {m.name.toUpperCase()}
                  </span>
                  {isBest && (
                    <span className="rounded border border-system-500/25 px-1.5 py-0.5 text-[8px] tracking-[0.18em] text-system-500">
                      SELECCION
                    </span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  <Score label="F1" value={m.f1} tone={isBest ? "system" : "muted"} />
                  <Score label="ROC" value={m.rocAuc ?? 0} tone={isBest ? "system" : "muted"} />
                  <Score label="AP" value={m.averagePrecision ?? 0} tone={isBest ? "system" : "muted"} />
                  <Score label="REC" value={m.recall} tone={m.recall >= 0.9 ? "critical" : isBest ? "caution" : "muted"} />
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1 text-center font-mono text-[9px]">
                  <Cell label="TN" value={m.tn ?? 0} />
                  <Cell label="FP" value={m.fp ?? 0} warn />
                  <Cell label="FN" value={m.fn ?? 0} warn />
                  <Cell label="TP" value={m.tp ?? 0} />
                </div>

                {m.note && <div className="mt-2 text-[9.5px] leading-snug text-white/42">{m.note}</div>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="LECTURA OPERATIVA">
        <div className="space-y-2 text-[10px] leading-snug text-white/55">
          <div className="rounded border border-system-500/20 bg-system-500/8 px-2 py-2">
            LogReg L1 core queda como modelo principal: mejor F1 temporal, mejor ranking probabilistico e interpretabilidad defendible.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-caution-500/20 bg-caution-500/8 px-2 py-2">
              NB detecta 44/44 letales, pero produce 151 falsas alarmas.
            </div>
            <div className="rounded border border-white/10 bg-white/5 px-2 py-2">
              KNN baja las falsas alarmas a 27, pero omite 33 letales.
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Score({ label, value, tone }: { label: string; value: number; tone: "system" | "caution" | "critical" | "muted" }) {
  const color =
    tone === "system" ? "text-system-500" :
    tone === "caution" ? "text-caution-500" :
    tone === "critical" ? "text-critical-500" :
    "text-white/55";

  return (
    <div className="rounded border border-white/10 bg-graphite-950/40 px-1.5 py-1 text-center">
      <div className="text-[7.5px] tracking-[0.18em] text-white/32">{label}</div>
      <div className={`mt-0.5 font-mono text-[10px] font-medium ${color}`}>{(value * 100).toFixed(0)}</div>
    </div>
  );
}

function Cell({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded border border-white/8 bg-white/4 px-1 py-1">
      <div className="text-[7px] tracking-[0.16em] text-white/30">{label}</div>
      <div className={warn ? "text-caution-500" : "text-white/60"}>{value}</div>
    </div>
  );
}
