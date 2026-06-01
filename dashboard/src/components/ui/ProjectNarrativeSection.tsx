"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";
import type { ModelComparisonEntry } from "@/state/experienceStore";
import LineCurveChart from "@/components/analysis/LineCurveChart";
import ConfusionMatrixChart from "@/components/analysis/ConfusionMatrixChart";
import ThresholdChart from "@/components/analysis/ThresholdChart";
import { models, rocCurves, logregCoefficients } from "@/components/analysis/analysisData";

// ─── Layout constants ─────────────────────────────────────────────────────────
const NP = [
  { x: 12, y: 50 },
  { x: 29, y: 43 },
  { x: 50, y: 54 },
  { x: 71, y: 43 },
  { x: 88, y: 50 },
] as const;

const NAR_START = 1 / 8;
const NAR_END   = 2 / 8;

function useVisibleCount(scrollProgress: number): number {
  const p = Math.max(0, Math.min(1, (scrollProgress - NAR_START) / (NAR_END - NAR_START)));
  return Math.min(5, Math.floor(p * 5) + 1);
}

function seg(i: number) {
  const a = NP[i], b = NP[i + 1];
  const mx = (a.x + b.x) / 2;
  return `C ${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

const SEGMENTS = [
  { d: `M ${NP[0].x},${NP[0].y} ${seg(0)}`, minVis: 2 },
  { d: `M ${NP[1].x},${NP[1].y} ${seg(1)}`, minVis: 3 },
  { d: `M ${NP[2].x},${NP[2].y} ${seg(2)}`, minVis: 4 },
  { d: `M ${NP[3].x},${NP[3].y} ${seg(3)}`, minVis: 5 },
] as const;

// ─── Node data ────────────────────────────────────────────────────────────────

type Stat = { label: string; value: string; tone?: "system" | "caution" };

type NodeDef = {
  num: string; title: string; badge: string; icon: string;
  keyBadge?: string;
  tag: string; headline: string; stats: Stat[]; body: string;
};

const NODES: NodeDef[] = [
  {
    num: "01", title: "HIPÓTESIS", badge: "Investigación", icon: "◉",
    tag: "PREGUNTA DE INVESTIGACIÓN",
    headline: "¿Puede el silencio del comercio anticipar la muerte?",
    stats: [
      { label: "PERÍODO",   value: "ENE – MAY 2026" },
      { label: "ZONA",      value: "CORREDOR PÉRSICO" },
      { label: "TAREA",     value: "CLASIFICACIÓN BINARIA" },
      { label: "HORIZONTE", value: "24 – 48 H" },
    ],
    body: "La hipótesis central: la caída repentina del tráfico aéreo comercial (OpenSky) sobre el corredor persa es un predictor más potente de ataques letales inminentes que el tono beligerante en medios globales (GDELT). Las aerolíneas actúan como sensores distribuidos que integran inteligencia operativa antes que los sistemas convencionales.",
  },
  {
    num: "02", title: "FUENTES", badge: "Datos OSINT", icon: "≡",
    tag: "FUENTES OSINT",
    headline: "4 fuentes abiertas · 5.120 eventos · 6 meses de cobertura",
    stats: [
      { label: "OPENSKY",      value: "TRÁFICO AÉREO" },
      { label: "ACLED / UCDP", value: "CONFLICTO" },
      { label: "GDELT",        value: "TONO MEDIÁTICO" },
      { label: "IRANWARLIVE",  value: "ATAQUES 2026" },
    ],
    body: "Cuatro fuentes OSINT completamente abiertas: OpenSky Network provee estados de vuelo en tiempo real; ACLED y UCDP entregan eventos de conflicto geocodificados desde 2024; GDELT BigQuery expone el tono editorial global; IranWarLive registra ataques cinéticos 2026. Cobertura: enero–mayo 2026, 23 % de lethality rate en 2026.",
  },
  {
    num: "03", title: "SEÑAL", badge: "Feature eng.", icon: "↯", keyBadge: "SEÑAL CLAVE",
    tag: "INGENIERÍA DE CARACTERÍSTICAS",
    headline: "flight_drop_index — la variable con mayor poder predictivo",
    stats: [
      { label: "GRUPO A",  value: "FÍSICO  (3 feat.)" },
      { label: "GRUPO B",  value: "MEDIÁTICO (4 feat.)" },
      { label: "GRUPO C",  value: "CONTROL (4 feat.)" },
      { label: "TOTAL",    value: "157 FEATURES" },
    ],
    body: "El flight_drop_index cuantifica la caída porcentual del tráfico aéreo en el corredor persa respecto a la media móvil de 7 días. Es la variable con mayor coeficiente absoluto en todas las configuraciones de regresión logística evaluadas. Umbral operacional: caída mayor al 30 % activa la señal de alerta.",
  },
  {
    num: "04", title: "MODELOS", badge: "Clasificación", icon: "◈",
    tag: "COMPARACIÓN DE CLASIFICADORES",
    headline: "Validación temporal estricta: train Jan–Abr → test May 2026",
    stats: [
      { label: "ROC-AUC",   value: "0.705", tone: "system" },
      { label: "F1",        value: "0.429" },
      { label: "PRECISION", value: "0.300" },
      { label: "RECALL",    value: "0.750" },
    ],
    body: "Tres clasificadores evaluados sin leakage temporal. La Regresión Logística L1 (C=0.1) logró el mejor equilibrio entre recall e interpretabilidad. Con recall de 0.75, captura 3 de cada 4 eventos letales. La validación cruzada (CV) confirma generalización: ROC-AUC 0.746.",
  },
  {
    num: "05", title: "SISTEMA", badge: "Dashboard", icon: "⊞",
    tag: "INTERPRETABILIDAD Y DASHBOARD TÁCTICO",
    headline: "¿Por qué decide el modelo? — Odds ratios y umbral operacional",
    stats: [
      { label: "EVENTOS GEO", value: "4.032" },
      { label: "MODELO",      value: "LOGREG L1" },
      { label: "FRONTEND",    value: "REACT · THREE.JS" },
      { label: "BACKEND",     value: "PYTHON · SQLITE" },
    ],
    body: "Los coeficientes logísticos revelan qué características elevan o reducen la probabilidad de letalidad. Blancos civiles, teatro iraquí y ataques aéreos son los factores más peligrosos. El slider de umbral permite al operador calibrar la sensibilidad según su tolerancia a falsas alarmas vs. eventos perdidos.",
  },
];

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ProjectNarrativeSection() {
  const [selected, setSelected]    = useState<number | null>(null);
  const [visited,  setVisited]     = useState<Set<number>>(new Set());
  const scrollProgress             = useExperienceStore((s) => s.scrollProgress);
  const setNarrativeModalOpen      = useExperienceStore((s) => s.setNarrativeModalOpen);
  const visibleCount               = useVisibleCount(scrollProgress);

  const handleOpen = (i: number) => {
    setVisited((prev) => new Set([...prev, i]));
    setSelected((prev) => {
      const next = prev === i ? null : i;
      setNarrativeModalOpen(next !== null);
      return next;
    });
  };

  const handleClose = () => {
    setSelected(null);
    setNarrativeModalOpen(false);
  };

  return (
    <motion.div
      key="narrative"
      className="fixed inset-0 z-[90] overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: "easeInOut" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 88% 36% at 50% 50%, rgba(2,5,10,0.70) 0%, transparent 100%)" }}
      />

      <WavePath visibleCount={visibleCount} visited={visited} />

      {NODES.map((node, i) => (
        <AnimatePresence key={node.num}>
          {visibleCount > i && (
            <NodePin
              node={node} index={i}
              isSelected={selected === i}
              isVisited={visited.has(i)}
              isActive={i === visibleCount - 1 && !visited.has(i)}
              onClick={() => handleOpen(i)}
            />
          )}
        </AnimatePresence>
      ))}

      <AnimatePresence>
        {selected !== null && (
          <DetailModal
            key={`modal-${selected}`}
            node={NODES[selected]}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="pointer-events-none absolute bottom-7 right-8 flex flex-col items-end gap-1.5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.7 }}
      >
        <div className="font-mono text-[8px] tracking-[0.46em]" style={{ color: "rgba(255,255,255,0.28)" }}>
          DESPLAZA PARA VER LA TIERRA
        </div>
        <motion.div
          style={{ color: "rgba(255,255,255,0.20)", fontSize: 13, lineHeight: 1 }}
          animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >▾</motion.div>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-7 left-8 font-mono text-[7.5px] tracking-[0.42em]"
        style={{ color: "rgba(255,255,255,0.14)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
      >
        EXTERNADO DE COLOMBIA · ML1 · 2026
      </motion.div>
    </motion.div>
  );
}

// ─── Wave path ────────────────────────────────────────────────────────────────

function WavePath({ visibleCount, visited }: { visibleCount: number; visited: Set<number> }) {
  return (
    <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d={`M ${NP[0].x},${NP[0].y} ${seg(0)} ${seg(1)} ${seg(2)} ${seg(3)}`}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
      {SEGMENTS.map((s, i) => {
        if (visibleCount < s.minVis) return null;
        const isAmber = visited.has(i);
        return (
          <motion.path key={i} d={s.d} fill="none"
            stroke={isAmber ? "rgba(251,191,36,0.60)" : "rgba(88,184,200,0.32)"}
            strokeWidth="2" strokeLinecap="round"
            strokeDasharray={isAmber ? undefined : "5 4"}
            vectorEffect="non-scaling-stroke"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}

// ─── Node pin ─────────────────────────────────────────────────────────────────

function NodePin({ node, index, isSelected, isVisited, isActive, onClick }: {
  node: NodeDef; index: number; isSelected: boolean;
  isVisited: boolean; isActive: boolean; onClick: () => void;
}) {
  const pos  = NP[index];
  const isDone = isVisited;
  const size = isActive ? 64 : 52;
  const r    = size / 2;

  const borderColor = isSelected || isActive ? "rgba(88,184,200,0.88)" : isDone ? "rgba(251,191,36,0.78)" : "rgba(255,255,255,0.26)";
  const bgColor     = isSelected ? "rgba(88,184,200,0.18)" : isActive ? "rgba(88,184,200,0.10)" : isDone ? "rgba(251,191,36,0.10)" : "rgba(5,10,18,0.80)";
  const glow        = isSelected ? "0 0 28px 8px rgba(88,184,200,0.42), inset 0 0 14px rgba(88,184,200,0.14)"
    : isActive ? "0 0 18px 5px rgba(88,184,200,0.28)"
    : isDone   ? "0 0 14px 4px rgba(251,191,36,0.22)" : "none";

  return (
    <motion.div className="pointer-events-none absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}>

      {(isActive || isSelected) && (
        <motion.div className="pointer-events-none absolute rounded-full"
          style={{ width: size + 28, height: size + 28, top: -(r + 14), left: -(r + 14), border: "1.5px solid rgba(88,184,200,0.28)" }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.6, 0.12, 0.6] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} />
      )}

      {isActive && node.keyBadge && (
        <motion.div className="pointer-events-none absolute font-mono text-[8px] tracking-[0.26em] rounded-full px-3 py-1"
          style={{ bottom: r + 14, left: "50%", transform: "translateX(-50%)", background: "rgba(88,184,200,0.12)", border: "1px solid rgba(88,184,200,0.42)", color: "rgba(88,184,200,0.90)", whiteSpace: "nowrap", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}>
          {node.keyBadge}
        </motion.div>
      )}

      <button type="button" onClick={onClick}
        className="pointer-events-auto absolute flex items-center justify-center rounded-full cursor-pointer"
        style={{ width: size, height: size, top: -r, left: -r, background: bgColor, border: `${isActive || isSelected ? 2 : 1.5}px solid ${borderColor}`, boxShadow: glow, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", transition: "box-shadow 0.2s, background 0.2s" }}>
        {isDone ? (
          <span style={{ fontSize: 20, color: "rgba(251,191,36,0.90)", lineHeight: 1 }}>✓</span>
        ) : (
          <span className="font-mono leading-none" style={{ fontSize: isActive ? 20 : 16, color: isActive ? "rgba(88,184,200,0.95)" : "rgba(255,255,255,0.60)" }}>
            {node.icon}
          </span>
        )}
      </button>

      <div className="pointer-events-none absolute font-mono text-center"
        style={{ top: r + 10, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 8.5, letterSpacing: "0.22em", color: "rgba(255,255,255,0.65)" }}>
        {node.num} · {node.title}
      </div>

      <div className="pointer-events-none absolute font-mono text-center rounded-full"
        style={{ top: r + 26, left: "50%", transform: "translateX(-50%)", padding: "2px 10px", whiteSpace: "nowrap", fontSize: 7, letterSpacing: "0.20em",
          color: isDone ? "rgba(251,191,36,0.85)" : isActive ? "rgba(88,184,200,0.90)" : "rgba(255,255,255,0.38)",
          background: isDone ? "rgba(251,191,36,0.09)" : isActive ? "rgba(88,184,200,0.10)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isDone ? "rgba(251,191,36,0.28)" : isActive ? "rgba(88,184,200,0.38)" : "rgba(255,255,255,0.12)"}` }}>
        {node.badge}
      </div>
    </motion.div>
  );
}

