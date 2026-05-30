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
  const mode         = useExperienceStore((s) => s.mode);
  const initialized  = useExperienceStore((s) => s.initialized);
  const scroll       = useExperienceStore((s) => s.scrollProgress);
  const missileActive = useExperienceStore((s) => s.missileActive);

  const isCommand = mode === "COMMAND_CENTER";

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div className="absolute inset-0 overlay-grid" />
      <div className="absolute inset-0 overlay-scanlines" />

      {/* Masks the 3D canvas the instant COMMAND_CENTER is entered */}
      <CanvasMask />

      {/* COMMAND_CENTER: full-screen grid layout — no globe behind it */}
      {isCommand && (
        <>
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
        </>
      )}


      {missileActive && <MissileAlert />}

      <SystemTitle />
      <FlashEffect />
      <DataStatusBadge />
      <BootText />
      <ScrollHint show={initialized && scroll < 0.06} />
      <BootSequence />
    </div>
  );
}

function CanvasMask() {
  const mode = useExperienceStore((s) => s.mode);
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-graphite-950"
      style={{ opacity: mode === "COMMAND_CENTER" ? 0.88 : 0, transition: "opacity 0.1s" }}
    />
  );
}

function SystemTitle() {
  const mode = useExperienceStore((s) => s.mode);
  if (mode === "BOOT") return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex items-center px-6"
      style={{
        height: 52,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(5,7,10,0.55)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="font-mono text-[10px] tracking-[0.40em] text-white/60">
        AEROSPACE INTELLIGENCE SYSTEM
      </div>
      <div className="ml-4 font-mono text-[8px] tracking-[0.22em] text-white/28">
        AIS · v4.7.1 · CLASIFICADO
      </div>
    </div>
  );
}

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

function ScrollHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-x-0 bottom-10 flex items-center justify-center">
      <div className="rounded border border-white/10 bg-graphite-900/40 px-4 py-2 text-[10px] tracking-[0.28em] text-white/55 backdrop-blur-sm">
        DESPLAZAR PARA CONTINUAR
      </div>
    </div>
  );
}

function DataStatusBadge() {
  const status = useExperienceStore((s) => s.dataStatus);
  if (status === "OK") return null;
  return (
    <div className="absolute inset-x-0 bottom-20 flex justify-center">
      <div className="rounded border border-caution-500/30 bg-graphite-900/80 px-3 py-2 text-[10px] tracking-tactical text-caution-500 backdrop-blur-sm">
        DATOS SIMULADOS · PIPELINE NO CONECTADO
      </div>
    </div>
  );
}

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
