"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";
import LeftRail from "@/components/ui/panels/LeftRail";
import RightRail from "@/components/ui/panels/RightRail";
import BottomRail from "@/components/ui/panels/BottomRail";
import CenterPanel from "@/components/ui/panels/CenterPanel";
import MissileAlert from "@/components/ui/panels/MissileAlert";
import BootSequence from "@/components/ui/BootSequence";

export default function UIOverlay() {
  const mode          = useExperienceStore((s) => s.mode);
  const missileActive = useExperienceStore((s) => s.missileActive);
  const isCommand     = mode === "COMMAND_CENTER";

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div className="absolute inset-0 overlay-grid" />
      <div className="absolute inset-0 overlay-scanlines" />

      <CanvasMask />

      {/* COMMAND_CENTER: panels start below the 52px header */}
      {isCommand && (
        <div className="pointer-events-auto absolute inset-6 top-[72px] flex flex-col gap-3">
          <div className="flex min-h-0 flex-1 gap-3">
            <motion.div className="w-64 shrink-0"
              initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.10, ease: "easeOut" }}>
              <LeftRail />
            </motion.div>
            <motion.div className="min-w-0 flex-1"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.28, ease: "easeOut" }}>
              <CenterPanel />
            </motion.div>
            <motion.div className="w-64 shrink-0"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.46, ease: "easeOut" }}>
              <RightRail />
            </motion.div>
          </div>
          <motion.div className="shrink-0"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.62, ease: "easeOut" }}>
            <BottomRail />
          </motion.div>
        </div>
      )}

      {missileActive && <MissileAlert />}

      {/* Big centered title — only during the initial cinematic phases */}
      <CinematicTitle />

      <FlashEffect />
      <DataStatusBadge />
      <BootText />
      <BootSequence />
    </div>
  );
}

// ─── Canvas mask ──────────────────────────────────────────────────────────────
function CanvasMask() {
  const mode = useExperienceStore((s) => s.mode);
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-graphite-950"
      style={{ opacity: mode === "COMMAND_CENTER" ? 0.88 : 0, transition: "opacity 0.1s" }}
    />
  );
}

// ─── Big cinematic centered title ─────────────────────────────────────────────
function CinematicTitle() {
  const mode       = useExperienceStore((s) => s.mode);
  const cinematicT = useExperienceStore((s) => s.cinematicT);

  // Only show during pre-reveal phases
  const activeMode = mode === "TYPOGRAPHY" || mode === "EARTH_REVEAL";
  if (!activeMode) return null;

  // Fade out as Earth starts revealing (cinematicT 0.22 → 0.30)
  const opacity = Math.max(0, Math.min(1, 1 - (cinematicT - 0.22) / 0.08));
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
