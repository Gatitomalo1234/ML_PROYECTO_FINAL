"use client";

import { useEffect, useRef, useState } from "react";
import { useExperienceStore } from "@/state/experienceStore";

export function useScrollProgress(enabled: boolean) {
  const [progress, setProgress] = useState(0);
  const acc = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      return;
    }

    const onWheel = (e: WheelEvent) => {
      // Lock scroll once CONFLICT_LOCK is reached — missile sequence must play out fully.
      // Also locked during missileActive and in COMMAND_CENTER (OrbitControls takes over).
      const { mode, missileActive } = useExperienceStore.getState();
      if (mode === "CONFLICT_LOCK" || mode === "COMMAND_CENTER" || missileActive) return;

      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      acc.current = clamp01(acc.current + delta / 3000);
      setProgress(acc.current);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [enabled]);

  return progress;
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
