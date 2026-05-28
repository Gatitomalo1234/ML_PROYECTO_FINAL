"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Constants ─────────────────────────────────────────────────────────────
const N   = 16_000;
const TAU = Math.PI * 2;

// Shooting-star direction (bottom-left → top-right diagonal)
const _SL = Math.sqrt(1.6 * 1.6 + 0.7 * 0.7);
const SDX  = 1.6 / _SL;   // normalized X component
const SDY  = 0.7 / _SL;   // normalized Y component

// ─── Helpers ───────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number)              { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number)           { return Math.max(lo, Math.min(hi, v)); }
function easeInOut(t: number)                               { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

// ─── Glow sprite texture ───────────────────────────────────────────────────
function buildGlowTex(): THREE.CanvasTexture {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const ctx = c.getContext("2d")!;
  const half = S / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0,    "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.92)");
  g.addColorStop(0.40, "rgba(255,255,255,0.28)");
  g.addColorStop(0.75, "rgba(255,255,255,0.04)");
  g.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

// ─── Sample logo image into N 3-D target points ────────────────────────────
async function sampleLogo(src: string, n: number): Promise<Float32Array> {
  const W = 512, H = 512;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = src; });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (px[(y * W + x) * 4] > 90) pts.push([x, y]);
    }
  }
  const scale = 5.2 / W;
  const out   = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p    = pts[Math.floor(Math.random() * pts.length)];
    out[i*3]   = (p[0] - W/2) * scale;
    out[i*3+1] = -(p[1] - H/2) * scale;
    out[i*3+2] = (Math.random() - 0.5) * 0.06;
  }
  return out;
}

// ─── GLSL shaders (per-vertex size + color) ────────────────────────────────
const VERT = /* glsl */`
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (400.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */`
  uniform   sampler2D uMap;
  varying   vec3      vColor;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    if (t.a < 0.005) discard;
    gl_FragColor = vec4(vColor, 1.0) * t;
  }
