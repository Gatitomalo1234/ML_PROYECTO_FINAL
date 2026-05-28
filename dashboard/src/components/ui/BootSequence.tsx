"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";
import { useBootAudio } from "@/hooks/useBootAudio";

// ─── Boot text lines ───────────────────────────────────────────────────────
const LINES = [
  { ms: 300,  text: "SISTEMA CLASIFICADO",          sub: "CLEARANCE LEVEL: ALPHA-7 · AUTHORIZED" },
  { ms: 850,  text: "INITIALIZING ORBITAL NETWORK", sub: "NODES: 47 ACTIVE · LATENCY: 12ms" },
  { ms: 1400, text: "ESTABLECIENDO ENLACE",          sub: "ENCRYPTION: AES-256 · HANDSHAKE COMPLETE" },
  { ms: 1950, text: "SATELLITE RELAY CONNECTED",     sub: "GEO-SYNC ORBIT · ALT: 35,786 KM" },
  { ms: 2600, text: "SCANNING GLOBAL AIRSPACE",      sub: "COVERAGE: 98.4% · ANOMALIES: DETECTED" },
  { ms: 3200, text: "ENCRYPTION VERIFIED",           sub: "HASH: 7F3A9C2D · DIGITAL SIGNATURE OK" },
  { ms: 3900, text: "GLOBAL SYSTEM ONLINE",          sub: "ALL SYSTEMS NOMINAL · LAUNCHING INTERFACE" },
];

const HEX_DATA = [
  "7F3A:9C2D:0x4FA2", "SIG//AES-256:OK", "LAT:26.77°N · LON:53.44°E",
  "ALT:35,786KM · VEL:3.07km/s", "SAT-ID:KH-12//ACTIVE", "FREQ:8.025 GHz",
  "ORBITS:14312//PASS:1", "DECRYPTION:PASS", "UPLINK:NOMINAL",
];

const SVG_SIZE = 520;
const CX = SVG_SIZE / 2;

