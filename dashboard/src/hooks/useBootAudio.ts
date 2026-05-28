"use client";

import { useEffect, useRef } from "react";

// Frequencies for each line reveal — subtle progression
const LINE_FREQS = [440, 520, 480, 620, 560, 680, 880];

export function useBootAudio(phase: number) {
  const ctxRef    = useRef<AudioContext | null>(null);
  const prevPhase = useRef(0);
  const ambientRef = useRef<{ stop: () => void } | null>(null);

  const getCtx = (): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  // Resume on any user gesture — handles browser autoplay policy
  useEffect(() => {
    const resume = () => {
      if (ctxRef.current?.state === "suspended") void ctxRef.current.resume();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("scroll",      resume, { once: true });
    window.addEventListener("keydown",     resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("scroll",      resume);
      window.removeEventListener("keydown",     resume);
    };
  }, []);

  // Start ambient low rumble on mount
  useEffect(() => {
    try {
      ambientRef.current = startAmbient(getCtx());
    } catch { /* blocked — silent */ }
    return () => {
      ambientRef.current?.stop();
      ctxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Beep on each new text line
  useEffect(() => {
    if (phase === 0 || phase <= prevPhase.current) return;
    prevPhase.current = phase;
    try {
      const ctx = getCtx();
      if (phase === LINE_FREQS.length) {
        playSystemOnline(ctx);
        ambientRef.current?.stop(); // fade out ambient on "GLOBAL SYSTEM ONLINE"
      } else {
        playLineBeep(ctx, phase - 1);
      }
    } catch { /* silent */ }
  });
}

// ─── Synthesis helpers ─────────────────────────────────────────────────────

function playLineBeep(ctx: AudioContext, idx: number) {
  const freq = LINE_FREQS[idx] ?? 500;
  const now  = ctx.currentTime;

  const osc    = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain   = ctx.createGain();

  filter.type = "bandpass";
  filter.frequency.value = freq * 1.8;
  filter.Q.value = 1.2;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "square";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.06, now + 0.03);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.055, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

  osc.start(now);
  osc.stop(now + 0.16);
}

function playSystemOnline(ctx: AudioContext) {
  // Ascending arpeggio: C5 → E5 → G5 → C6
  const chord = [523.25, 659.25, 783.99, 1046.5];
  chord.forEach((freq, i) => {
    const t    = ctx.currentTime + i * 0.1;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.052, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.start(t);
    osc.stop(t + 0.75);
  });

  // Sub bass thump for weight
  const bass     = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.connect(bassGain);
  bassGain.connect(ctx.destination);
  const bt = ctx.currentTime;
  bass.type = "sine";
  bass.frequency.setValueAtTime(90, bt);
  bass.frequency.exponentialRampToValueAtTime(38, bt + 0.45);
  bassGain.gain.setValueAtTime(0.14, bt);
  bassGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.45);
  bass.start(bt);
  bass.stop(bt + 0.5);
}

function startAmbient(ctx: AudioContext): { stop: () => void } {
  // Filtered white noise — deep digital rumble
  const rate   = ctx.sampleRate;
  const buf    = ctx.createBuffer(1, rate * 3, rate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src    = ctx.createBufferSource();
  src.buffer   = buf;
  src.loop     = true;

  const lp     = ctx.createBiquadFilter();
  lp.type      = "lowpass";
  lp.frequency.value = 110;

  const gain   = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.014, ctx.currentTime + 1.2);

  src.connect(lp);
  lp.connect(gain);
  gain.connect(ctx.destination);
  src.start();

  return {
    stop() {
      try {
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        setTimeout(() => src.stop(), 1300);
      } catch { /* already stopped */ }
    },
  };
}
