"use client";

import { useEffect, useRef, useState } from "react";
import { useExperienceStore } from "@/state/experienceStore";

// Frame counter thresholds before a DPR change is committed.
// This prevents single-frame spikes (e.g. shader compile, texture upload) from
// causing a canvas resize that appears as a 1-frame flash/trembling.
const SLOW_FRAMES_NEEDED = 30; // ~500ms at 60fps
const FAST_FRAMES_NEEDED = 60; // ~1s at 60fps — conservative upscale
const BOOT_FREEZE_MS = 5000;   // no DPR changes during the first 5 seconds

export function useAdaptiveDpr() {
  const [targetDpr, setTargetDpr] = useState(1.25);
  const setQuality = useExperienceStore((s) => s.setQuality);
  const debug = useExperienceStore((s) => s.debug);

  // Slower EMA: 0.97/0.03 instead of 0.9/0.1. Much less reactive to single-frame spikes.
  const ema = useRef(16.7);
  const last = useRef(performance.now());
  const slowCount = useRef(0);
  const fastCount = useRef(0);
  const mountTime = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      const dt = t - last.current;
      last.current = t;
      ema.current = ema.current * 0.97 + dt * 0.03;

      // Freeze all adjustments during boot phase to avoid early-frame spikes.
      if (t - mountTime.current < BOOT_FREEZE_MS) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const ms = ema.current;

      if (ms > 20.5) {
        slowCount.current++;
        fastCount.current = 0;
      } else if (ms < 16.8) {
        fastCount.current++;
        slowCount.current = 0;
      } else {
        slowCount.current = 0;
        fastCount.current = 0;
      }

      // Only act once the condition has persisted for enough consecutive frames.
      const shouldDegrade = slowCount.current >= SLOW_FRAMES_NEEDED;
      const shouldUpgrade = fastCount.current >= FAST_FRAMES_NEEDED;

      if (shouldDegrade || shouldUpgrade) {
        slowCount.current = 0;
        fastCount.current = 0;

        setTargetDpr((prev) => {
          const next = shouldDegrade
            ? Math.max(1.0, prev - 0.05)
            : Math.min(1.5, prev + 0.02);

          if (Math.abs(next - prev) > 0.001) {
            setQuality({ targetDpr: next, postFX: next >= 1.1 });
          }
          return next;
        });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setQuality, debug]);

  return { targetDpr };
}
