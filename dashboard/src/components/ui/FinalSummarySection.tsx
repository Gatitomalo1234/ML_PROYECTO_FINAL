"use client";

import { motion } from "framer-motion";

// ─── Animation helpers ────────────────────────────────────────────────────────

const fade = (delay: number, duration = 0.7) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration, ease: "easeOut" },
});

const fadePure = (delay: number, duration = 0.7) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay, duration, ease: "easeOut" },
});

// ─── Real data from the project ───────────────────────────────────────────────

const PIPELINE = [
  { label: "FUENTES OSINT",      detail: "ACLED · GDELT · IranWarLive",  icon: "◈" },
  { label: "DATASET INTEGRADO",  detail: "3,771 eventos · 2026",          icon: "◉" },
  { label: "3 MODELOS ML",       detail: "LogReg · KNN · NaiveBayes",    icon: "◎" },
  { label: "MODELO FINAL",       detail: "Reg. Logística L1 · C=0.1",    icon: "◆" },
];

const STATS = [
  { value: "0.705", label: "ROC-AUC", sub: "Validación temporal", tone: "system"   },
  { value: "0.429", label: "F1-Score", sub: "Mayo 2026 · umbral 0.5", tone: "caution" },
  { value: "75%",   label: "Recall",   sub: "Eventos letales capturados", tone: "system" },
];

const FINDINGS = [
  {
    num: "01",
    title: "El objetivo supera al arma",
    body: "target_type_civilian es el predictor más fuerte (+0.88 log-odds). Los ataques a civiles elevan la probabilidad de fatalidades más que cualquier tipo de arma.",
    tone: "critical",
  },
  {
    num: "02",
    title: "LogReg L1 domina en temporalidad",
    body: "Con validación temporal (train ene–abr, test mayo), LogReg L1 supera a KNN (F1 0.268) y Naive Bayes (F1 0.368) en F1, ROC-AUC y Average Precision simultáneamente.",
    tone: "system",
  },
  {
    num: "03",
    title: "La señal predictiva existe",
    body: "ROC-AUC 0.705 vs 0.5 del clasificador aleatorio. Con fuentes abiertas es posible anticipar el 75% de eventos letales antes de que ocurran.",
    tone: "caution",
  },
];

