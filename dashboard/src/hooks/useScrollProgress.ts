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
      const { mode, missileActive, narrativeModalOpen } = useExperienceStore.getState();

      // Narrative modal open → block page scroll so the modal can scroll freely
      if (narrativeModalOpen) return;

      if (mode === "CONFLICT_LOCK" || mode === "FINAL_SUMMARY" || missileActive) return;

      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const next  = clamp01(acc.current + delta / 3000);

      // In COMMAND_CENTER only allow scrolling forward (toward FINAL_SUMMARY)
      if (mode === "COMMAND_CENTER" && next < acc.current) return;

      // Lock: cannot exit PROJECT_NARRATIVE until all 5 nodes are revealed.
      // Nodes appear one per 20 % of the narrative scroll range [1/8, 2/8].
      if (mode === "PROJECT_NARRATIVE") {
        const narStart = 1 / 8, narEnd = 2 / 8;
        const progress = (acc.current - narStart) / (narEnd - narStart);
        const visible  = Math.min(5, Math.floor(Math.max(0, progress) * 5) + 1);
        if (visible < 5 && next >= narEnd) {
          // Cap just before exit — let the user keep scrolling within the range
          acc.current = Math.min(next, narEnd - 0.001);
          setProgress(acc.current);
          return;
        }
      }

      acc.current = next;
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
