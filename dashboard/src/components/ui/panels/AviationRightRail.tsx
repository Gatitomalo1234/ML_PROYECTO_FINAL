"use client";

import Panel from "@/components/ui/primitives/Panel";
import ScrambleText from "@/components/ui/primitives/ScrambleText";

const FLIGHTS = [
  { flight: "W5 106",  from: "Tehran",   to: "Dubai",    status: "NOMINAL",  type: "CIVIL" },
  { flight: "LY 083",  from: "Tel Aviv",  to: "London",   status: "NOMINAL",  type: "CIVIL" },
  { flight: "EK 971",  from: "Dubai",    to: "Karachi",  status: "NOMINAL",  type: "CIVIL" },
  { flight: "GF 131",  from: "Bahrain",  to: "Cairo",    status: "CAUTION",  type: "CIVIL" },
  { flight: "WY 047",  from: "Muscat",   to: "Mumbai",   status: "NOMINAL",  type: "CIVIL" },
  { flight: "QR 492",  from: "Doha",     to: "Beirut",   status: "NOMINAL",  type: "CIVIL" },
  { flight: "SV 123",  from: "Riyadh",   to: "Amman",    status: "NOMINAL",  type: "CIVIL" },
  { flight: "XN 009",  from: "Unknown",  to: "Unknown",  status: "ALERT",    type: "UNKN" },
];

const AIRSPACE_NOTES = [
  { id: "ATC-01", text: "NOTAM activo: Espacio aéreo iraniano restringido FL200+ rutas norte.", severity: "caution" },
  { id: "ATC-02", text: "Rerouting confirmado: Emirates evita corredor Golfo Pérsico norte.", severity: "caution" },
  { id: "ATC-03", text: "Transponder loss reportado: aeronave no identificada lat 29.4°N.", severity: "critical" },
  { id: "ATC-04", text: "Flujo DXB–BEY: reducción 22% en últimas 48h vs. baseline histórico.", severity: "info" },
];

export default function AviationRightRail() {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-1">
      <Panel title="AERONAVES EN RUTA · TIEMPO REAL" className="shrink-0">
        <div className="space-y-1.5">
          {FLIGHTS.map((f) => (
            <div
              key={f.flight}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                f.status === "ALERT"
                  ? "border-critical-500/30 bg-critical-500/8"
                  : f.status === "CAUTION"
                  ? "border-caution-500/20 bg-caution-500/5"
                  : "border-white/5 bg-white/3"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    f.status === "ALERT" ? "bg-critical-500 animate-pulse" :
                    f.status === "CAUTION" ? "bg-caution-500" : "bg-system-500"
                  }`}
                />
                <div>
                  <div className="font-mono text-[11px] font-semibold text-white/85">
                    <ScrambleText text={f.flight} />
                  </div>
                  <div className="text-[9px] tracking-widest text-white/40">
                    {f.from.toUpperCase()} → {f.to.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[8px] tracking-widest font-medium border ${
                  f.type === "UNKN" ? "border-critical-500/40 text-critical-500" : "border-white/10 text-white/35"
                }`}>
                  {f.type}
                </span>
                <span className={`text-[10px] font-medium tracking-widest ${
                  f.status === "ALERT" ? "text-critical-500" :
                  f.status === "CAUTION" ? "text-caution-500" : "text-system-500"
                }`}>
                  {f.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="INTELIGENCIA DE ESPACIO AÉREO · NOTAM" className="min-h-0">
        <div className="space-y-3">
          {AIRSPACE_NOTES.map((note) => (
            <div
              key={note.id}
              className={`rounded-md border px-3 py-3 ${
                note.severity === "critical"
                  ? "border-critical-500/25 bg-critical-500/8"
                  : note.severity === "caution"
                  ? "border-caution-500/20 bg-caution-500/5"
                  : "border-white/5 bg-white/3"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 shrink-0 font-mono text-[9px] font-bold tracking-widest ${
                  note.severity === "critical" ? "text-critical-500" :
                  note.severity === "caution" ? "text-caution-500" : "text-system-500"
                }`}>
                  {note.id}
                </span>
                <p className="text-[11px] leading-relaxed tracking-wide text-white/60">
                  {note.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
