"use client";

import { useEffect, useRef } from "react";

export function useMissileAudio(missileT: number) {
  const alarmRef          = useRef<HTMLAudioElement | null>(null);
  const explosionFiredRef = useRef(false);

  // Create alarm audio instance on mount
  useEffect(() => {
    const alarm = new Audio("/audio/missile-lock.mp3");
    alarm.loop   = true;
    alarm.volume = 0.70;
    alarmRef.current = alarm;

    return () => {
      alarm.pause();
      alarm.src = "";
      alarmRef.current          = null;
      explosionFiredRef.current = false;
    };
  }, []);

  // React to missile progress
  useEffect(() => {
    const alarm = alarmRef.current;
    if (!alarm) return;

    const active   = missileT > 0 && missileT < 0.95;
    const impacted = missileT >= 0.95;

    // Alarm plays while missile is in flight
    if (active && alarm.paused) {
      alarm.play().catch(() => {});
    } else if (!active && !alarm.paused) {
      alarm.pause();
      alarm.currentTime = 0;
    }

    // Explosion fires once at impact
    if (impacted && !explosionFiredRef.current) {
      explosionFiredRef.current = true;
      const boom = new Audio("/audio/explosion.mp3");
      boom.volume = 0.92;
      boom.play().catch(() => {});
    }
  }, [missileT]);
}
