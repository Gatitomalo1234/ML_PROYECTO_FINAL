"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";
import RightRail from "@/components/ui/panels/RightRail";
import BottomRail from "@/components/ui/panels/BottomRail";
import CenterPanel from "@/components/ui/panels/CenterPanel";
import MissileAlert from "@/components/ui/panels/MissileAlert";
import TacticalHeader from "@/components/ui/panels/TacticalHeader";
import CinematicTitles from "@/components/ui/panels/CinematicTitles";
import BootSequence from "@/components/ui/BootSequence";
import ProjectNarrativeSection from "@/components/ui/ProjectNarrativeSection";
import NewsTicker from "@/components/ui/panels/NewsTicker";
import AviationLeftRail from "@/components/ui/panels/AviationLeftRail";
import AviationRightRail from "@/components/ui/panels/AviationRightRail";
import AviationCenterPanel from "@/components/ui/panels/AviationCenterPanel";

export default function UIOverlay() {
  const mode          = useExperienceStore((s) => s.mode);
  const missileActive = useExperienceStore((s) => s.missileActive);
  const isCommand     = mode === "COMMAND_CENTER";
  const isAviation    = mode === "AVIATION_FRONT";

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div className="absolute inset-0 overlay-grid" />
      <div className="absolute inset-0 overlay-scanlines" />

      <CanvasMask />

      {/* COMMAND_CENTER: panels */}
      <AnimatePresence>
      {isCommand && (
        <motion.div key="command" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
          <TacticalHeader />
          <div className="pointer-events-auto absolute inset-6 flex flex-col gap-5">
            <div className="flex min-h-0 flex-1 gap-5">
              <motion.div className="min-w-0 flex-[3] relative"
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}>
                <div className="absolute inset-0">
                  <CenterPanel />
                </div>
              </motion.div>
              <motion.div className="w-[360px] shrink-0 relative"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.35, ease: "easeOut" }}>
                <div className="absolute inset-0">
                  <RightRail />
                </div>
              </motion.div>
            </div>
            <motion.div className="shrink-0 z-10"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.62, ease: "easeOut" }}>
              <BottomRail />
            </motion.div>
            <motion.div className="shrink-0 w-full z-10 -mx-6 w-[calc(100%+48px)] mt-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}>
              <NewsTicker />
            </motion.div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* AVIATION_FRONT: second scroll section */}
      <AnimatePresence>
      {isAviation && (
        <motion.div key="aviation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          {/* Aviation Header */}
          <div className="absolute inset-x-6 top-6 flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <div className="text-[9px] tracking-[0.4em] text-system-500/70">FRENTE</div>
              <div className="font-display text-[15px] font-semibold tracking-[0.2em] text-white/85">INTELIGENCIA AÉREA</div>
              <div className="mt-1 text-[9px] tracking-widest text-white/35">TRÁFICO · ANOMALÍAS · ESPACIO AÉREO MENA</div>
            </motion.div>
            <motion.div className="flex items-center gap-3 rounded-md border border-system-500/20 bg-graphite-900/60 px-4 py-3 backdrop-blur-sm"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <span className="h-2 w-2 rounded-full bg-system-500 animate-pulse" />
              <span className="font-mono text-[11px] tracking-widest text-system-500">LIVE FEED</span>
            </motion.div>
          </div>

          {/* Aviation Panels */}
          <div className="pointer-events-auto absolute inset-6 top-[76px] flex min-h-0 gap-5">
            <motion.div className="w-[300px] shrink-0"
              initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.25, ease: "easeOut" }}>
              <AviationLeftRail />
            </motion.div>
            <motion.div className="min-w-0 flex-[2]"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.40, ease: "easeOut" }}>
              <AviationCenterPanel />
            </motion.div>
            <motion.div className="w-[340px] shrink-0"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.55, ease: "easeOut" }}>
              <AviationRightRail />
            </motion.div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {missileActive && <MissileAlert />}

      {/* Big centered title — only during the initial cinematic phases */}
      <CinematicTitle />
      <CinematicTitles />
      <ScrollCue />

      <FlashEffect />
      <DataStatusBadge />
      <BootText />
      <BootSequence />

      <AnimatePresence>
        {mode === "PROJECT_NARRATIVE" && (
          <ProjectNarrativeSection key="narrative" />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Canvas mask ──────────────────────────────────────────────────────────────
function CanvasMask() {
  const mode = useExperienceStore((s) => s.mode);
  const darken = mode === "COMMAND_CENTER" || mode === "AVIATION_FRONT";
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-graphite-950"
      style={{ opacity: darken ? 0.88 : 0, transition: "opacity 2.2s ease-in" }}
    />
  );
}

// ─── Big cinematic centered title ─────────────────────────────────────────────
function CinematicTitle() {
  const mode       = useExperienceStore((s) => s.mode);
  const cinematicT = useExperienceStore((s) => s.cinematicT);

  // Only show during TYPOGRAPHY — PROJECT_NARRATIVE and EARTH_REVEAL handle their own visuals
  if (mode !== "TYPOGRAPHY") return null;

  // Fade out near the end of TYPOGRAPHY (cinematicT 0.17 → 0.22)
  const opacity = Math.max(0, Math.min(1, 1 - (cinematicT - 0.17) / 0.05));
  if (opacity < 0.01) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      style={{ opacity }}
    >
      {/* Top rule */}
      <div className="flex items-center gap-5 mb-7">
        <div className="h-px w-20 bg-white/12" />
        <div className="font-mono text-[8px] tracking-[0.55em] text-white/22">CLASSIFIED · ALPHA-7</div>
        <div className="h-px w-20 bg-white/12" />
      </div>

      {/* Primary title */}
      <div className="text-center">
        <div
          className="font-display font-semibold leading-none text-white/85"
          style={{ fontSize: "clamp(32px, 5vw, 58px)", letterSpacing: "0.25em" }}
        >
          AEROSPACE
        </div>
        <div
          className="mt-1 font-display font-semibold leading-none text-white/85"
          style={{ fontSize: "clamp(32px, 5vw, 58px)", letterSpacing: "0.25em" }}
        >
          INTELLIGENCE SYSTEM
        </div>
      </div>

      {/* Divider */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-px w-12 bg-white/15" />
        <div className="h-1.5 w-1.5 rounded-full bg-white/25" />
        <div className="h-px w-12 bg-white/15" />
      </div>

      {/* Subtitle */}
      <div className="mt-4 font-mono text-[10px] tracking-[0.55em] text-white/32">
        SISTEMA OSINT · CONFLICTO IRÁN–ISRAEL
      </div>
    </div>
  );
}

// ─── Boot text ────────────────────────────────────────────────────────────────
function BootText() {
  const mode = useExperienceStore((s) => s.mode);
  if (mode !== "BOOT") return null;
  return (
    <div className="absolute left-8 top-8 text-[11px] tracking-[0.22em] text-white/45">
      <div className="font-medium">SIS/INICIO</div>
      <div className="mt-2 text-white/30">VINCULANDO TELEMETRÍA · CALIBRANDO SOLUCIÓN ORBITAL</div>
    </div>
  );
}

// ─── Data status badge ────────────────────────────────────────────────────────
function DataStatusBadge() {
  const status = useExperienceStore((s) => s.dataStatus);
  if (status === "OK") return null;
  return (
    <div className="absolute inset-x-0 bottom-8 flex justify-center">
      <div className="rounded border border-caution-500/30 bg-graphite-900/80 px-3 py-2 text-[10px] tracking-tactical text-caution-500 backdrop-blur-sm">
        DATOS SIMULADOS · PIPELINE NO CONECTADO
      </div>
    </div>
  );
}

// ─── Flash on CONFLICT_LOCK → COMMAND_CENTER transition ───────────────────────
function FlashEffect() {
  const mode = useExperienceStore((s) => s.mode);
  const [flashing, setFlashing] = useState(false);
  const prevMode = useRef<string>("");

  useEffect(() => {
    if (mode === "COMMAND_CENTER" && prevMode.current === "CONFLICT_LOCK") {
      setFlashing(true);
    }
    prevMode.current = mode;
  }, [mode]);

  if (!flashing) return null;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 50, backgroundColor: "white" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.35, 0] }}
      transition={{ duration: 1.1, times: [0, 0.20, 1], ease: "easeOut" }}
      onAnimationComplete={() => setFlashing(false)}
    />
  );
}

// ─── Scroll cue — shown after boot until user starts scrolling ────────────────
function ScrollCue() {
  const initialized    = useExperienceStore((s) => s.initialized);
  const mode           = useExperienceStore((s) => s.mode);
  const scrollProgress = useExperienceStore((s) => s.scrollProgress);

  const show = initialized && mode !== "COMMAND_CENTER" && mode !== "BOOT" && scrollProgress < 0.05;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-12 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        >
          <div className="font-mono text-[9px] tracking-[0.46em] text-white/50">
            DESPLAZA PARA EXPLORAR
          </div>
          <motion.div
            className="text-white/30 text-[14px] leading-none"
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            ▾
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
