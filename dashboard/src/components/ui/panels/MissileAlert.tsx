"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";
import { useMissileAudio } from "@/hooks/useMissileAudio";

export default function MissileAlert() {
  const missileT         = useExperienceStore((s) => s.missileT);
  const setMode          = useExperienceStore((s) => s.setMode);
  const setMissileActive = useExperienceStore((s) => s.setMissileActive);
  const setAllowUserOrbit = useExperienceStore((s) => s.setAllowUserOrbit);
  const impacted         = missileT >= 0.95;
  const done             = missileT >= 1.0;
  const hasTransitioned  = useRef(false);

  useMissileAudio(missileT);

  useEffect(() => {
    if (!done || hasTransitioned.current) return;
    hasTransitioned.current = true;
    const id = setTimeout(() => {
      setMode("COMMAND_CENTER");
      setAllowUserOrbit(true);
      setTimeout(() => setMissileActive(false), 400);
    }, 1800);
    return () => clearTimeout(id);
  }, [done, setMode, setMissileActive, setAllowUserOrbit]);

  const secsLeft = Math.max(0, Math.ceil((1 - missileT) * 12));

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      style={{
        background: impacted ? "rgba(211,75,71,0.07)" : "rgba(211,75,71,0.03)",
        transition: "background 0.4s",
      }}
    >
      <style>{`
        @keyframes threat-pulse { 0%,100%{opacity:1} 50%{opacity:0.30} }
        .threat-blink { animation: threat-pulse 0.8s ease-in-out infinite; }
      `}</style>

      {/* Top status bar — thin, minimal */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-8 py-3"
        style={{ borderBottom: "1px solid rgba(211,75,71,0.30)", background: "rgba(6,10,14,0.75)" }}
      >
        <span className="threat-blink font-mono text-[11px] tracking-[0.38em] text-critical-500">
          {impacted ? "▶ IMPACTO CONFIRMADO" : "⚠ AMENAZA BALÍSTICA DETECTADA"}
        </span>
        <div className="flex items-center gap-2">
          {[0, 0.22, 0.44].map((d) => (
            <span
              key={d}
              className="threat-blink h-1.5 w-1.5 rounded-full bg-critical-500"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
      </div>

      {/* Centered countdown / impact panel */}
      <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-6">
        {/* Target info */}
        <div className="flex items-center gap-8 font-mono text-[10px] tracking-[0.28em] text-white/40">
          <span>ORIGEN <span className="text-white/60">27.2°N · 56.3°E</span></span>
          <span className="text-white/20">→</span>
          <span className="text-critical-500/70">OBJETIVO <span className="text-critical-500">26.8°N · 53.4°E</span></span>
          <span className="text-white/20">·</span>
          <span>MACH <span className="text-white/60">3.2</span></span>
        </div>

        {/* Countdown / Impact */}
        {!impacted ? (
          <div className="flex flex-col items-center gap-1">
            <div className="font-mono text-[9px] tracking-[0.35em] text-white/35">IMPACTO ESTIMADO</div>
            <div className="font-display text-[60px] font-bold leading-none tracking-[0.04em] text-critical-500">
              {String(secsLeft).padStart(2, "0")}
              <span className="ml-3 text-[20px] tracking-[0.22em] text-critical-500/60">SEG</span>
            </div>
          </div>
        ) : (
          <div className="font-display text-[44px] font-bold tracking-[0.08em] text-critical-500">
            IMPACTO CONFIRMADO
          </div>
        )}

        {/* Status bars — minimal */}
        <div className="flex items-center gap-6">
          <StatusDot label="DETECCIÓN" active />
          <StatusDot label="RASTREO" active />
          <StatusDot label="INTERCEPCIÓN" active={!impacted} dim={impacted} />
        </div>
      </div>

      {/* Impact flash */}
      <AnimatePresence>
        {impacted && (
          <motion.div
            className="absolute inset-0 bg-critical-500"
            initial={{ opacity: 0.18 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusDot({ label, active, dim = false }: { label: string; active: boolean; dim?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-system-500" : dim ? "bg-white/20" : "bg-white/20"}`}
      />
      <span className="font-mono text-[9px] tracking-[0.22em] text-white/35">{label}</span>
    </div>
  );
}
