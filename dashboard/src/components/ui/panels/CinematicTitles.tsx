"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";

export default function CinematicTitles() {
  const mode = useExperienceStore((s) => s.mode);

  const showMain =
    mode === "TYPOGRAPHY" ||
    mode === "EARTH_REVEAL" ||
    mode === "AIRSPACE_ACTIVATION" ||
    mode === "STRATEGIC_ORBIT";

  const showConflict = mode === "FLY_TO_CONFLICT";

  return (
    <>
      {/* Main title — visible through STRATEGIC_ORBIT */}
      <AnimatePresence>
        {showMain && (
          <motion.div
            key="main-title"
            className="absolute inset-x-0 top-[16vh] flex flex-col items-center"
            initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 1.2, ease: [0.22, 0.12, 0.02, 1] } }}
            exit={{ opacity: 0, filter: "blur(8px)", y: -8, transition: { duration: 0.8 } }}
          >
            <div className="text-center">
              <div className="font-display text-[62px] leading-[0.90] tracking-[-0.02em]">
                <div>INTELIGENCIA</div>
                <div className="text-white/92">AEROESPACIAL</div>
                <div>GLOBAL</div>
              </div>
              <div className="mt-6 max-w-[860px] px-6 text-center text-[12px] tracking-[0.28em] text-white/55">
                VIGILANCIA ORBITAL CLASIFICADA · DENSIDAD DE RUTAS · SEÑALES GEO-ESTRATÉGICAS
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict zone title — shown during FLY_TO_CONFLICT */}
      <AnimatePresence>
        {showConflict && (
          <motion.div
            key="conflict-title"
            className="absolute inset-x-0 top-[10vh] flex flex-col items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 0.12, 0.02, 1] } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.5 } }}
          >
            <div className="px-6 py-4 text-center">
              <div className="text-[10px] tracking-[0.38em] text-critical-500/70">
                ANÁLISIS DE ZONA DE CONFLICTO
              </div>
              <div className="mt-3 font-display text-[38px] leading-tight tracking-[-0.02em] text-white/90">
                IRÁN · ISRAEL · HORMUZ
              </div>
              <div className="mt-3 text-[10px] tracking-[0.30em] text-white/35">
                SECUENCIA DE ATAQUE ACTIVA · BLOQUEO ORBITAL EN CURSO
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
