"use client";

import Panel from "@/components/ui/primitives/Panel";

const HOURLY_TREND = [38, 42, 55, 61, 58, 72, 84, 91, 88, 79, 65, 70, 75, 82, 88, 93, 87, 74, 68, 61, 55, 48, 42, 38];
const MAX_VAL = Math.max(...HOURLY_TREND);

const INCIDENTS = [
  { time: "04:17Z", type: "TRANSPONDER LOSS",  region: "Strait of Hormuz",     risk: "HIGH"   },
  { time: "06:02Z", type: "AIRSPACE VIOLATION", region: "Northern Iraq FIR",    risk: "MEDIUM" },
  { time: "08:45Z", type: "EMERGENCY SQUAWK",   region: "Beirut FIR",           risk: "MEDIUM" },
  { time: "11:30Z", type: "ROUTE DEVIATION",    region: "Iran OIIX",            risk: "LOW"    },
];

export default function AviationCenterPanel() {
  return (
    <div className="flex h-full flex-col gap-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "VUELOS ACTIVOS",  value: "1,247",  sub: "en región MENA",   color: "text-system-500" },
          { label: "ESPACIO RESTRIG.", value: "4",      sub: "zonas activas",    color: "text-caution-500" },
          { label: "INCIDENTES 24H",  value: "7",      sub: "4 resueltos",      color: "text-caution-500" },
          { label: "AERONAVES DESCON", value: "1",     sub: "sin transponder",  color: "text-critical-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-white/8 bg-white/4 px-4 py-3 backdrop-blur-md">
            <div className="text-[9px] tracking-widest text-white/45">{kpi.label}</div>
            <div className={`mt-1 font-mono text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="mt-0.5 text-[9px] text-white/35">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Hourly traffic chart */}
      <Panel title="TRÁFICO HORARIO · VUELOS/HORA (24H)" className="shrink-0">
        <div className="flex h-20 items-end gap-0.5 px-1">
          {HOURLY_TREND.map((v, i) => {
            const pct = (v / MAX_VAL) * 100;
            const isHigh = v === MAX_VAL;
            return (
              <div key={i} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className={`w-full rounded-sm transition-all duration-300 group-hover:opacity-100 ${
                    isHigh ? "bg-caution-500 opacity-90" : "bg-system-500/40 opacity-60 hover:bg-system-500/70"
                  }`}
                  style={{ height: `${pct}%` }}
                />
                {i % 6 === 0 && (
                  <div className="absolute -bottom-4 text-[8px] text-white/30 font-mono">{`${String(i).padStart(2,"0")}h`}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-between text-[9px] font-mono text-white/30">
          <span>00:00Z</span><span>PICO: 06:00Z — 93 vuelos/h</span><span>23:59Z</span>
        </div>
      </Panel>

      {/* Incidents Table */}
      <Panel title="REGISTRO DE INCIDENTES · OPERACIONALES">
        <div className="space-y-2">
          {INCIDENTS.map((inc) => (
            <div key={inc.time} className="grid grid-cols-[60px_1fr_1fr_60px] gap-3 items-center rounded-md border border-white/5 bg-white/3 px-3 py-2.5">
              <div className="font-mono text-[10px] text-white/50">{inc.time}</div>
              <div className="text-[10px] font-semibold tracking-wider text-white/80">{inc.type}</div>
              <div className="text-[10px] text-white/45">{inc.region}</div>
              <div className={`text-right text-[9px] font-bold tracking-widest ${
                inc.risk === "HIGH" ? "text-critical-500" :
                inc.risk === "MEDIUM" ? "text-caution-500" : "text-system-500"
              }`}>{inc.risk}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
