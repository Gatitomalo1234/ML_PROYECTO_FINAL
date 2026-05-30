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

    // Explosion fires naturally when alarm finishes — keeps audio/visual in sync
    alarm.addEventListener("ended", () => {
      if (impactedRef.current) explosion.play().catch(() => {});
    });

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

    // Start alarm the moment missile launches — plays once for its full duration
    if (missileT > 0 && alarm.paused && alarm.currentTime === 0) {
      alarm.play().catch(() => {});
    }

    // Mark impact so onended knows to fire explosion when alarm finishes
    if (missileT >= 0.95 && !impactedRef.current) {
      impactedRef.current = true;
      // Edge case: alarm already ended before impact marker
      if (alarm.ended) explosion.play().catch(() => {});
    }
  }, [missileT]);
}