`;

// ─── Component ─────────────────────────────────────────────────────────────
export default function BootParticleIntro({ onStart }: { onStart: () => void }) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const textRef    = useRef<HTMLSpanElement>(null);
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060a0e, 1);
    renderer.domElement.style.filter = "brightness(1.18) contrast(1.05)";
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5.5;

    // ── Buffers ──────────────────────────────────────────────────────────
    const pos     = new Float32Array(N * 3);
    const vel     = new Float32Array(N * 3);
    const col     = new Float32Array(N * 3);
    const tCol    = new Float32Array(N * 3);
    const sz      = new Float32Array(N);
    const tSz     = new Float32Array(N);
    const twk     = new Float32Array(N); // permanent random 0..1 per particle

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const r  = 9 + Math.random() * 5;
      const th = Math.random() * TAU;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i3]   = r * Math.sin(ph) * Math.cos(th);
      pos[i3+1] = r * Math.sin(ph) * Math.sin(th);
      pos[i3+2] = (Math.random() - 0.5) * 4;
      col[i3]   = tCol[i3]   = 0.02;
      col[i3+1] = tCol[i3+1] = 0.04;
      col[i3+2] = tCol[i3+2] = 0.06;
      sz[i]  = tSz[i] = 0.2;
      twk[i] = Math.random();
    }

    // ── Geometry ─────────────────────────────────────────────────────────
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor",   new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(sz,  1));

    const glowTex  = buildGlowTex();
    const mat = new THREE.ShaderMaterial({
      uniforms:       { uMap: { value: glowTex } },
      vertexShader:   VERT,
      fragmentShader: FRAG,
      blending:       THREE.AdditiveBlending,
      depthWrite:     false,
      transparent:    true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ── Phase machine ─────────────────────────────────────────────────────
    type Ph = "LOADING"|"NIAN_ASSEMBLE"|"NIAN_HOLD"|"SHOOT"|"AIS_ASSEMBLE"|"IDLE"|"DISPERSING";
    const state = { ph: "LOADING" as Ph, start: 0 };

    let nianT: Float32Array | null = null;
    let aisT:  Float32Array | null = null;

    function goTo(p: Ph) { state.ph = p; state.start = performance.now(); }

    // ── Load both logos in parallel ───────────────────────────────────────
    Promise.all([
      sampleLogo("/logo_empresa.png", N),
      sampleLogo("/logo.png",         N),
    ]).then(([nian, ais]) => {
      nianT = nian;
      aisT  = ais;
      goTo("NIAN_ASSEMBLE");
    }).catch(() => {
      sampleLogo("/logo.png", N).then(ais => { aisT = ais; goTo("AIS_ASSEMBLE"); });
    });

    // ── Click → disperse ──────────────────────────────────────────────────
    const onClick = () => {
      if (state.ph !== "IDLE") return;
      goTo("DISPERSING");
      if (textRef.current) textRef.current.style.opacity = "0";
      setTimeout(() => onStartRef.current(), 1200);
    };
    mount.addEventListener("click", onClick);

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── RAF ───────────────────────────────────────────────────────────────
    let prev  = performance.now();
    let rafId = 0;
    let rotY  = 0;

    const aPos  = geo.attributes.position as THREE.BufferAttribute;
    const aCol  = geo.attributes.aColor   as THREE.BufferAttribute;
    const aSz   = geo.attributes.aSize    as THREE.BufferAttribute;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const now     = performance.now();
      const dt      = Math.min((now - prev) / 1000, 0.05);
      prev          = now;
      const t       = now / 1000;
      const elapsed = (now - state.start) / 1000;
      const ph      = state.ph;

      // ── Phase-level auto transitions ────────────────────────────────────
      if (ph === "NIAN_ASSEMBLE" && nianT) {
        let md = 0;
        for (let i = 0; i < N; i += 80) {
          const i3 = i*3;
          md = Math.max(md, Math.abs(pos[i3]-nianT[i3]) + Math.abs(pos[i3+1]-nianT[i3+1]));
        }
        if (md < 0.10 || elapsed > 3.8) goTo("NIAN_HOLD");
      }
      else if (ph === "NIAN_HOLD"     && elapsed > 1.5) goTo("SHOOT");
      else if (ph === "SHOOT"         && elapsed > 1.9) goTo("AIS_ASSEMBLE");
      else if (ph === "AIS_ASSEMBLE"  && aisT) {
        let md = 0;
        for (let i = 0; i < N; i += 80) {
          const i3 = i*3;
          md = Math.max(md, Math.abs(pos[i3]-aisT[i3]) + Math.abs(pos[i3+1]-aisT[i3+1]));
        }
        if (md < 0.10 || elapsed > 3.5) {
          goTo("IDLE");
          if (textRef.current) {
            textRef.current.style.transition = "opacity 1.4s ease";
            textRef.current.style.opacity    = "1";
          }
        }
      }

      // ── DISPERSING (separate fast path) ─────────────────────────────────
      if (ph === "DISPERSING" && aisT) {
        renderer.domElement.style.opacity = String(clamp(1 - elapsed / 1.2, 0, 1));
        for (let i = 0; i < N; i++) {
          const i3 = i*3;
          const ox = aisT[i3], oy = aisT[i3+1];
          const d  = Math.sqrt(ox*ox + oy*oy) + 0.001;
          vel[i3]   += (ox/d) * 0.32;
          vel[i3+1] += (oy/d) * 0.32 + 0.12;
          vel[i3]   *= 0.91; vel[i3+1] *= 0.91; vel[i3+2] *= 0.91;
          pos[i3]   += vel[i3]   * dt * 52;
          pos[i3+1] += vel[i3+1] * dt * 52;
          pos[i3+2] += vel[i3+2] * dt * 52;
        }
        aPos.needsUpdate = true;
        rotY += 0.01;
        points.rotation.y = rotY;
        renderer.render(scene, camera);
        return;
      }

      // ── Main particle loop ───────────────────────────────────────────────
      const cometT  = ph === "SHOOT" ? clamp(elapsed / 1.9, 0, 1) : 0;
      const headX   = lerp(-14, 14, easeInOut(cometT));
      const headY   = lerp(-2.2, 3.2, easeInOut(cometT));

      for (let i = 0; i < N; i++) {
        const i3  = i*3;
        const twki = twk[i];
        let tx = 0, ty = 0, tz = 0, ls = 0.04;

        // ── Target & color by phase ──────────────────────────────────────
        if (ph === "LOADING") {
          tx = pos[i3] * 0.998; ty = pos[i3+1] * 0.998; tz = pos[i3+2] * 0.998;
          ls = 1;
          tCol[i3]=0.02; tCol[i3+1]=0.04; tCol[i3+2]=0.06;
          tSz[i] = 0.2;

        } else if (ph === "NIAN_ASSEMBLE" && nianT) {
          tx = nianT[i3]; ty = nianT[i3+1]; tz = nianT[i3+2]; ls = 0.038;
          const dist  = Math.abs(pos[i3]-tx) + Math.abs(pos[i3+1]-ty);
          const bright = clamp(1 - dist * 0.22, 0, 1);
          tCol[i3]   = 0.85 * bright;
          tCol[i3+1] = 0.90 * bright;
          tCol[i3+2] = 1.00 * bright;
          tSz[i] = 0.55 + twki * 0.85;

        } else if (ph === "NIAN_HOLD" && nianT) {
          tx = nianT[i3]   + Math.sin(t * (0.7 + twki * 0.6) + twki * TAU) * 0.013;
          ty = nianT[i3+1] + Math.cos(t * (0.7 + twki * 0.6) + twki * TAU) * 0.013;
          tz = nianT[i3+2]; ls = 0.018;
          if (Math.random() < 0.0028) {
            // golden sparkle flash
            tCol[i3]=1.0; tCol[i3+1]=0.86; tCol[i3+2]=0.28;
            tSz[i] = 2.8 + Math.random();
          } else {
            tCol[i3]=0.88; tCol[i3+1]=0.93; tCol[i3+2]=1.0;
            tSz[i] = 0.65 + twki * 0.95;
          }

        } else if (ph === "SHOOT") {
          const t_i    = i / N;
          const trail  = t_i * 12;
          const perp   = (twki - 0.5) * 2 * t_i * 1.8; // fixed per-particle spread
          tx = headX - trail * SDX + perp * (-SDY);
          ty = headY - trail * SDY + perp * SDX;
          tz = (twki - 0.5) * t_i * 0.4;
          ls = 0.30;
          if (t_i < 0.06) {
            tCol[i3]=1.0; tCol[i3+1]=1.0; tCol[i3+2]=1.0;
            tSz[i] = 2.6 + twki * 0.8;
          } else if (t_i < 0.22) {
            const f = (t_i-0.06)/0.16;
            tCol[i3]=lerp(1.0,0.30,f); tCol[i3+1]=lerp(1.0,0.92,f); tCol[i3+2]=lerp(1.0,1.0,f);
            tSz[i]  = lerp(2.6, 1.6, f);
          } else if (t_i < 0.52) {
            const f = (t_i-0.22)/0.30;
            tCol[i3]=lerp(0.30,0.07,f); tCol[i3+1]=lerp(0.92,0.20,f); tCol[i3+2]=lerp(1.0,0.55,f);
            tSz[i]  = lerp(1.6, 0.7, f);
          } else {
            const f = clamp((t_i-0.52)/0.48, 0, 1);
            tCol[i3]=lerp(0.07,0.02,f); tCol[i3+1]=lerp(0.20,0.04,f); tCol[i3+2]=lerp(0.55,0.06,f);
            tSz[i]  = lerp(0.7, 0.18, f);
          }

        } else if (ph === "AIS_ASSEMBLE" && aisT) {
          tx = aisT[i3]; ty = aisT[i3+1]; tz = aisT[i3+2]; ls = 0.042;
          const dist  = Math.abs(pos[i3]-tx) + Math.abs(pos[i3+1]-ty);
          const p     = clamp(1 - dist * 0.20, 0, 1);
          tCol[i3]   = 0.13 * p;
          tCol[i3+1] = 0.77 * p;
          tCol[i3+2] = 0.88 * p;
          tSz[i] = 0.5 + twki * 0.85;

        } else if (ph === "IDLE" && aisT) {
          const freq = 0.58 + twki * 0.82;
          const amp  = 0.008 + twki * 0.007;
          tx = aisT[i3]   + Math.sin(t * freq + twki * TAU) * amp;
          ty = aisT[i3+1] + Math.cos(t * freq + twki * TAU) * amp;
          tz = aisT[i3+2]; ls = 0.015;
          if (twki > 0.96) {
            // slow-orbit particles
            tx += Math.cos(t * 1.1 + twki * 9) * 0.030;
            ty += Math.sin(t * 1.1 + twki * 9) * 0.030;
          }
          if (Math.random() < 0.0025) {
            // white/gold sparkle flash
            const gold = Math.random() < 0.5;
            tCol[i3]  = 1.0;
            tCol[i3+1] = gold ? 0.82 : 1.0;
            tCol[i3+2] = gold ? 0.22 : 1.0;
            tSz[i] = 3.0 + Math.random() * 0.8;
          } else {
            tCol[i3]=0.13; tCol[i3+1]=0.77; tCol[i3+2]=0.88;
            tSz[i] = 0.58 + twki * 0.72;
          }
        }

        // ── Physics ──────────────────────────────────────────────────────
        vel[i3]   *= 0.88; vel[i3+1] *= 0.88; vel[i3+2] *= 0.88;
        pos[i3]   += (tx - pos[i3])   * ls + vel[i3]   * dt;
        pos[i3+1] += (ty - pos[i3+1]) * ls + vel[i3+1] * dt;
        pos[i3+2] += (tz - pos[i3+2]) * ls + vel[i3+2] * dt;

        // ── Smooth color & size ─────────────────────────────────────────
        const cs = ph === "SHOOT" ? 0.14 : 0.065;
        col[i3]   += (tCol[i3]   - col[i3])   * cs;
        col[i3+1] += (tCol[i3+1] - col[i3+1]) * cs;
        col[i3+2] += (tCol[i3+2] - col[i3+2]) * cs;
        sz[i]     += (tSz[i]     - sz[i])      * 0.09;
      }

      aPos.needsUpdate = true;
      aCol.needsUpdate = true;
      aSz.needsUpdate  = true;

      // ── Rotation ────────────────────────────────────────────────────────
      const rSpeed = ph === "SHOOT" ? 0.009
                   : ph === "IDLE"  ? 0.0022
                   : 0.003;
      rotY += rSpeed;
      points.rotation.y = rotY;

      renderer.render(scene, camera);
    };
    tick();

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      mount.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      glowTex.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={mountRef} className="absolute inset-0 z-50 cursor-pointer">
      <span
        ref={textRef}
        style={{
          position:      "absolute",
          bottom:        "26%",
          left:          "50%",
          transform:     "translateX(-50%)",
          fontFamily:    "'Space Mono', monospace",
          fontSize:      "11px",
          letterSpacing: "0.44em",
          color:         "rgba(34, 197, 224, 0.70)",
          pointerEvents: "none",
          whiteSpace:    "nowrap",
          opacity:       "0",
          transition:    "opacity 0s",
        }}
      >
        CLICK PARA INICIALIZAR
      </span>
    </div>
  );
}
