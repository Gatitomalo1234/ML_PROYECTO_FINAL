"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";
import type { ExperienceMode } from "@/state/experienceTypes";

type PhaseInfo = {
  label: string;
  title: string;
  sub: string;
  accent?: boolean;
};

const PHASES: Partial<Record<ExperienceMode, PhaseInfo>> = {
  EARTH_REVEAL: {
    label: "COBERTURA GLOBAL",
    title: "RECONOCIMIENTO ORBITAL",
    sub: "SATÉLITES ACTIVOS · COBERTURA 98.4%",
  },
  AIRSPACE_ACTIVATION: {
    label: "ESPACIO AÉREO",
    title: "ACTIVACIÓN DE RUTAS",
    sub: "47 NODOS · TELEMETRÍA EN VIVO",
  },
  STRATEGIC_ORBIT: {
    label: "POSICIÓN ESTRATÉGICA",
    title: "ÓRBITA DE VIGILANCIA",
    sub: "SEGUIMIENTO GLOBAL ACTIVO",
  },
  FLY_TO_CONFLICT: {
    label: "ZONA DE CONFLICTO",
    title: "APROXIMANDO OBJETIVO",
    sub: "IRÁN–ISRAEL · 2026",
  },
  CONFLICT_LOCK: {
    label: "OBJETIVO BLOQUEADO",
    title: "CONFLICTO DETECTADO",
    sub: "INICIANDO PROTOCOLO TÁCTICO",
    accent: true,
  },
};

export default function CinematicTitles() {
  const mode = useExperienceStore((s) => s.mode);
  const phase = PHASES[mode];

  return (
    <AnimatePresence mode="wait">
      {phase && (
        <motion.div
          key={mode}
          className="pointer-events-none absolute bottom-8 left-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          {/* Top rule + label */}
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px w-6 bg-system-500/30" />
            <div
              className={`font-mono text-[8px] tracking-[0.46em] ${
                phase.accent ? "text-critical-500/70" : "text-system-500/60"
              }`}
            >
              {phase.label}
            </div>
          </div>

          {/* Title */}
          <div
            className={`font-display text-[14px] font-semibold tracking-[0.28em] ${
              phase.accent ? "text-critical-500/90" : "text-white/80"
            }`}
          >
            {phase.title}
          </div>

          {/* Subtitle */}
          <div className="mt-1 font-mono text-[9px] tracking-[0.22em] text-white/35">
            {phase.sub}
          </div>

          {/* Bottom rule */}
          <div className="mt-2.5 h-px w-16 bg-white/10" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