// ─── Detail modal — full screen glassmorphism ─────────────────────────────────

function DetailModal({ node, onClose }: { node: NodeDef; onClose: () => void }) {
  return (
    <>
      {/* Full-screen backdrop — wheel events here fall through to the modal's scroll */}
      <motion.div className="fixed inset-0 pointer-events-auto" style={{ zIndex: 95 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }} onClick={onClose}
        onWheel={(e) => e.stopPropagation()} />

      {/* Modal card — x:"-50%" passed to framer-motion so it composes correctly with scale/y */}
      <motion.div
        className="fixed pointer-events-auto flex flex-col"
        style={{
          zIndex: 96,
          top: "5vh", left: "50%",
          width: "min(1160px, 96vw)",
          height: "90vh",
          background: "radial-gradient(ellipse at 50% 30%, rgba(5,10,20,0.93) 55%, rgba(3,6,14,0.78) 100%)",
          backdropFilter: "blur(44px) saturate(2.0)",
          WebkitBackdropFilter: "blur(44px) saturate(2.0)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderTop: "1.5px solid rgba(88,184,200,0.32)",
          borderRadius: 16,
          boxShadow: [
            "0 0 0 100vw rgba(0,0,0,0.58)",
            "0 60px 140px rgba(0,0,0,0.82)",
            "inset 0 1px 0 rgba(255,255,255,0.07)",
          ].join(", "),
          // Fade only top and bottom edges — left/right stay solid so the panel is visually clear
          maskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)",
          overflow: "hidden",
        }}
        // x here so framer-motion composes it correctly with scale/y instead of the CSS transform fighting it
        initial={{ opacity: 0, scale: 0.94, y: -12, x: "-50%" }}
        animate={{ opacity: 1, scale: 1,    y: 0,   x: "-50%" }}
        exit={{   opacity: 0, scale: 0.96,  y: -6,  x: "-50%" }}
        transition={{ duration: 0.30, ease: [0.34, 1.20, 0.64, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-10 pt-7 pb-5">
          <button type="button" onClick={onClose}
            className="absolute top-5 right-7 font-mono text-[11px] transition-colors duration-150 pointer-events-auto"
            style={{ color: "rgba(255,255,255,0.28)" }}
            onMouseEnter={(e) => { (e.currentTarget).style.color = "rgba(255,255,255,0.72)"; }}
            onMouseLeave={(e) => { (e.currentTarget).style.color = "rgba(255,255,255,0.28)"; }}>
            ✕
          </button>

          <div className="mb-2 font-mono text-[8px] tracking-[0.55em]" style={{ color: "rgba(88,184,200,0.55)" }}>
            {node.tag}
          </div>
          <div className="font-display font-semibold leading-tight"
            style={{ fontSize: "clamp(20px, 2.4vw, 28px)", letterSpacing: "0.07em", color: "rgba(255,255,255,0.90)" }}>
            {node.headline}
          </div>
          <div className="mt-5 h-px" style={{ background: "linear-gradient(90deg, rgba(88,184,200,0.20), rgba(255,255,255,0.06) 60%, transparent)" }} />
        </div>

        {/* ── Body — 2 columns ── */}
        <div className="flex flex-1 min-h-0 px-10 pb-8 gap-0">
          {/* Left column — context */}
          <div className="w-[36%] flex-shrink-0 flex flex-col gap-5 pr-8 border-r border-white/[0.07]">
            {/* Stats chips */}
            <div className="flex flex-wrap gap-2.5">
              {node.stats.map((s) => (
                <div key={s.label} className="rounded px-3.5 py-2.5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: s.tone === "system" ? "rgba(88,184,200,0.08)" : "rgba(255,255,255,0.03)" }}>
                  <div className="font-mono text-[7px] tracking-[0.36em] mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>{s.label}</div>
                  <div className="font-mono text-[12px] tracking-[0.12em]"
                    style={{ color: s.tone === "system" ? "rgba(88,184,200,0.92)" : "rgba(255,255,255,0.72)" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Body text */}
            <p className="font-ui leading-relaxed text-[13px]" style={{ color: "rgba(255,255,255,0.52)", maxWidth: "44ch" }}>
              {node.body}
            </p>

            {/* Node number watermark */}
            <div className="mt-auto font-display font-semibold select-none"
              style={{ fontSize: "clamp(60px, 8vw, 96px)", lineHeight: 1, color: "rgba(88,184,200,0.06)", letterSpacing: "0.05em" }}>
              {node.num}
            </div>
          </div>

          {/* Right column — charts */}
          <div className="flex-1 min-w-0 pl-8 overflow-y-auto [scrollbar-width:thin] flex flex-col gap-5">
            <NodeRightPanel nodeNum={node.num} />
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Node right panel switcher ────────────────────────────────────────────────

function NodeRightPanel({ nodeNum }: { nodeNum: string }) {
  switch (nodeNum) {
    case "01": return <NodePanel01 />;
    case "02": return <NodePanel02 />;
    case "03": return <NodePanel03 />;
    case "04": return <NodePanel04 />;
    case "05": return <NodePanel05 />;
    default:   return null;
  }
}

// ─── Panel 01 — HIPÓTESIS: pipeline funnel + signal strength ──────────────────

function NodePanel01() {
  const stages = [
    { label: "FUENTES OSINT", items: ["OpenSky", "ACLED/UCDP", "GDELT BigQuery", "IranWarLive"], accent: 0.28 },
    { label: "157 FEATURES",  items: ["flight_drop_index", "gdelt_tone_lag1", "fatalities_lag7", "+154 más"], accent: 0.22 },
    { label: "3 MODELOS",     items: ["LogReg L1 ★", "KNN k=15", "Naive Bayes"], accent: 0.16 },
    { label: "DASHBOARD",     items: ["React · Three.js", "Python · SQLite", "4,032 eventos"], accent: 0.10 },
  ];

  const signals = [
    { label: "flight_drop_index", value: 0.88, color: "rgba(88,184,200,0.75)" },
    { label: "gdelt_tone_lag1",   value: 0.41, color: "rgba(255,255,255,0.32)" },
    { label: "rss_urgency_score", value: 0.22, color: "rgba(255,255,255,0.22)" },
    { label: "fatalities_lag1",   value: 0.31, color: "rgba(255,255,255,0.26)" },
  ];

  return (
    <div className="flex flex-col gap-7">
      {/* Pipeline */}
      <div>
        <SectionLabel>PIPELINE DEL PROYECTO</SectionLabel>
        <div className="flex items-start gap-2 mt-3">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex items-start gap-2 flex-1">
              <div className="flex-1 rounded border px-3 py-3"
                style={{ borderColor: `rgba(88,184,200,${stage.accent + 0.08})`, background: `rgba(88,184,200,${stage.accent})` }}>
                <div className="font-mono text-[8px] tracking-[0.25em] text-center mb-2.5 pb-2 border-b border-white/10"
                  style={{ color: "rgba(88,184,200,0.85)" }}>{stage.label}</div>
                <div className="space-y-1.5">
                  {stage.items.map((item) => (
                    <div key={item} className="text-center font-mono text-[8px]"
                      style={{ color: item.includes("★") ? "rgba(251,191,36,0.80)" : "rgba(255,255,255,0.52)" }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="flex-shrink-0 pt-8 text-[18px]" style={{ color: "rgba(88,184,200,0.35)" }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Signal strength */}
      <div>
        <SectionLabel>FUERZA DE SEÑAL — COEFICIENTE LOGÍSTICO ABSOLUTO</SectionLabel>
        <div className="mt-3 space-y-3">
          {signals.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between font-mono text-[9px] mb-1.5">
                <span style={{ color: s.label.includes("flight") ? "rgba(88,184,200,0.85)" : "rgba(255,255,255,0.50)" }}>{s.label}</span>
                <span style={{ color: "rgba(255,255,255,0.40)" }}>{s.value.toFixed(2)}</span>
              </div>
              <div className="h-2 rounded" style={{ background: "rgba(255,255,255,0.07)" }}>
                <motion.div className="h-full rounded" style={{ background: s.color }}
                  initial={{ width: 0 }} animate={{ width: `${s.value * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} />
              </div>
            </div>
          ))}
          <div className="mt-2 font-mono text-[8px] leading-relaxed" style={{ color: "rgba(88,184,200,0.45)" }}>
            ↑ flight_drop_index domina en todas las configuraciones evaluadas (temporal y CV)
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel 02 — FUENTES: source cards + coverage timeline ─────────────────────

function NodePanel02() {
  const sources = [
    { name: "OPENSKY NETWORK", type: "API REST", period: "Ene–May 2026", stat: "~18.000 vuelos/día", icon: "✈" },
    { name: "ACLED / UCDP", type: "CSV + API", period: "2024 – 2026", stat: "5.120 eventos", icon: "⚡" },
    { name: "GDELT BIGQUERY", type: "Cloud SQL", period: "Ene–May 2026", stat: "Escala Goldstein", icon: "📡" },
    { name: "IRANWARLIVE", type: "Web · RSS", period: "2026 tiempo real", stat: "Strike type · Actores", icon: "🛡" },
  ];
  const months = ["ENE", "FEB", "MAR", "ABR", "MAY"];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        {sources.map((s) => (
          <div key={s.name} className="rounded border p-4 flex flex-col gap-2"
            style={{ borderColor: "rgba(88,184,200,0.22)", background: "rgba(88,184,200,0.06)" }}>
            <div className="flex items-center justify-between">
              <div className="font-mono text-[9px] tracking-[0.24em]" style={{ color: "rgba(88,184,200,0.85)" }}>{s.name}</div>
              <span className="text-base">{s.icon}</span>
            </div>
            <div className="font-mono text-[7.5px] tracking-[0.20em] px-2 py-0.5 rounded w-fit"
              style={{ background: "rgba(88,184,200,0.10)", color: "rgba(88,184,200,0.60)" }}>{s.type}</div>
            <div className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.45)" }}>{s.period}</div>
            <div className="font-mono text-[11px] tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.80)" }}>{s.stat}</div>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel>COBERTURA TEMPORAL 2026</SectionLabel>
        <div className="mt-3 space-y-2">
          {sources.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <div className="font-mono text-[8px] w-24 flex-shrink-0 truncate" style={{ color: "rgba(255,255,255,0.42)" }}>
                {s.name.split(" ")[0]}
              </div>
              <div className="flex-1 flex gap-1">
                {months.map((m, mi) => (
                  <motion.div key={m} className="flex-1 rounded text-center font-mono text-[7px] py-1"
                    style={{ background: "rgba(88,184,200,0.18)", color: "rgba(88,184,200,0.72)" }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.1 + mi * 0.06, duration: 0.3, ease: "easeOut" }}>
                    {m}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
        <div className="font-mono text-[8px] tracking-[0.30em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>ESTADÍSTICAS GLOBALES</div>
        <div className="flex gap-6">
          {[["5,120", "Eventos totales"], ["23 %", "Lethality rate 2026"], ["4", "Fuentes OSINT"], ["6 meses", "Cobertura"]].map(([val, lbl]) => (
            <div key={lbl}>
              <div className="font-mono text-[18px] tracking-tight" style={{ color: "rgba(88,184,200,0.85)" }}>{val}</div>
              <div className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.38)" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Panel 03 — SEÑAL: dual-axis time series chart ────────────────────────────

function NodePanel03() {
  const { flights, fatalities } = useExperienceStore((s) => s.chartSeries);
  const W = 520, H = 210, pX = 38, pY = 18;

  const minF = Math.min(...flights), maxF = Math.max(...flights);
  const maxFatal = Math.max(...fatalities, 1);
  const n = flights.length;

  const fx = (i: number) => pX + (i / (n - 1)) * (W - pX * 2);
  const fy = (v: number) => pY + (1 - (v - minF) / (maxF - minF)) * (H - pY * 2);
  const dy = (v: number) => pY + (1 - v / maxFatal) * (H - pY * 2);

  const flightPath  = flights.map((v, i) => `${i === 0 ? "M" : "L"} ${fx(i).toFixed(1)} ${fy(v).toFixed(1)}`).join(" ");
  const fatalPath   = fatalities.map((v, i) => `${i === 0 ? "M" : "L"} ${fx(i).toFixed(1)} ${dy(v).toFixed(1)}`).join(" ");
  const fatalArea   = fatalities.map((v, i) => `${i === 0 ? "M" : "L"} ${fx(i).toFixed(1)} ${dy(v).toFixed(1)}`).join(" ")
    + ` L ${fx(n - 1).toFixed(1)} ${H - pY} L ${fx(0).toFixed(1)} ${H - pY} Z`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>TRÁFICO AÉREO VS FATALIDADES — ÚLTIMOS 30 DÍAS (DATOS MOCK)</SectionLabel>
        <div className="mt-3 rounded border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)" }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 210 }}>
            {/* Area fill for fatalities */}
            <path d={fatalArea} fill="rgba(211,75,71,0.08)" />
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((t) => (
              <line key={t} x1={pX} x2={W - pX} y1={pY + t * (H - pY * 2)} y2={pY + t * (H - pY * 2)}
                stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            ))}
            {/* Flight path */}
            <path d={flightPath} fill="none" stroke="rgba(88,184,200,0.75)" strokeWidth="2" strokeLinejoin="round" />
            {/* Fatality path */}
            <path d={fatalPath} fill="none" stroke="rgba(211,75,71,0.80)" strokeWidth="2" strokeLinejoin="round" />
            {/* X labels */}
            {[0, 9, 19, 29].map((i) => (
              <text key={i} x={fx(i)} y={H - 3} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.28)"
                fontFamily="monospace">D{i + 1}</text>
            ))}
            {/* Y label left */}
            <text x={12} y={H / 2} textAnchor="middle" fontSize="7.5" fill="rgba(88,184,200,0.45)"
              transform={`rotate(-90 12 ${H / 2})`} fontFamily="monospace">VUELOS</text>
            {/* Y label right */}
            <text x={W - 10} y={H / 2} textAnchor="middle" fontSize="7.5" fill="rgba(211,75,71,0.45)"
              transform={`rotate(90 ${W - 10} ${H / 2})`} fontFamily="monospace">FATAL.</text>
          </svg>
        </div>
        <div className="flex gap-6 mt-2.5">
          {[["rgba(88,184,200,0.75)", "Vuelos airborne (OpenSky)"], ["rgba(211,75,71,0.80)", "Fatalidades diarias (ACLED)"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-2 font-mono text-[9px]" style={{ color: c as string }}>
              <span className="h-0.5 w-5 rounded flex-shrink-0" style={{ background: c as string }} />{l}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded border p-4" style={{ borderColor: "rgba(88,184,200,0.22)", background: "rgba(88,184,200,0.06)" }}>
        <div className="font-mono text-[7.5px] tracking-[0.32em] mb-2" style={{ color: "rgba(88,184,200,0.50)" }}>DEFINICIÓN DE LA SEÑAL CLAVE</div>
        <div className="font-mono text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>
          flight_drop_index = (flights_today − flights_mean_7d) / flights_mean_7d
        </div>
        <div className="mt-2.5 flex gap-4">
          {[["Umbral de alerta", "index < −0.30"], ["Horizonte predicción", "24 – 48 horas"], ["Baseline media", "7 días rodantes"]].map(([k, v]) => (
            <div key={k}>
              <div className="font-mono text-[7px] tracking-[0.20em]" style={{ color: "rgba(255,255,255,0.35)" }}>{k}</div>
              <div className="font-mono text-[10px]" style={{ color: "rgba(88,184,200,0.80)" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Panel 04 — MODELOS: ROC curve + confusion matrix + toggle ────────────────

function NodePanel04() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = models[activeIdx];

  return (
    <div className="flex flex-col gap-4">
      {/* Model selector */}
      <div>
        <SectionLabel>SELECCIONAR MODELO</SectionLabel>
        <div className="flex gap-2 mt-2">
          {models.map((m, i) => (
            <button key={m.key} type="button" onClick={() => setActiveIdx(i)}
              className="font-mono text-[8px] tracking-[0.18em] px-3.5 py-1.5 rounded transition-all duration-150"
              style={{
                background: activeIdx === i ? `${m.color}28` : "rgba(255,255,255,0.04)",
                border: `1px solid ${activeIdx === i ? m.color + "70" : "rgba(255,255,255,0.10)"}`,
                color: activeIdx === i ? m.color : "rgba(255,255,255,0.45)",
              }}>
              {m.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Performance summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ["ROC-AUC", active.temporal.rocAuc.toFixed(3)],
          ["F1",      active.temporal.f1.toFixed(3)],
          ["Recall",  active.temporal.recall.toFixed(3)],
          ["Precision", active.temporal.precision.toFixed(3)],
        ].map(([k, v]) => (
          <div key={k} className="rounded px-3 py-2.5 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <div className="font-mono text-[7px] tracking-[0.28em] mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>{k}</div>
            <div className="font-mono text-[15px]" style={{ color: active.color }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ROC curve */}
      <LineCurveChart
        title="CURVA ROC — COMPARACIÓN DE MODELOS"
        kicker={`AUC seleccionado: ${active.temporal.rocAuc.toFixed(3)}`}
        models={models}
        curves={rocCurves}
        selected={active.key}
        xLabel="Tasa de Falsos Positivos (FPR)"
        yLabel="TPR"
      />

      {/* Confusion matrix */}
      <ConfusionMatrixChart model={active} />

      <div className="font-mono text-[8px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
        Validación temporal: entrenamiento ene–abr 2026, test mayo 2026 (n={active.temporal.tn + active.temporal.fp + active.temporal.fn + active.temporal.tp} eventos)
      </div>
    </div>
  );
}

// ─── Panel 05 — SISTEMA: coefficient chart + threshold ────────────────────────

function NodePanel05() {
  const [threshold, setThreshold] = useState(0.5);

  return (
    <div className="flex flex-col gap-6">
      {/* Coefficient chart — natural height, InsightWidget sizes from its content */}
      <div>
        <SectionLabel>IMPORTANCIA DE VARIABLES — ODDS RATIOS (LOGREG L1)</SectionLabel>
        <div className="mt-2 rounded border border-white/10 bg-graphite-950/60 backdrop-blur-sm overflow-hidden">
          <div className="border-b border-white/5 bg-white/[0.02] px-3.5 py-3">
            <div className="text-[10px] font-semibold tracking-[0.2em] text-white/80">
              IMPACTO DE VARIABLES (REG. LOGÍSTICA)
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/45">
              Magnitud y dirección de coeficientes. Indica qué factores elevan o reducen la probabilidad de letalidad.
            </p>
          </div>
          <div className="p-3.5">
            <CoefficientInner />
          </div>
          <div className="border-t border-system-500/10 bg-system-500/5 px-3.5 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-system-500/80" />
              <p className="text-[9.5px] leading-snug text-system-500/90">
                <span className="font-semibold">INSIGHT: </span>
                Ataques aéreos y misiles en blancos civiles aumentan fuertemente la letalidad.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold chart — natural height */}
      <div>
        <SectionLabel>UMBRAL DE DECISIÓN — TRADE-OFF PRECISIÓN / RECALL</SectionLabel>
        <div className="mt-2">
          <ThresholdChart threshold={threshold} onThreshold={setThreshold} />
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Inline coefficient bars — same logic as CoefficientChart but without InsightWidget wrapper
function CoefficientInner() {
  const rows = [...logregCoefficients]
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
    .slice(0, 15);
  const max = Math.max(...rows.map((r) => Math.abs(r.coefficient)), 1);

  return (
    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 [scrollbar-width:thin]">
      {rows.map((r) => {
        const positive = r.coefficient >= 0;
        return (
          <div key={r.feature} className="grid grid-cols-[120px_1fr_38px] items-center gap-2">
            <div className="truncate text-[9px] text-white/55" title={r.feature}>{r.feature}</div>
            <div className="relative h-2 rounded bg-white/8">
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/16" />
              <div className="absolute top-0 h-full rounded"
                style={{
                  width: `${(Math.abs(r.coefficient) / max) * 50}%`,
                  left: positive ? "50%" : undefined,
                  right: positive ? undefined : "50%",
                  backgroundColor: positive ? "#58b8c8" : "#d34b47",
                }} />
            </div>
            <div className={`font-mono text-[9px] ${positive ? "text-system-500" : "text-critical-500"}`}>
              {r.coefficient.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[8px] tracking-[0.42em]" style={{ color: "rgba(255,255,255,0.28)" }}>
      {children}
    </div>
  );
}

// ─── Models table (kept for backwards compat, unused) ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ModelsTable({ data }: { data: ModelComparisonEntry[] }) {
  return null;
}
