"use client";

import { useEffect, useRef } from "react";
import type { ExperienceMode } from "@/state/experienceTypes";

type Drone = { gainNode: GainNode; stop: () => void };

export function useAmbientAudio(mode: ExperienceMode) {
  const ctxRef   = useRef<AudioContext | null>(null);
  const droneRef = useRef<Drone | null>(null);
  const modeRef  = useRef<ExperienceMode | null>(null);

  const getCtx = (): AudioContext => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  };

  // Resume on first user gesture
  useEffect(() => {
    const resume = () => {
      if (ctxRef.current?.state === "suspended") void ctxRef.current.resume();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown",     resume, { once: true });
    window.addEventListener("wheel",       resume, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown",     resume);
      window.removeEventListener("wheel",       resume);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      droneRef.current?.stop();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  // React to mode changes
  useEffect(() => {
    if (modeRef.current === mode) return;
    modeRef.current = mode;

    const prevDrone = droneRef.current;
    droneRef.current = null;

    const RAMP = 0.8; // crossfade duration in seconds

    // Fade out previous drone
    if (prevDrone) {
      try {
        const ctx = getCtx();
        prevDrone.gainNode.gain.setValueAtTime(prevDrone.gainNode.gain.value, ctx.currentTime);
        prevDrone.gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + RAMP);
        setTimeout(() => prevDrone.stop(), (RAMP + 0.1) * 1000);
      } catch { /* silent */ }
    }

    try {
      const ctx = getCtx();
      // El sonido de interferencia (drone) ha sido deshabilitado.
      // BOOT, TYPOGRAPHY, COMMAND_CENTER, EARTH_REVEAL, etc.: silence — no drone started
    } catch { /* autoplay blocked — silent */ }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Synthesis helpers ─────────────────────────────────────────────────────

type OscDesc = { freq: number; gain: number };

function buildDrone(ctx: AudioContext, oscs: OscDesc[], fadeIn: number): Drone {
  const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 120;

  master.connect(lp);
  lp.connect(ctx.destination);

  for (const { freq, gain } of oscs) {
    const osc  = ctx.createOscillator();
    const g    = ctx.createGain();
    osc.type   = "sine";
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(master);
    osc.start();
    nodes.push({ osc, gain: g });
  }

  // Fade in
  master.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + fadeIn);

  return {
    gainNode: master,
    stop() {
      try {
        for (const { osc } of nodes) osc.stop();
      } catch { /* already stopped */ }
    },
  };
}