const MODELS_TABLE = [
  { name: "Logistic Regression L1", auc: "0.705", f1: "0.429", recall: "0.750", best: true  },
  { name: "KNN k=15",               auc: "0.642", f1: "0.268", recall: "0.250", best: false },
  { name: "Gaussian Naive Bayes",   auc: "0.556", f1: "0.368", recall: "1.000", best: false },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinalSummarySection() {
  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-30 overflow-y-auto"
      style={{ background: "rgba(5,7,10,0.97)", backdropFilter: "blur(18px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1, ease: "easeInOut" }}
    >
      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 overlay-grid opacity-40" />

      <div className="relative mx-auto max-w-[1100px] px-10 py-12 pb-16">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <motion.div {...fadePure(0.3)} className="flex items-center justify-between mb-2">
          <div className="font-mono text-[8.5px] tracking-[0.55em] text-system-500/60">
            CASO CERRADO · CLASIFICACIÓN BINARIA · ML1 2026
          </div>
          <div className="font-mono text-[8px] tracking-[0.38em] text-white/22">
            CONFLICTO IRÁN–ISRAEL · ENE–MAY 2026
          </div>
        </motion.div>

        <motion.div {...fadePure(0.4)} className="h-px w-full mb-8"
          style={{ background: "linear-gradient(90deg, rgba(88,184,200,0.55) 0%, rgba(88,184,200,0.08) 60%, transparent 100%)" }} />

        {/* ── Research question ───────────────────────────────────────────────── */}
        <motion.div {...fade(0.55)} className="mb-10 text-center">
          <div className="font-mono text-[9px] tracking-[0.45em] text-system-500/55 mb-3">
            PREGUNTA DE INVESTIGACIÓN
          </div>
          <div className="font-display font-semibold leading-snug text-white/88"
            style={{ fontSize: "clamp(22px, 3vw, 34px)", letterSpacing: "0.12em" }}>
            ¿Puede el silencio del comercio anticipar la muerte?
          </div>
          <div className="mt-4 font-mono text-[11px] tracking-[0.28em]"
            style={{ color: "rgba(88,184,200,0.75)" }}>
            LA RESPUESTA: PARCIALMENTE SÍ.
          </div>
        </motion.div>

        {/* ── Pipeline flow ────────────────────────────────────────────────────── */}
        <motion.div {...fade(0.85)} className="mb-10">
          <div className="font-mono text-[8px] tracking-[0.42em] text-white/28 mb-4 text-center">
            PIPELINE DEL PROYECTO
          </div>
          <div className="flex items-center justify-center gap-0">
            {PIPELINE.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-lg border border-white/8
                  bg-white/[0.03]" style={{ minWidth: 160 }}>
                  <span className="font-mono text-[18px]" style={{ color: "rgba(88,184,200,0.70)" }}>
                    {step.icon}
                  </span>
                  <div className="font-mono text-[8.5px] tracking-[0.28em] text-white/70 text-center leading-tight">
                    {step.label}
                  </div>
                  <div className="font-mono text-[8px] text-white/35 text-center leading-snug">
                    {step.detail}
                  </div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="flex flex-col items-center px-1">
                    <div className="h-px w-8 bg-system-500/30" />
                    <span className="font-mono text-[9px] text-system-500/40 -mt-1">›</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Big stats ────────────────────────────────────────────────────────── */}
        <motion.div {...fade(1.2)} className="grid grid-cols-3 gap-5 mb-10">
          {STATS.map((s) => {
            const color = s.tone === "system" ? "rgba(88,184,200,1)" : "rgba(214,162,74,1)";
            const borderColor = s.tone === "system" ? "rgba(88,184,200,0.20)" : "rgba(214,162,74,0.20)";
            return (
              <div key={s.label} className="rounded-xl py-7 px-6 text-center"
                style={{ border: `1px solid ${borderColor}`, background: "rgba(255,255,255,0.025)" }}>
                <div className="font-display font-semibold leading-none mb-2"
                  style={{ fontSize: 48, color, letterSpacing: "0.04em" }}>
                  {s.value}
                </div>
                <div className="font-mono text-[11px] tracking-[0.28em] text-white/60 mb-1">
                  {s.label}
                </div>
                <div className="font-mono text-[9px] text-white/30">{s.sub}</div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Key findings ─────────────────────────────────────────────────────── */}
        <motion.div {...fade(1.65)} className="mb-10">
          <div className="font-mono text-[8px] tracking-[0.42em] text-white/28 mb-4 text-center">
            HALLAZGOS PRINCIPALES
          </div>
          <div className="grid grid-cols-3 gap-4">
            {FINDINGS.map((f) => {
              const tc = f.tone === "critical" ? "rgba(211,75,71,0.85)"
                       : f.tone === "caution"  ? "rgba(214,162,74,0.85)"
                       : "rgba(88,184,200,0.85)";
              const bc = f.tone === "critical" ? "rgba(211,75,71,0.18)"
                       : f.tone === "caution"  ? "rgba(214,162,74,0.18)"
                       : "rgba(88,184,200,0.18)";
              return (
                <div key={f.num} className="rounded-lg p-5"
                  style={{ border: `1px solid ${bc}`, background: "rgba(255,255,255,0.02)" }}>
                  <div className="font-mono text-[8px] tracking-[0.45em] mb-2" style={{ color: tc }}>
                    HALLAZGO {f.num}
                  </div>
                  <div className="font-display text-[12px] font-semibold leading-snug text-white/82 mb-3"
                    style={{ letterSpacing: "0.08em" }}>
                    {f.title}
                  </div>
                  <div className="font-mono text-[9px] leading-relaxed text-white/45">
                    {f.body}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Model comparison table ───────────────────────────────────────────── */}
        <motion.div {...fade(2.1)} className="mb-10">
          <div className="font-mono text-[8px] tracking-[0.42em] text-white/28 mb-3 text-center">
            COMPARACIÓN DE MODELOS · VALIDACIÓN TEMPORAL (MAYO 2026)
          </div>
          <div className="rounded-lg overflow-hidden border border-white/8">
            <div className="grid grid-cols-4 border-b border-white/8 bg-white/[0.04] px-5 py-2.5">
              {["MODELO", "ROC-AUC", "F1", "RECALL"].map((h) => (
                <div key={h} className="font-mono text-[8px] tracking-[0.32em] text-white/38">{h}</div>
              ))}
            </div>
            {MODELS_TABLE.map((m) => (
              <div key={m.name}
                className="grid grid-cols-4 px-5 py-3 border-b border-white/5 last:border-b-0"
                style={{ background: m.best ? "rgba(88,184,200,0.05)" : "transparent" }}>
                <div className="font-mono text-[9.5px] flex items-center gap-2"
                  style={{ color: m.best ? "rgba(88,184,200,0.90)" : "rgba(255,255,255,0.50)" }}>
                  {m.best && <span className="h-1.5 w-1.5 rounded-full bg-system-500 shrink-0" />}
                  {m.name}
                </div>
                <div className="font-mono text-[10px]"
                  style={{ color: m.best ? "rgba(88,184,200,0.85)" : "rgba(255,255,255,0.40)" }}>
                  {m.auc}
                </div>
                <div className="font-mono text-[10px]"
                  style={{ color: m.best ? "rgba(88,184,200,0.85)" : "rgba(255,255,255,0.40)" }}>
                  {m.f1}
                </div>
                <div className="font-mono text-[10px]"
                  style={{ color: m.best ? "rgba(88,184,200,0.85)" : "rgba(255,255,255,0.40)" }}>
                  {m.recall}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Closing statement ────────────────────────────────────────────────── */}
        <motion.div {...fade(2.55)} className="mb-10 text-center px-10">
          <div className="h-px w-24 mx-auto mb-7"
            style={{ background: "rgba(88,184,200,0.22)" }} />
          <p className="font-ui text-[13px] leading-relaxed text-white/55 max-w-[700px] mx-auto">
            Con exclusivamente fuentes gratuitas y abiertas fue posible construir un sistema
            de inteligencia que anticipa el <span style={{ color: "rgba(88,184,200,0.90)" }} className="font-semibold">75% de los eventos letales</span> en
            el conflicto Irán–Israel 2026, tres semanas antes de que ocurran.
            La regularización L1 seleccionó <span style={{ color: "rgba(88,184,200,0.90)" }} className="font-semibold">33 variables de 157 posibles</span>,
            revelando que el contexto del objetivo —no el arma— es el predictor más confiable de letalidad.
          </p>
        </motion.div>

        {/* ── Credits ──────────────────────────────────────────────────────────── */}
        <motion.div {...fadePure(3.0)}>
          <div className="h-px w-full mb-7"
            style={{ background: "linear-gradient(90deg, transparent, rgba(88,184,200,0.25) 30%, rgba(88,184,200,0.25) 70%, transparent)" }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-semibold tracking-[0.32em] text-white/70"
                style={{ fontSize: 18 }}>
                NIAN
              </div>
              <div className="font-mono text-[9px] tracking-[0.22em] text-white/35 mt-1">
                Nicolás Cárdenas · Miguel Camargo
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[9px] tracking-[0.30em] text-white/30">
                Machine Learning 1 · 2026-I
              </div>
              <div className="font-mono text-[9px] tracking-[0.24em] text-system-500/50 mt-1">
                Universidad Externado de Colombia
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Restart button ───────────────────────────────────────────────────── */}
        <motion.div {...fadePure(3.6)} className="mt-12 flex justify-center">
          <button
            onClick={() => window.location.reload()}
            className="group relative flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04]
              px-8 py-3.5 font-mono text-[10px] tracking-[0.38em] text-white/45
              transition-all duration-300 hover:border-system-500/40 hover:bg-system-500/8 hover:text-system-500/90"
          >
            <span className="text-[11px] transition-transform duration-300 group-hover:-translate-x-0.5">↺</span>
            VOLVER AL INICIO
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}
