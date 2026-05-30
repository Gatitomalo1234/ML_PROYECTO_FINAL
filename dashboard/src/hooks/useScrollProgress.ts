"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollProgress(enabled: boolean) {
  const [progress, setProgress] = useState(0);
  const acc = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      return;
    }

    const onWheel = (e: WheelEvent) => {
      // Normalize deltaMode: 1=lines (~16px each), 0=pixels
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
