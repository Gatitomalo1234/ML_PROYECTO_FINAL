"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 65_000;
const LERP_SPEED     = 0.04;
const FRICTION       = 0.92;
const TAU            = Math.PI * 2;
const EXTRUDE        = 0.55; // half-depth of each logo face — shallower keeps shape readable

const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Soft-glow circle texture for particles ────────────────────────────────────
function createCircleTexture(): THREE.CanvasTexture {
  const size   = 128;
  const cv     = document.createElement("canvas");
  cv.width     = size; cv.height = size;
  const ctx    = cv.getContext("2d")!;
  const center = size / 2;
  const radius = size / 2 - 2;
  const grad   = ctx.createRadialGradient(center, center, 0, center, center, radius);
  grad.addColorStop(0,    "rgba(255,255,255,1)");
  grad.addColorStop(0.12, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.3,  "rgba(255,255,255,0.5)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.12)");
  grad.addColorStop(0.8,  "rgba(255,255,255,0.02)");
  grad.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(cv);
}

// ─── 3-D extruded logo sampling ───────────────────────────────────────────────
// Returns positions (n×3) and faceTypes (n): 0=front, 1=back, 2=edge
async function sampleLogo(
  src: string,
  n: number,
): Promise<{ positions: Float32Array; faceTypes: Float32Array }> {
  const W = 512, H = 512; // 4× fewer pixels than 1024 — same visual result, ~4× faster
  const cv  = document.createElement("canvas");
  cv.width  = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = src; });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;

  const interior: [number, number][] = [];
  const edges:    [number, number][] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4] <= 30) continue;
      // Edge = foreground pixel with at least one background neighbor (4-connectivity)
      const isEdge =
        x === 0 || x === W - 1 || y === 0 || y === H - 1 ||
        px[((y - 1) * W + x) * 4] <= 30 ||
        px[((y + 1) * W + x) * 4] <= 30 ||
        px[(y * W + (x - 1)) * 4] <= 30 ||
        px[(y * W + (x + 1)) * 4] <= 30;
      (isEdge ? edges : interior).push([x, y]);
    }
  }

  // Fallback: if edge detection produced nothing, treat all as interior
  const allPixels = interior.length > 0 ? interior : edges;
  const edgePixels = edges.length > 0 ? edges : interior;

  const scale     = 6.0 / W;
  const positions = new Float32Array(n * 3);
  const faceTypes = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const rand = Math.random();
    let p: [number, number];
    let face: number;
    let z: number;

    if (rand < 0.40) {
      // Front face — interior pixels, closest to camera
      p    = allPixels[Math.floor(Math.random() * allPixels.length)];
      face = 0;
      z    = EXTRUDE * 0.5 + (Math.random() - 0.5) * 0.04;
    } else if (rand < 0.60) {
      // Back face — interior pixels, furthest from camera
      p    = allPixels[Math.floor(Math.random() * allPixels.length)];
      face = 1;
      z    = -EXTRUDE * 0.5 + (Math.random() - 0.5) * 0.04;
    } else {
      // Edge fill — 40% on edges: the amber bevel that defines the 3D shape
      p    = edgePixels[Math.floor(Math.random() * edgePixels.length)];
      face = 2;
      z    = (Math.random() - 0.5) * EXTRUDE;
    }

    positions[i * 3]     = (p[0] - W / 2) * scale;
    positions[i * 3 + 1] = -(p[1] - H / 2) * scale;
    positions[i * 3 + 2] = z;
    faceTypes[i]          = face;
  }

  return { positions, faceTypes };
}

// ─── Face colour presets ───────────────────────────────────────────────────────
// NIAN logo (silver theme): front=silver-white, back=dim-silver, edge=gold-bevel
const NIAN_COLORS = [
  [0.82, 0.90, 1.00], // front
  [0.38, 0.50, 0.68], // back
  [0.90, 0.70, 0.24], // edge — warm gold bevel
];
// AIS logo (cyan theme): front=bright-cyan, back=deep-blue, edge=amber-bevel
const AIS_COLORS = [
  [0.15, 0.80, 0.90], // front
  [0.05, 0.38, 0.62], // back
  [0.72, 0.48, 0.14], // edge — amber bevel
];

