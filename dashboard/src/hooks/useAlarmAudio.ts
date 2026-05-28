"use client";

import { useEffect } from "react";

export function useAlarmAudio(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const ctx = new AudioContext();
    let stopped = false;

    async function beepLoop() {
      while (!stopped) {
        for (let i = 0; i < 3; i++) {
          if (stopped) break;
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          // Alternate between two frequencies for urgency
          osc.frequency.value = i === 1 ? 660 : 880;
          gain.gain.setValueAtTime(0.28, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.09);
          await new Promise<void>((r) => setTimeout(r, 160));
        }
        await new Promise<void>((r) => setTimeout(r, 1100));
      }
    }

    beepLoop().catch(() => {});

    return () => {
      stopped = true;
      ctx.close().catch(() => {});
    };
  }, [active]);
}
