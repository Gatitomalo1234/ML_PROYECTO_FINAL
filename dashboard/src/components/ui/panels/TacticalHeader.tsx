"use client";

import { useMemo, useState, useEffect } from "react";
import { useExperienceStore } from "@/state/experienceStore";

export default function TacticalHeader() {
  const dataStatus = useExperienceStore((s) => s.dataStatus);
  const threat = useExperienceStore((s) => s.threatLevel);

  const threatColor = useMemo(() => {
    if (threat === "CRITICAL") return "text-critical-500";
    if (threat === "CAUTION") return "text-caution-500";
    return "text-system-500";
  }, [threat]);

  return (
    <div className="absolute inset-x-6 top-6 flex items-center justify-between">
      <div className="pointer-events-none select-none">
        <div className="text-[12px] tracking-tactical text-white/55">GLOBAL TRACK SYS</div>
        <div className="mt-2 flex items-center gap-3 text-[11px] tracking-[0.22em] text-white/35">
          <span className="text-white/60">MODE</span>
          <span className="text-white/70">TACTICAL</span>
          <span className="text-white/60">DATA</span>
          <span className="text-white/70">{dataStatus === "OK" ? "SYNCED" : "MOCK"}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-md border border-white/10 bg-graphite-900/60 px-4 py-3 shadow-panel backdrop-blur-sm">
        <div className="text-[11px] tracking-[0.22em] text-white/50">THREAT</div>
        <div className={`text-[12px] font-medium tracking-[0.18em] ${threatColor}`}>{threat}</div>
        <div className="h-3 w-px bg-white/10" />
        <Clock />
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = time.getUTCHours().toString().padStart(2, "0");
  const mm = time.getUTCMinutes().toString().padStart(2, "0");
  const ss = time.getUTCSeconds().toString().padStart(2, "0");
  return <div className="font-mono text-[12px] tracking-[0.14em] text-white/70">{`${hh}:${mm}:${ss}Z`}</div>;
}