// ─── Liquid glass SVG filter (from user's design system) ─────────────────────
function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter id="ctx-glass" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.042 0.042" numOctaves="2" seed="5" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2.5" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="18" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="1.2" result="final" />
          <feComposite in="final" in2="final" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

// ─── Pulsing dot that reveals a glass context card on hover ───────────────────
function ContextPulse({
  pulseRef, side, label, title, titleLine2, titleSize, subtitle, tag, onTouch,
}: {
  pulseRef:   React.RefObject<HTMLDivElement>;
  side:       "left" | "right";
  label:      string;
  title:      string;
  titleLine2?: string;
  titleSize:  number;
  subtitle:   string;
  tag:        string;
  onTouch?:   () => void;
}) {
  const align = side === "right" ? "right" : "left";
  const cardPos = side === "right" ? { right: 0 } : { left: 0 };

  return (
    <div
      ref={pulseRef}
      style={{
        position:      "absolute",
        bottom:        28,
        [align]:       28,
        zIndex:        2,
        opacity:       0,
        pointerEvents: "none",
        transition:    "opacity 0.85s ease",
      }}
    >
      {/* GlassFilter included once per side */}
      <GlassFilter />

      <div className="group relative">
        {/* ── Hover card — sits above the dot, revealed on group-hover ── */}
        <div
          onMouseEnter={onTouch}
          className={[
            "absolute bottom-full mb-3 pointer-events-none",
            "group-hover:pointer-events-auto",
            "opacity-0 translate-y-3 scale-[0.95]",
            "group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100",
            "transition-all duration-[320ms] ease-out",
            side === "right" ? "text-right" : "text-left",
          ].join(" ")}
          style={{
            ...cardPos,
            width:                300,
            background:           "rgba(5,9,13,0.84)",
            backdropFilter:       "url(#ctx-glass) blur(18px) saturate(1.5)",
            WebkitBackdropFilter: "blur(18px) saturate(1.5)",
            border:               "1px solid rgba(255,255,255,0.08)",
            borderTop:            "1.5px solid rgba(88,184,200,0.35)",
            borderRadius:         5,
            padding:              "20px 22px",
            boxShadow: [
              "inset 0 1px 0 rgba(255,255,255,0.07)",
              "inset 0 -1px 0 rgba(0,0,0,0.40)",
              "0 20px 60px rgba(0,0,0,0.80)",
              "0 0 0 0.5px rgba(88,184,200,0.10)",
              "0 0 40px rgba(88,184,200,0.04)",
            ].join(", "),
          }}
        >
          <div className="font-mono text-[7.5px] tracking-[0.52em] text-white/30 mb-2">
            {label}
          </div>
          <div className="h-px mb-3" style={{ background: "rgba(88,184,200,0.18)" }} />
          <div
            className="font-display font-semibold leading-tight text-white/88"
            style={{ fontSize: titleSize, letterSpacing: "0.22em" }}
          >
            {title}
            {titleLine2 && <><br />{titleLine2}</>}
          </div>
          <div className="mt-3 font-ui text-[10px] tracking-[0.12em] text-white/42">
            {subtitle}
          </div>
          <div className="mt-1.5 font-mono text-[8px] tracking-[0.24em] text-system-500/65">
            {tag}
          </div>
        </div>

        {/* ── Pulsing dot — 22 px, 3-layer ripple ──────────────────────── */}
        <div className="relative h-[22px] w-[22px]">
          {/* Slow outer ripple */}
          <div
            className="absolute inset-0 rounded-full bg-system-500/20 animate-ping"
            style={{ animationDuration: "2.6s" }}
          />
          {/* Fast inner ripple */}
          <div
            className="absolute inset-[3px] rounded-full bg-system-500/22 animate-ping"
            style={{ animationDuration: "1.9s", animationDelay: "0.7s" }}
          />
          {/* Core dot */}
          <div
            className="absolute inset-[5px] rounded-full bg-system-500"
            style={{
              boxShadow: "0 0 10px 3px rgba(88,184,200,0.85), 0 0 22px 6px rgba(88,184,200,0.35)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BootParticleIntro({ onStart }: { onStart: () => void }) {
  const mountRef      = useRef<HTMLDivElement>(null);
  const starRef       = useRef<HTMLCanvasElement>(null);
  const textRef       = useRef<HTMLSpanElement>(null);
  const nianCardRef   = useRef<HTMLDivElement>(null);
  const aisCardRef    = useRef<HTMLDivElement>(null);
  const nianTouchedRef = useRef(false);
  const onStartRef  = useRef(onStart);
  const clickRef    = useRef<() => void>(() => {});
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Procedural star field — drawn once, zero network request ────────
    const starEl = starRef.current;
    if (starEl) {
      starEl.width  = window.innerWidth;
      starEl.height = window.innerHeight;
      const sc = starEl.getContext("2d")!;
      // Transparent canvas bg — BootParticleIntro div provides #060a0e base
      for (let s = 0; s < 1800; s++) {
        const x = Math.random() * starEl.width;
        const y = Math.random() * starEl.height;
        const r = Math.random() < 0.10 ? 1.2 : Math.random() < 0.32 ? 0.75 : 0.38;
        const a = 0.22 + Math.random() * 0.68;
        const h = 195 + Math.floor(Math.random() * 45); // blue-white hue 195–240
        sc.fillStyle = `hsla(${h},${20 + Math.floor(Math.random() * 40)}%,${85 + Math.floor(Math.random() * 15)}%,${a})`;
        sc.beginPath();
        sc.arc(x, y, r, 0, Math.PI * 2);
        sc.fill();
      }
    }

    // ── Three.js — alpha:true so HTML star-background shows through ──────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    // position:absolute + z-index:1 ensures the canvas paints ABOVE the HTML
    // background layers (stars, glow, vignette) which are also position:absolute.
    // Without this, CSS 2.1 painting order puts in-flow elements under positioned ones.
    renderer.domElement.style.position    = "absolute";
    renderer.domElement.style.inset       = "0";
    renderer.domElement.style.zIndex      = "1";
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.opacity    = "0";
    renderer.domElement.style.transition = "opacity 0.4s ease";
    requestAnimationFrame(() => { renderer.domElement.style.opacity = "1"; });

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // ── Buffers ──────────────────────────────────────────────────────────
    const positions    = new Float32Array(PARTICLE_COUNT * 3);
    const colors       = new Float32Array(PARTICLE_COUNT * 3);
    const velocities   = new Float32Array(PARTICLE_COUNT * 3);
    const targets      = new Float32Array(PARTICLE_COUNT * 3);
    const targetColors = new Float32Array(PARTICLE_COUNT * 3);
    const twk          = new Float32Array(PARTICLE_COUNT);
    const twk2         = new Float32Array(PARTICLE_COUNT);

    // 65 k particles at 0.044 = dense, crisp logo with clear shape
    const material = new THREE.PointsMaterial({
      size:            0.044,
      map:             createCircleTexture(),
      vertexColors:    true,
      transparent:     true,
      opacity:         1.0,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
      sizeAttenuation: true,
      alphaTest:       0.001,
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Init: particles scattered in a ring off-screen ───────────────────
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      twk[i]  = Math.random();
      twk2[i] = Math.random();
      const i3    = i * 3;
      const angle = twk[i] * TAU;
      const r     = 9 + twk2[i] * 5;
      positions[i3]     = Math.cos(angle) * r;
      positions[i3 + 1] = Math.sin(angle) * r;
      positions[i3 + 2] = (twk[i] - 0.5) * 2;
      velocities[i3] = velocities[i3 + 1] = velocities[i3 + 2] = 0;
      targets[i3]     = positions[i3];
      targets[i3 + 1] = positions[i3 + 1];
      targets[i3 + 2] = positions[i3 + 2];
      colors[i3] = targetColors[i3] = 0.02;
      colors[i3 + 1] = targetColors[i3 + 1] = 0.04;
      colors[i3 + 2] = targetColors[i3 + 2] = 0.06;
    }

    // ── Phase machine ────────────────────────────────────────────────────
    type Ph = "LOADING"|"NIAN_ASSEMBLE"|"NIAN_HOLD"|"STREAM"|"AIS_ASSEMBLE"|"IDLE"|"DISPERSING";
    const st = { ph: "LOADING" as Ph, t0: performance.now() };
    const elapsed = () => (performance.now() - st.t0) / 1000;
    function goTo(p: Ph) { st.ph = p; st.t0 = performance.now(); }

    let nianT:    Float32Array | null = null;
    let aisT:     Float32Array | null = null;
    let nianFace: Float32Array | null = null;
    let aisFace:  Float32Array | null = null;
    let ctaShown = false;

    // ── Load logos (3-D extruded) ─────────────────────────────────────────
    Promise.all([
      sampleLogo("/logo_empresa.png", PARTICLE_COUNT),
      sampleLogo("/logo.png",         PARTICLE_COUNT),
    ]).then(([nianResult, aisResult]) => {
      nianT    = nianResult.positions;
      nianFace = nianResult.faceTypes;
      aisT     = aisResult.positions;
      aisFace  = aisResult.faceTypes;

      // Aim particles at NIAN logo with face-based colours
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3   = i * 3;
        const face = nianFace[i];
        targets[i3]     = nianT[i3];
        targets[i3 + 1] = nianT[i3 + 1];
        targets[i3 + 2] = nianT[i3 + 2];
        targetColors[i3]     = NIAN_COLORS[face][0];
        targetColors[i3 + 1] = NIAN_COLORS[face][1];
        targetColors[i3 + 2] = NIAN_COLORS[face][2];
      }
      goTo("NIAN_ASSEMBLE");
    });

    // ── Click handler ────────────────────────────────────────────────────
    const onClick = () => {
      const ph = st.ph;
      if (ph === "LOADING" || ph === "NIAN_ASSEMBLE" || ph === "DISPERSING") return;
      if (!ctaShown) return; // Block until full sequence has played and CTA is visible
      goTo("DISPERSING");
      if (textRef.current)    textRef.current.style.opacity    = "0";
      if (nianCardRef.current) { nianCardRef.current.style.opacity = "0"; nianCardRef.current.style.pointerEvents = "none"; }
      if (aisCardRef.current)  { aisCardRef.current.style.opacity  = "0"; aisCardRef.current.style.pointerEvents  = "none"; }
      setTimeout(() => onStartRef.current(), 1200);
    };
    clickRef.current = onClick;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // ── Mouse parallax — raw NDC + smoothed values updated each frame ────
    let mouseRawX = 0, mouseRawY = 0;   // -1..+1, updated on move
    let smoothMouseX = 0, smoothMouseY = 0; // lerped, used in rotation
    const handleMouseMove = (e: MouseEvent) => {
      mouseRawX =  (e.clientX / window.innerWidth)  * 2 - 1;  // -1=left  +1=right
      mouseRawY = -((e.clientY / window.innerHeight) * 2 - 1); // -1=bottom +1=top
    };
    window.addEventListener("mousemove", handleMouseMove);

    // ── Render loop ───────────────────────────────────────────────────────
    let prev = performance.now(), rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt  = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const t = now / 1000;
      const e = elapsed();

      const pos = geometry.attributes.position.array as Float32Array;
      const col = geometry.attributes.color.array    as Float32Array;

      // ── Phase transitions ─────────────────────────────────────────────
      if (st.ph === "NIAN_ASSEMBLE" && nianT) {
        let maxD = 0;
        for (let i = 0; i < PARTICLE_COUNT; i += 60) {
          const i3 = i * 3;
          maxD = Math.max(maxD, Math.abs(pos[i3] - nianT[i3]) + Math.abs(pos[i3 + 1] - nianT[i3 + 1]));
        }
        if (maxD < 0.12 || e > 4.0) {
          goTo("NIAN_HOLD");
          if (nianCardRef.current) {
            nianCardRef.current.style.opacity       = "1";
            nianCardRef.current.style.pointerEvents = "auto";
          }
        }
      }
      else if (st.ph === "NIAN_HOLD" && nianTouchedRef.current) {
        goTo("STREAM");
        if (nianCardRef.current) {
          nianCardRef.current.style.opacity       = "0";
          nianCardRef.current.style.pointerEvents = "none";
        }
      }
      else if (st.ph === "STREAM" && e > 2.5) {
        // Switch to AIS logo — set face-based target positions & colours
        if (aisT && aisFace) {
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3   = i * 3;
            const face = aisFace[i];
            targets[i3]     = aisT[i3];
            targets[i3 + 1] = aisT[i3 + 1];
            targets[i3 + 2] = aisT[i3 + 2];
            targetColors[i3]     = AIS_COLORS[face][0];
            targetColors[i3 + 1] = AIS_COLORS[face][1];
            targetColors[i3 + 2] = AIS_COLORS[face][2];
          }
        }
        goTo("AIS_ASSEMBLE");
      }
      else if (st.ph === "AIS_ASSEMBLE" && aisT) {
        let maxD = 0;
        for (let i = 0; i < PARTICLE_COUNT; i += 60) {
          const i3 = i * 3;
          maxD = Math.max(maxD, Math.abs(pos[i3] - aisT[i3]) + Math.abs(pos[i3 + 1] - aisT[i3 + 1]));
        }
        if (maxD < 0.12 || e > 4.0) goTo("IDLE");
      }

      // CTA + AIS card appear 5 s into IDLE
      if (st.ph === "IDLE" && !ctaShown && e > 5.0) {
        ctaShown = true;
        if (textRef.current) {
          textRef.current.style.transition = "opacity 1.6s ease";
          textRef.current.style.opacity    = "1";
        }
        if (aisCardRef.current) {
          aisCardRef.current.style.opacity       = "1";
          aisCardRef.current.style.pointerEvents = "auto";
        }
      }

      if (st.ph === "DISPERSING") {
        renderer.domElement.style.opacity = String(clamp(1 - e / 1.2, 0, 1));
      }

      // ── Main particle loop ────────────────────────────────────────────
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3   = i * 3;
        const twki = twk[i];

        let tx = targets[i3];
        let ty = targets[i3 + 1];
        let tz = targets[i3 + 2];
        let tr = targetColors[i3];
        let tg = targetColors[i3 + 1];
        let tb = targetColors[i3 + 2];

        // ── Phase-specific overrides ──────────────────────────────────

        if (st.ph === "NIAN_HOLD" && nianT && nianFace) {
          // Per-face breathing oscillation
          const freq = 0.70 + twki * 0.50;
          tx = nianT[i3]     + Math.sin(t * freq + twki * TAU) * 0.013;
          ty = nianT[i3 + 1] + Math.cos(t * freq + twki * TAU) * 0.013;
          tz = nianT[i3 + 2] + Math.sin(t * freq * 0.55 + twki * TAU) * 0.04;
          // Maintain face colours — pull from preset
          const face   = nianFace[i];
          const bright = 0.70 + twki * 0.55;
          tr = clamp(NIAN_COLORS[face][0] * bright, 0, 1);
          tg = clamp(NIAN_COLORS[face][1] * bright, 0, 1);
          tb = clamp(NIAN_COLORS[face][2] * bright, 0, 1);
          // Gold sparkle flash
          if (Math.random() < 0.0025) { tr = 1.0; tg = 0.86; tb = 0.28; }
        }

        else if (st.ph === "IDLE" && aisT && aisFace) {
          const face  = aisFace[i];
          const freq  = 0.55 + twki * 0.85;
          const amp   = 0.010 + twki * 0.010;

          // XY breathing — each particle has its own phase
          tx = aisT[i3]     + Math.sin(t * freq + twki * TAU) * amp;
          ty = aisT[i3 + 1] + Math.cos(t * freq + twki * TAU) * amp;
          // Z breathing — adds visible in-out depth pulsation
          tz = aisT[i3 + 2] + Math.sin(t * freq * 0.55 + twki * TAU) * 0.05;

          // Face-based colour with per-particle brightness for texture
          const bright = 0.70 + twki * 0.58;
          tr = clamp(AIS_COLORS[face][0] * bright, 0, 1);
          tg = clamp(AIS_COLORS[face][1] * bright, 0, 1);
          tb = clamp(AIS_COLORS[face][2] * bright, 0, 1);

          // Corona tier — micro-orbiting ring (top 3%), wider radius
          if (twki > 0.97) {
            tx = aisT[i3]     + Math.cos(t * 1.15 + twki * 9) * 0.060;
            ty = aisT[i3 + 1] + Math.sin(t * 1.15 + twki * 9) * 0.060;
            tz = aisT[i3 + 2];
          }
          // Drift tier — slow nebula escape and return (next 4%)
          else if (twki > 0.93) {
            const dAngle = twki * TAU * 6.3;
            const dPhase = clamp(Math.sin(t * 0.39 + twki * 5) * 0.5 + 0.5, 0, 1);
            tx = aisT[i3]     + Math.cos(dAngle) * dPhase * 0.24;
            ty = aisT[i3 + 1] + Math.sin(dAngle) * dPhase * 0.24;
            tz = aisT[i3 + 2];
            tr *= (1 - dPhase * 0.60);
            tg *= (1 - dPhase * 0.60);
            tb *= (1 - dPhase * 0.60);
          }

          // Sparkle flashes — higher rate + mega-burst variant
          if (Math.random() < 0.0038) {
            const mega = Math.random() < 0.15;
            const gold = !mega && Math.random() < 0.40;
            tr = mega ? 1.0 : (gold ? 1.0  : 0.80);
            tg = mega ? 1.0 : (gold ? 0.78 : 0.95);
            tb = mega ? 1.0 : (gold ? 0.12 : 1.00);
          }
        }

        else if (st.ph === "STREAM") {
          if (!nianT) continue;
          const waveT = clamp(e / 2.5, 0, 1);
          const waveX = lerp(-3.5, 4.5, waveT);
          const baseX = nianT[i3];
          const baseY = nianT[i3 + 1];
          const dx    = baseX - waveX;
          const infl  = Math.exp(-dx * dx * 0.65);
          tx = baseX + (twk[i]  - 0.5) * 1.2 * infl;
          ty = baseY + (twk2[i] - 0.5) * 0.7 * infl;
          tz = nianT[i3 + 2] + infl * 0.12;
          tr = lerp(0.82, 1.00, infl * 0.85);
          tg = lerp(0.90, 0.98, infl * 0.65);
          tb = 1.0;
          velocities[i3]     *= FRICTION;
          velocities[i3 + 1] *= FRICTION;
          velocities[i3 + 2] *= FRICTION;
          pos[i3]     += (tx - pos[i3])     * 0.055 + velocities[i3]     * dt;
          pos[i3 + 1] += (ty - pos[i3 + 1]) * 0.055 + velocities[i3 + 1] * dt;
          pos[i3 + 2] += (tz - pos[i3 + 2]) * 0.055 + velocities[i3 + 2] * dt;
          col[i3]     += (tr - col[i3])     * 0.07;
          col[i3 + 1] += (tg - col[i3 + 1]) * 0.07;
          col[i3 + 2] += (tb - col[i3 + 2]) * 0.07;
          continue;
        }

        else if (st.ph === "DISPERSING" && aisT) {
          const ox = aisT[i3], oy = aisT[i3 + 1];
          const d  = Math.sqrt(ox * ox + oy * oy) + 0.001;
          velocities[i3]     += (ox / d) * 0.35;
          velocities[i3 + 1] += (oy / d) * 0.35 + 0.12;
          velocities[i3]     *= FRICTION;
          velocities[i3 + 1] *= FRICTION;
          velocities[i3 + 2] *= FRICTION;
          pos[i3]     += velocities[i3]     * dt * 50;
          pos[i3 + 1] += velocities[i3 + 1] * dt * 50;
          pos[i3 + 2] += velocities[i3 + 2] * dt * 50;
          col[i3]     += (0.02 - col[i3])     * 0.06;
          col[i3 + 1] += (0.04 - col[i3 + 1]) * 0.06;
          col[i3 + 2] += (0.06 - col[i3 + 2]) * 0.06;
          continue;
        }

        // ── Standard LERP physics ─────────────────────────────────────
        velocities[i3]     *= FRICTION;
        velocities[i3 + 1] *= FRICTION;
        velocities[i3 + 2] *= FRICTION;
        pos[i3]     += (tx - pos[i3])     * LERP_SPEED + velocities[i3]     * dt;
        pos[i3 + 1] += (ty - pos[i3 + 1]) * LERP_SPEED + velocities[i3 + 1] * dt;
        pos[i3 + 2] += (tz - pos[i3 + 2]) * LERP_SPEED + velocities[i3 + 2] * dt;
        col[i3]     += (tr - col[i3])     * LERP_SPEED;
        col[i3 + 1] += (tg - col[i3 + 1]) * LERP_SPEED;
        col[i3 + 2] += (tb - col[i3 + 2]) * LERP_SPEED;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate    = true;

      // ── Smooth mouse — lag factor 0.06 ≈ 0.3 s soft follow ─────────
      smoothMouseX += (mouseRawX - smoothMouseX) * 0.06;
      smoothMouseY += (mouseRawY - smoothMouseY) * 0.06;

      // ── 3-D rotation ─────────────────────────────────────────────────
      // Base: ±27° Y oscillation (31 s) + ±6° X nod (48 s)
      // Mouse: additive layer — right moves Y, up moves X
      if (st.ph === "STREAM" || st.ph === "DISPERSING") {
        points.rotation.y *= 0.96;
        points.rotation.x *= 0.96;
      } else {
        points.rotation.y = Math.sin(t * 0.20) * 0.48 + smoothMouseX * 0.10;
        points.rotation.x = Math.sin(t * 0.13) * 0.10 + smoothMouseY * 0.07;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      clickRef.current = () => {};
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-50 cursor-pointer"
      style={{ background: "#060a0e" }}
      onClick={() => clickRef.current()}
    >
      <style>{`
        @keyframes bpi-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(56,189,248,0); }
          50%       { opacity: 0.55; box-shadow: 0 0 12px 2px rgba(56,189,248,0.12); }
        }
        @keyframes bpi-glow {
          0%, 100% { opacity: 0.50; }
          50%       { opacity: 1.00; }
        }
        @keyframes bpi-glow2 {
          0%, 100% { opacity: 0.40; }
          50%       { opacity: 0.85; }
        }
      `}</style>

      {/* ── Layer 1: Stars — procedural canvas, zero network request ──── */}
      <canvas
        ref={starRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />

      {/* ── Layer 2: Galactic dust band — warm horizontal haze ──────────── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(180deg, transparent 20%, rgba(140,70,20,0.06) 45%, rgba(140,70,20,0.09) 55%, transparent 80%)",
      }} />

      {/* ── Layer 3: Primary cyan glow — pulses behind logo ─────────────── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 48% 42% at 50% 50%, rgba(88,184,200,0.12) 0%, rgba(88,184,200,0.04) 45%, transparent 72%)",
        animation: "bpi-glow 3.8s ease-in-out infinite",
      }} />

      {/* ── Layer 4: Amber counter-glow — sunrise from below ────────────── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 35% at 50% 82%, rgba(200,100,30,0.10) 0%, rgba(200,80,20,0.04) 50%, transparent 75%)",
        animation: "bpi-glow2 5.2s ease-in-out infinite",
      }} />

      {/* ── Layer 5: Strong vignette ─────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 35%, rgba(2,6,11,0.82) 100%)",
      }} />

      {/* ── NIAN pulsing dot + hover card ───────────────────────────────── */}
      <ContextPulse
        pulseRef={nianCardRef}
        side="left"
        label="DESARROLLADO POR"
        title="NIAN"
        titleSize={30}
        subtitle="Nicolás Cárdenas & Miguel Camargo"
        tag="Externado de Colombia · ML1 2026"
        onTouch={() => { nianTouchedRef.current = true; }}
      />

      {/* ── AIS pulsing dot + hover card ─────────────────────────────────── */}
      <ContextPulse
        pulseRef={aisCardRef}
        side="right"
        label="SISTEMA"
        title="AEROSPACE"
        titleLine2="INTELLIGENCE SYSTEM"
        titleSize={17}
        subtitle="Predicción de conflictos armados"
        tag="OSINT · ML · IRÁN–ISRAEL · 2026"
      />

      <span
        ref={textRef}
        style={{
          position:      "absolute",
          zIndex:        2,
          bottom:        "6%",
          left:          "50%",
          transform:     "translateX(-50%)",
          fontFamily:    "var(--font-mono), monospace",
          fontSize:      "10px",
          letterSpacing: "0.46em",
          color:         "rgba(56, 189, 248, 0.90)",
          whiteSpace:    "nowrap",
          opacity:       "0",
          transition:    "opacity 0s",
        }}
        onTransitionEnd={(ev) => {
          if ((ev.target as HTMLElement).style.opacity === "1")
            (ev.target as HTMLElement).style.animation = "bpi-pulse 2.6s ease-in-out infinite";
        }}
      >
        CLICK PARA INICIALIZAR
      </span>
    </div>
  );
}
