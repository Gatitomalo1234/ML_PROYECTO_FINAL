"use client";

import { useEffect, useRef } from "react";

export function useMissileAudio(missileT: number) {
  const alarmRef     = useRef<HTMLAudioElement | null>(null);
  const explosionRef = useRef<HTMLAudioElement | null>(null);
  const firedRef     = useRef(false);

  useEffect(() => {
    const alarm     = new Audio("/audio/missile-lock.mp3");
    const explosion = new Audio("/audio/explosion.mp3");
    alarm.volume     = 0.70;
    explosion.volume = 0.92;

    alarmRef.current     = alarm;
    explosionRef.current = explosion;

    return () => {
      alarm.pause();     alarm.src     = "";
      explosion.pause(); explosion.src = "";
      alarmRef.current     = null;
      explosionRef.current = null;
      firedRef.current     = false;
    };
  }, []);

  useEffect(() => {
    const alarm     = alarmRef.current;
    const explosion = explosionRef.current;
    if (!alarm || !explosion) return;

    // Alarm starts the moment missile launches
    if (missileT > 0 && alarm.paused && alarm.currentTime === 0) {
      alarm.play().catch(() => {});
    }

    // Countdown hits 0 (missileT = 1.0): cut alarm immediately, fire explosion
    if (missileT >= 1.0 && !firedRef.current) {
      firedRef.current = true;
      alarm.pause();
      explosion.play().catch(() => {});
    }
  }, [missileT]);
}
