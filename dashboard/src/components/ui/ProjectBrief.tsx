"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";

const NODES = [
  {
    num: "01",
    title: "PREGUNTA DE INVESTIGACIÓN",
    body: "¿Es la caída del tráfico aéreo (OpenSky Network) sobre la zona de conflicto un predictor más potente de ataques inminentes que el incremento del tono beligerante en la prensa global (GDELT)?",
    tag: "Hipótesis central del proyecto",
  },
  {
    num: "02",
    title: "FUENTES DE DATOS",
    body: "4 fuentes OSINT abiertas: OpenSky Network (tráfico aéreo), ACLED/UCDP (eventos de conflicto), GDELT BigQuery (tono mediático), IranWarLive (ataques 2026). Cobertura: enero–mayo 2026.",
    tag: "OSINT · 5.120 eventos registrados",
  },
  {
    num: "03",
    title: "SEÑAL PRINCIPAL",
    body: "flight_drop_index: caída porcentual del tráfico aéreo en el corredor Persa respecto a la media de 7 días. Las aerolíneas detectan riesgo operativo antes que los sistemas de inteligencia convencionales.",
    tag: "Estrella del modelo",
  },
  {
    num: "04",
    title: "MODELOS COMPARADOS",
    body: "Clasificación binaria: ¿habrá fatalidades? Validación temporal train:ene–abr / test:may 2026. Regresión Logística L1: ROC-AUC 0.705, F1 0.429 — mejor balance entre recall e interpretabilidad.",
    tag: "LogReg · KNN · Naive Bayes",
  },
  {
    num: "05",
    title: "DASHBOARD TÁCTICO",
    body: "Sistema OSINT en tiempo real: mapa operacional con 4.032 eventos geocodificados, panel de evaluación comparativa de modelos, predicción de probabilidad de letalidad para nuevos incidentes.",
    tag: "React · Three.js · Python · 2026",
  },
];

const VISIBLE_MODES = new Set([
  "EARTH_REVEAL",
  "AIRSPACE_ACTIVATION",
  "STRATEGIC_ORBIT",
  "FLY_TO_CONFLICT",
]);

export default function ProjectBrief() {
  const mode = useExperienceStore((s) => s.mode);
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen((prev) => (prev === i ? null : i));

  return (
    <AnimatePresence>
      {VISIBLE_MODES.has(mode) && (
        <motion.div
          key="brief"
          className="pointer-events-auto absolute right-6 top-1/2 -translate-y-1/2 w-[360px]"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 18 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          {/* Header label */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-system-500/20" />
            <div className="font-mono text-[7px] tracking-[0.50em] text-system-500/50">
              PROYECTO OSINT
            </div>
            <div className="h-px w-4 bg-system-500/20" />
          </div>

          {/* Node list */}
          <div className="relative">
            {/* Vertical connector line running through all nodes */}
            <div
              className="pointer-events-none absolute bg-white/10"
              style={{ left: 4, top: 6, bottom: 6, width: 1 }}
            />

            {NODES.map((node, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="relative mb-1">
                  {/* Row trigger */}
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="group flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    {/* Dot */}
                    <div
                      className="relative z-10 h-[9px] w-[9px] shrink-0 rounded-full transition-all duration-200"
                      style={{
                        background: isOpen
                          ? "rgba(88,184,200,1)"
                          : "rgba(6,10,14,1)",
                        border: isOpen
                          ? "1.5px solid rgba(88,184,200,1)"
                          : "1.5px solid rgba(255,255,255,0.28)",
                        boxShadow: isOpen
                          ? "0 0 8px 2px rgba(88,184,200,0.55)"
                          : "none",
                      }}
                    />

                    {/* Number */}
                    <span className="font-mono text-[8px] tracking-[0.36em] text-white/28 shrink-0">
                      {node.num}
                    </span>

                    {/* Horizontal line */}
                    <div
                      className="h-px flex-1 transition-colors duration-200"
                      style={{
                        background: isOpen
                          ? "rgba(88,184,200,0.30)"
                          : "rgba(255,255,255,0.08)",
                      }}
                    />

                    {/* Title */}
                    <span
                      className="font-mono text-[8.5px] tracking-[0.22em] transition-colors duration-200 shrink-0"
                      style={{
                        color: isOpen
                          ? "rgba(88,184,200,0.92)"
                          : "rgba(255,255,255,0.50)",
                      }}
                    >
                      {node.title}
                    </span>

                    {/* Chevron */}
                    <motion.span
                      className="font-mono text-[11px] text-white/30 shrink-0"
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      ›
                    </motion.span>
                  </button>

                  {/* Expansion panel */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div
                          className="mb-3 ml-6 rounded"
                          style={{
                            background: "rgba(5,9,13,0.82)",
                            backdropFilter: "blur(16px) saturate(1.4)",
                            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderTop: "1.5px solid rgba(88,184,200,0.30)",
                            padding: "14px 16px",
                            boxShadow: [
                              "inset 0 1px 0 rgba(255,255,255,0.05)",
                              "0 12px 32px rgba(0,0,0,0.65)",
                              "0 0 0 0.5px rgba(88,184,200,0.06)",
                            ].join(", "),
                          }}
                        >
                          <p className="font-ui text-[10px] leading-relaxed text-white/58">
                            {node.body}
                          </p>
                          <div className="mt-2.5 font-mono text-[7.5px] tracking-[0.24em] text-system-500/60">
                            {node.tag}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Footer label */}
          <div className="mt-2 flex items-center gap-3">
            <div className="h-px w-4 bg-system-500/20" />
            <div className="font-mono text-[7px] tracking-[0.50em] text-white/18">
              EXTERNADO DE COLOMBIA · ML1 · 2026
            </div>
            <div className="h-px flex-1 bg-system-500/20" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
