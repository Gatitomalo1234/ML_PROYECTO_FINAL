"use client";

import { useEffect, useRef } from "react";

export function useMissileAudio(missileT: number) {
  const alarmRef     = useRef<HTMLAudioElement | null>(null);
  const explosionRef = useRef<HTMLAudioElement | null>(null);
  const impactedRef  = useRef(false);

  useEffect(() => {
    const alarm     = new Audio("/audio/missile-lock.mp3");
    const explosion = new Audio("/audio/explosion.mp3");
    alarm.volume     = 0.70;
    explosion.volume = 0.92;

    alarmRef.current     = alarm;
    explosionRef.current = explosion;

    return () => {
      alarm.pause();
      alarm.src     = "";
      explosion.pause();
      explosion.src = "";
      alarmRef.current     = null;
      explosionRef.current = null;
      impactedRef.current  = false;
    };
  }, []);

  useEffect(() => {
    const alarm     = alarmRef.current;
    const explosion = explosionRef.current;
    if (!alarm || !explosion) return;

    const launched = missileT > 0;
    const impacted = missileT >= 0.95;

    // Start alarm the moment missile launches — plays once, no loop
    if (launched && alarm.paused && alarm.currentTime === 0) {
      alarm.play().catch(() => {});
    }

    // On visual impact: cut alarm immediately and fire explosion in sync
    if (impacted && !impactedRef.current) {
      impactedRef.current = true;
      alarm.pause();
      explosion.play().catch(() => {});
    }
  }, [missileT]);
}
