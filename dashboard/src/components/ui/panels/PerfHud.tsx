"use client";

import { useEffect, useRef, useState } from "react";
import { useExperienceStore } from "@/state/experienceStore";

export default function PerfHud() {
  const show = useExperienceStore((s) => s.debug);
  const targetDpr = useExperienceStore((s) => s.quality.targetDpr);
  const postFX = useExperienceStore((s) => s.quality.postFX);

  const [fps, setFps] = useState(60);
  const last = useRef(performance.now());
  const frames = useRef(0);

  useEffect(() => {
    if (!show) return;
    let raf = 0;
    const loop = (t: number) => {
      frames.current += 1;
      const dt = t - last.current;
      if (dt >= 500) {
        setFps(Math.round((frames.current * 1000) / dt));
        frames.current = 0;
        last.current = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;

  return (
    <div className="absolute bottom-6 left-6 rounded border border-white/10 bg-graphite-900/60 px-3 py-2 text-[11px] tracking-[0.18em] text-white/60 shadow-panel backdrop-blur-sm">
      <div className="flex gap-4">
        <div>FPS {fps}</div>
        <div>DPR {targetDpr.toFixed(2)}</div>
        <div>FX {postFX ? "ON" : "OFF"}</div>
      </div>
    </div>
  );
}