// ─── Component ─────────────────────────────────────────────────────────────
export default function BootSequence() {
  const initialized = useExperienceStore((s) => s.initialized);

  const [visible,   setVisible]   = useState(true);
  const [phase,     setPhase]     = useState(0);
  const [progress,  setProgress]  = useState(0);
  const [hexIdx,    setHexIdx]    = useState(0);
  const [canClose,  setCanClose]  = useState(false);

  // Synthetic audio — beep per line + system-online chord
  useBootAudio(phase);

  // Minimum 3 s so the boot sequence is always seen
  useEffect(() => {
    const id = setTimeout(() => setCanClose(true), 3000);
    return () => clearTimeout(id);
  }, []);

  // Dismiss when both initialized and minimum time have passed
  useEffect(() => {
    if (!initialized || !canClose) return;
    const id = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(id);
  }, [initialized, canClose]);

  // Sequential text reveals
  useEffect(() => {
    const ids = LINES.map(({ ms }, i) =>
      window.setTimeout(() => setPhase((p) => Math.max(p, i + 1)), ms),
    );
    return () => ids.forEach(clearTimeout);
  }, []);

  // Progress bar via rAF
  useEffect(() => {
    const start = performance.now();
    const duration = 5500;
    let raf: number;
    const tick = (now: number) => {
      setProgress(Math.min(100, ((now - start) / duration) * 100));
      if (now - start < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cycling hex data
  useEffect(() => {
    const id = setInterval(() => setHexIdx((i) => (i + 1) % HEX_DATA.length), 720);
    return () => clearInterval(id);
  }, []);

  // Stable particle positions
  const particles = useMemo(() =>
    Array.from({ length: 62 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: 0.5 + Math.random() * 1.8,
      o: 0.06 + Math.random() * 0.20,
      d: 2.8 + Math.random() * 4.5,
      dl: Math.random() * 5.0,
    })), []);

  // Ring tick marks at 0°/90°/180°/270° on inner ring (r=120)
  const majorTicks = useMemo(() =>
    [0, 90, 180, 270].map((deg) => {
      const r = (deg - 90) * (Math.PI / 180);
      return { x1: CX + 116 * Math.cos(r), y1: CX + 116 * Math.sin(r), x2: CX + 132 * Math.cos(r), y2: CX + 132 * Math.sin(r) };
    }), []);

  // Minor ticks every 30°
  const minorTicks = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const r = (i * 30 - 90) * (Math.PI / 180);
      return { x1: CX + 120 * Math.cos(r), y1: CX + 120 * Math.sin(r), x2: CX + 127 * Math.cos(r), y2: CX + 127 * Math.sin(r) };
    }), []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="boot"
          className="fixed inset-0 z-[100] overflow-hidden select-none"
          style={{ background: "#02060b" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          {/* ── Keyframes ── */}
          <style>{`
            @keyframes bs-scan {
              0%   { top: -2px; opacity: 0; }
              4%   { opacity: 1; }
              95%  { opacity: 0.65; }
              100% { top: 100vh; opacity: 0; }
            }
            @keyframes bs-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
            @keyframes bs-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
            @keyframes bs-arc {
              from { stroke-dashoffset: 0; }
              to   { stroke-dashoffset: -1257; }
            }
          `}</style>

          {/* Radial ambient glow */}
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 75% 55% at 50% 46%, rgba(15,36,58,0.52) 0%, transparent 72%)" }} />

          {/* Fine grid */}
          <div className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0.028,
              backgroundImage: "linear-gradient(rgba(111,211,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(111,211,255,1) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }} />

          {/* Horizontal scan line */}
          <div className="pointer-events-none absolute inset-x-0"
            style={{
              height: 1,
              background: "linear-gradient(90deg, transparent 0%, rgba(111,211,255,0.10) 15%, rgba(111,211,255,0.48) 50%, rgba(111,211,255,0.10) 85%, transparent 100%)",
              boxShadow: "0 0 10px rgba(111,211,255,0.20)",
              animation: "bs-scan 5.8s linear infinite",
            }} />

          {/* Floating particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="pointer-events-none absolute rounded-full"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: "#6fd3ff" }}
              animate={{ opacity: [p.o * 0.25, p.o, p.o * 0.35] }}
              transition={{ duration: p.d, delay: p.dl, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

          {/* ── HUD Rings (centered) ── */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

            {/* Outer slow dashed ring (CSS div) */}
            <div className="absolute rounded-full" style={{
              width: 560, height: 560,
              border: "1px dashed rgba(111,211,255,0.055)",
              animation: "bs-cw 42s linear infinite",
            }} />

            {/* Mid ring asymmetric */}
            <div className="absolute rounded-full" style={{
              width: 410, height: 410,
              borderTop: "1px solid rgba(111,211,255,0.18)",
              borderRight: "1px solid rgba(111,211,255,0.06)",
              borderBottom: "1px solid rgba(111,211,255,0.14)",
              borderLeft: "1px solid rgba(111,211,255,0.06)",
              animation: "bs-ccw 16s linear infinite",
            }} />

            {/* Inner SVG rings + ticks + crosshair */}
            <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className="absolute" style={{ overflow: "visible" }}>

              {/* Dashed outer circle */}
              <circle cx={CX} cy={CX} r="255"
                fill="none" stroke="rgba(111,211,255,0.06)" strokeWidth="0.8"
                strokeDasharray="3 11" />

              {/* Mid reference circle */}
              <circle cx={CX} cy={CX} r="190"
                fill="none" stroke="rgba(111,211,255,0.08)" strokeWidth="0.6"
                strokeDasharray="60 30 8 30" />

              {/* Inner ring static */}
              <circle cx={CX} cy={CX} r="124"
                fill="none" stroke="rgba(111,211,255,0.12)" strokeWidth="1"
                strokeDasharray="20 12 2 12" />

              {/* Inner ring animated arc sweep */}
              <circle cx={CX} cy={CX} r="124"
                fill="none" stroke="rgba(111,211,255,0.28)" strokeWidth="1"
                strokeDasharray="90 690"
                style={{ transformOrigin: `${CX}px ${CX}px`, animation: "bs-cw 8s linear infinite" }}
              />

              {/* Major ticks */}
              {majorTicks.map((t, i) => (
                <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke="rgba(111,211,255,0.40)" strokeWidth="1.5" />
              ))}

              {/* Minor ticks */}
              {minorTicks.map((t, i) => (
                <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke="rgba(111,211,255,0.15)" strokeWidth="0.7" />
              ))}

              {/* Crosshair */}
              <line x1={CX - 18} y1={CX} x2={CX - 8} y2={CX}  stroke="rgba(111,211,255,0.30)" strokeWidth="1" />
              <line x1={CX + 8}  y1={CX} x2={CX + 18} y2={CX} stroke="rgba(111,211,255,0.30)" strokeWidth="1" />
              <line x1={CX} y1={CX - 18} x2={CX} y2={CX - 8}  stroke="rgba(111,211,255,0.30)" strokeWidth="1" />
              <line x1={CX} y1={CX + 8}  x2={CX} y2={CX + 18} stroke="rgba(111,211,255,0.30)" strokeWidth="1" />

              {/* Center circle */}
              <circle cx={CX} cy={CX} r="4"
                fill="none" stroke="rgba(111,211,255,0.45)" strokeWidth="1" />
              <circle cx={CX} cy={CX} r="1.5"
                fill="rgba(111,211,255,0.55)" />

              {/* Compass labels */}
              {[
                { deg: 0,   label: "N" },
                { deg: 90,  label: "E" },
                { deg: 180, label: "S" },
                { deg: 270, label: "W" },
              ].map(({ deg, label }) => {
                const r = (deg - 90) * (Math.PI / 180);
                return (
                  <text key={deg}
                    x={CX + 148 * Math.cos(r)} y={CX + 148 * Math.sin(r) + 4}
                    textAnchor="middle" fontSize="8" letterSpacing="1"
                    fill="rgba(111,211,255,0.28)" fontFamily="'IBM Plex Mono', monospace">
                    {label}
                  </text>
                );
              })}

              {/* Azimuth numbers at 45° intervals */}
              {[45, 135, 225, 315].map((deg) => {
                const r = (deg - 90) * (Math.PI / 180);
                return (
                  <text key={deg}
                    x={CX + 142 * Math.cos(r)} y={CX + 142 * Math.sin(r) + 3}
                    textAnchor="middle" fontSize="6.5"
                    fill="rgba(111,211,255,0.16)" fontFamily="'IBM Plex Mono', monospace">
                    {deg}°
                  </text>
                );
              })}
            </svg>

            {/* Fast inner spinning accent ring */}
            <div className="absolute rounded-full" style={{
              width: 84, height: 84,
              borderTop: "1px solid rgba(111,211,255,0.35)",
              borderRight: "1px solid transparent",
              borderBottom: "1px solid rgba(111,211,255,0.12)",
              borderLeft: "1px solid transparent",
              animation: "bs-cw 3.5s linear infinite",
            }} />
          </div>

          {/* ── Corner brackets ── */}
          <CornerBracket pos="tl" />
          <CornerBracket pos="tr" />
          <CornerBracket pos="bl" />
          <CornerBracket pos="br" />

          {/* ── Top label ── */}
          <motion.div className="absolute inset-x-0 top-8 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.9 }}>
            <div className="font-mono text-[8.5px] tracking-[0.50em] text-white/20">
              AEROSPACE INTELLIGENCE SYSTEM · v4.7.1 · CLASIFICADO
            </div>
          </motion.div>

          {/* ── System text lines — positioned right of the HUD rings ── */}
          <div className="pointer-events-none absolute top-[22%]"
            style={{ left: "calc(50% + 295px)", width: 400 }}>
            {LINES.slice(0, phase).map((line, i) => (
              <motion.div
                key={i}
                className="mb-3 border-l-2 pl-3"
                style={{ borderColor: i === phase - 1 ? "rgba(111,211,255,0.60)" : "rgba(111,211,255,0.14)" }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: i === phase - 1 ? 1 : 0.35, x: 0 }}
                transition={{ duration: 0.38, ease: [0.22, 0.12, 0.02, 1] }}
              >
                <div className="font-display text-[10.5px] tracking-[0.40em]"
                  style={{ color: i === phase - 1 ? "rgba(111,211,255,0.92)" : "rgba(255,255,255,0.28)" }}>
                  {line.text}
                </div>
                <div className="mt-0.5 font-mono text-[8.5px] tracking-[0.18em] text-white/22">
                  {line.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Left sidebar data ── */}
          <div className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 space-y-1.5">
            {["26.77°N", "53.44°E", "ALT: ORB", "SAT-7 / LIVE"].map((d, i) => (
              <motion.div key={d}
                className="font-mono text-[8px] tracking-[0.22em] text-white/18"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.0 + i * 0.18, duration: 0.5 }}>
                {d}
              </motion.div>
            ))}
          </div>

          {/* ── Cycling hex data — bottom-left, away from text ── */}
          <div className="pointer-events-none absolute bottom-[24vh] left-10 text-left">
            <AnimatePresence mode="wait">
              <motion.div key={hexIdx}
                className="font-mono text-[8.5px] tracking-[0.18em] text-white/18"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.28 }}>
                {HEX_DATA[hexIdx]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Progress bar ── */}
          <div className="pointer-events-none absolute bottom-[14vh] left-1/2 -translate-x-1/2 w-[520px] max-w-[88vw]">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[8.5px] tracking-[0.28em] text-white/25">
              <span>CARGANDO SISTEMA ORBITAL</span>
              <span>{Math.round(progress)}%</span>
            </div>
            {/* Main bar */}
            <div className="relative h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <motion.div className="absolute inset-y-0 left-0"
                style={{
                  background: "linear-gradient(90deg, rgba(111,211,255,0.18), rgba(111,211,255,0.72))",
                  boxShadow: "0 0 7px rgba(111,211,255,0.35)",
                }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.08 }}
              />
            </div>
            {/* Secondary offset bar */}
            <div className="relative mt-px h-px w-full" style={{ background: "rgba(255,255,255,0.04)" }}>
              <motion.div className="absolute inset-y-0 left-0"
                style={{ background: "rgba(111,211,255,0.25)" }}
                animate={{ width: `${Math.min(100, progress + 8)}%` }}
                transition={{ ease: "linear", duration: 0.08 }}
              />
            </div>
            {/* Segment ticks above bar */}
            <div className="mt-1 flex justify-between">
              {[0, 25, 50, 75, 100].map((v) => (
                <div key={v} className="font-mono text-[7px] tracking-wider"
                  style={{ color: progress >= v ? "rgba(111,211,255,0.40)" : "rgba(255,255,255,0.10)" }}>
                  {v === 0 || v === 100 ? "" : `${v}`}
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom status ── */}
          <motion.div className="pointer-events-none absolute inset-x-0 bottom-7 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}>
            <div className="font-mono text-[8px] tracking-[0.42em] text-white/16">
              CANAL SEGURO · CIFRADO ACTIVO · ACCESO RESTRINGIDO
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Corner bracket ─────────────────────────────────────────────────────────
function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const isTop  = pos[0] === "t";
  const isLeft = pos[1] === "l";
  const color  = "rgba(111,211,255,0.18)";

  return (
    <motion.div
      className={`pointer-events-none absolute h-12 w-12
        ${isTop  ? "top-6"    : "bottom-6"}
        ${isLeft ? "left-6"   : "right-6"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.12, duration: 0.7 }}
    >
      {/* Vertical arm */}
      <div className="absolute w-px h-full"
        style={{
          [isLeft ? "left" : "right"]: 0,
          background: color,
        }} />
      {/* Horizontal arm */}
      <div className="absolute h-px w-full"
        style={{
          [isTop ? "top" : "bottom"]: 0,
          background: color,
        }} />
      {/* Corner dot */}
      <div className="absolute h-1 w-1 rounded-full"
        style={{
          [isTop  ? "top"    : "bottom"]: -0.5,
          [isLeft ? "left"   : "right"]:  -0.5,
          background: "rgba(111,211,255,0.45)",
        }} />
    </motion.div>
  );
}
