"use client";

import { useEffect, useState } from "react";

export function useMouseParallax(enabled: boolean) {
  const [xy, setXy] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setXy({ x: 0, y: 0 });
      return;
    }
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      setXy({ x: nx, y: ny });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);

  return xy;
}

