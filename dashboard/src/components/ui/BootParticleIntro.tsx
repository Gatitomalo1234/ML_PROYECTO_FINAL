"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Config ─────────────────────────────────────────────────────────────────
const N   = 9_000;   // particles — fewer = visible individual dots, no blobs
const TAU = Math.PI * 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Glow sprite ─────────────────────────────────────────────────────────────
function buildGlowTex(): THREE.CanvasTexture {
  const S = 64, h = S / 2;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0,    "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.90)");
  g.addColorStop(0.38, "rgba(255,255,255,0.28)");
  g.addColorStop(0.72, "rgba(255,255,255,0.04)");
  g.addColorStop(1.0,  "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

// ─── Sample logo edges only (avoids solid-blob effect) ───────────────────────
// Samples only pixels where bright meets dark → outlines instead of fills
async function sampleLogoEdges(src: string, n: number): Promise<Float32Array> {
  const W = 512, H = 512;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = src; });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;

  const pts: [number, number][] = [];
  for (let y = 2; y < H - 2; y += 2) {
    for (let x = 2; x < W - 2; x += 2) {
      if (px[(y * W + x) * 4] < 80) continue;
      // Keep pixel only if at least one cardinal neighbor (3px away) is dark
      const edge =
        px[((y - 2) * W + x) * 4] < 55 || px[((y + 2) * W + x) * 4] < 55 ||
        px[(y * W + x - 2) * 4] < 55 || px[(y * W + x + 2) * 4] < 55;
      if (edge) pts.push([x, y]);
    }
  }

  const scale = 4.6 / W;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = pts[Math.floor(Math.random() * pts.length)];
    out[i * 3]     = (p[0] - W / 2) * scale;
    out[i * 3 + 1] = -(p[1] - H / 2) * scale;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
  }
  return out;
}

// ─── GLSL: per-vertex size + color ───────────────────────────────────────────
const VERT = /* glsl */`
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (380.0 / -mv.z);
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

// ─── Component ───────────────────────────────────────────────────────────────
export default function BootParticleIntro({ onStart }: { onStart: () => void }) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const nianRef    = useRef<HTMLDivElement>(null);
  const textRef    = useRef<HTMLSpanElement>(null);
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060a0e, 1);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 5.5;

    // ── Particle buffers ──────────────────────────────────────────────────
    const pos  = new Float32Array(N * 3);
    const vel  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const tCol = new Float32Array(N * 3);
    const sz   = new Float32Array(N);
    const tSz  = new Float32Array(N);
    const twk  = new Float32Array(N);  // stable random 0..1 per particle
    const twk2 = new Float32Array(N);  // second independent random

    for (let i = 0; i < N; i++) {
      twk[i]  = Math.random();
      twk2[i] = Math.random();
    }

    // ── Geometry ──────────────────────────────────────────────────────────
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos,  3));
    geo.setAttribute("aColor",   new THREE.BufferAttribute(col,  3));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(sz,   1));

    const glowTex = buildGlowTex();
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
    type Ph = "NIAN_SHOW"|"APPROACH"|"IMPACT"|"ASSEMBLE"|"IDLE"|"DISPERSING";
    const st = { ph: "NIAN_SHOW" as Ph, t0: performance.now() };
    const elapsed = () => (performance.now() - st.t0) / 1000;

    function goTo(p: Ph) { st.ph = p; st.t0 = performance.now(); }

    let aisTargets: Float32Array | null = null;
    let impactFired = false;

    // ── Load AIS logo ─────────────────────────────────────────────────────
    sampleLogoEdges("/logo.png", N).then(t => { aisTargets = t; });

    // ── Init: scatter particles far and dark ──────────────────────────────
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const r  = 18 + twk[i] * 8;
      const th = twk[i] * TAU;
      const ph = Math.acos(2 * twk2[i] - 1);
      pos[i3]   = r * Math.sin(ph) * Math.cos(th);
      pos[i3+1] = r * Math.sin(ph) * Math.sin(th);
      pos[i3+2] = r * Math.cos(ph);
      col[i3]   = tCol[i3]   = 0.02;
      col[i3+1] = tCol[i3+1] = 0.04;
      col[i3+2] = tCol[i3+2] = 0.06;
      sz[i]  = tSz[i] = 0.1;
    }

    // ── Enter APPROACH: reset particles to tight Z=-22 cluster ────────────
    function enterApproach() {
      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        pos[i3]   = (twk[i]  - 0.5) * 1.8;
        pos[i3+1] = (twk2[i] - 0.5) * 1.8;
        pos[i3+2] = -22 + (twk[i] - 0.5) * 2.5;
        vel[i3]   = (twk[i]  - 0.5) * 0.6;
        vel[i3+1] = (twk2[i] - 0.5) * 0.6;
        vel[i3+2] = 4 + twk[i] * 10;  // initial forward burst, varies per particle
        tCol[i3]   = lerp(0.75, 1.0, twk[i]);  // bright white-blue
        tCol[i3+1] = lerp(0.85, 1.0, twk2[i]);
        tCol[i3+2] = 1.0;
        tSz[i]  = 0.35 + twk[i] * 0.25;  // medium — perspective shrinks them far away
      }
      impactFired = false;
      goTo("APPROACH");
    }

    // ── Enter IMPACT: radial burst + flash ────────────────────────────────
    function enterImpact() {
      impactFired = true;
      // White flash
      renderer.setClearColor(0xffffff, 1);
      setTimeout(() => renderer.setClearColor(0x060a0e, 1), 110);

      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const angle = twk[i] * TAU;
        const spd   = 5 + twk2[i] * 16;
        vel[i3]   = Math.cos(angle) * spd;
        vel[i3+1] = Math.sin(angle) * spd;
        vel[i3+2] = (twk2[i] - 0.5) * 8;
        tSz[i]    = 0.14 + twk[i] * 0.20;  // shrink → crisp small dots
      }
      goTo("IMPACT");
    }

    // ── NIAN logo timing ──────────────────────────────────────────────────
    // Show NIAN immediately
    requestAnimationFrame(() => {
      if (nianRef.current) {
        nianRef.current.style.transition = "opacity 0.8s ease";
        nianRef.current.style.opacity    = "1";
      }
    });
    // After 2.2s fade NIAN out and start approach
    const nianTimer = setTimeout(() => {
      if (nianRef.current) {
        nianRef.current.style.transition = "opacity 0.6s ease";
        nianRef.current.style.opacity    = "0";
      }
      setTimeout(() => enterApproach(), 700);
    }, 2200);

    // ── Click ─────────────────────────────────────────────────────────────
    const onClick = () => {
      if (st.ph !== "IDLE") return;
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
    let prev = performance.now(), rafId = 0, rotY = 0;
    const aPos = geo.attributes.position as THREE.BufferAttribute;
    const aCol = geo.attributes.aColor   as THREE.BufferAttribute;
    const aSz  = geo.attributes.aSize    as THREE.BufferAttribute;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const dt  = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const t = now / 1000;
      const e = elapsed();

      // ── DISPERSING fast-path ─────────────────────────────────────────
      if (st.ph === "DISPERSING") {
        renderer.domElement.style.opacity = String(clamp(1 - e / 1.2, 0, 1));
        for (let i = 0; i < N; i++) {
          const i3 = i * 3;
          const ox = aisTargets ? aisTargets[i3] : 0;
          const oy = aisTargets ? aisTargets[i3+1] : 0;
          const d  = Math.sqrt(ox*ox + oy*oy) + 0.001;
          vel[i3]   += (ox/d) * 0.35;
          vel[i3+1] += (oy/d) * 0.35 + 0.12;
          vel[i3]   *= 0.91; vel[i3+1] *= 0.91; vel[i3+2] *= 0.91;
          pos[i3]   += vel[i3]   * dt * 50;
          pos[i3+1] += vel[i3+1] * dt * 50;
          pos[i3+2] += vel[i3+2] * dt * 50;
        }
        aPos.needsUpdate = true;
        rotY += 0.01;
        points.rotation.y = rotY;
        renderer.render(scene, camera);
        return;
      }

      // ── Phase transitions ────────────────────────────────────────────
      if (st.ph === "APPROACH") {
        // Trigger impact when most particles have crossed z > -0.5
        if (!impactFired) {
          let forward = 0;
          for (let i = 0; i < N; i += 40) forward += pos[i*3+2] > -0.5 ? 1 : 0;
          if (forward > N/40 * 0.6 || e > 2.0) enterImpact();
        }
      }
      else if (st.ph === "IMPACT" && e > 0.55) {
        goTo("ASSEMBLE");
      }
      else if (st.ph === "ASSEMBLE" && aisTargets) {
        let maxDist = 0;
        for (let i = 0; i < N; i += 60) {
          const i3 = i * 3;
          maxDist = Math.max(maxDist, Math.abs(pos[i3] - aisTargets[i3]) + Math.abs(pos[i3+1] - aisTargets[i3+1]));
        }
        if (maxDist < 0.12 || e > 3.5) {
          goTo("IDLE");
          if (textRef.current) {
            textRef.current.style.transition = "opacity 1.4s ease";
            textRef.current.style.opacity    = "1";
          }
        }
      }

      // ── Per-particle update ─────────────────────────────────────────
      for (let i = 0; i < N; i++) {
        const i3   = i * 3;
        const twki = twk[i], twk2i = twk2[i];

        if (st.ph === "NIAN_SHOW") {
          // Particles invisible in background during NIAN display
          pos[i3]   *= 0.994; pos[i3+1] *= 0.994; pos[i3+2] *= 0.994;
          tCol[i3]   = 0.02; tCol[i3+1] = 0.04; tCol[i3+2] = 0.06;
          tSz[i]     = 0.1;

        } else if (st.ph === "APPROACH") {
          // Accelerate toward camera (+Z), converge X/Y to center
          vel[i3]   += (0 - pos[i3])   * 0.12 * dt * 60;  // X spring to center
          vel[i3+1] += (0 - pos[i3+1]) * 0.12 * dt * 60;  // Y spring to center
          vel[i3+2] += lerp(12, 28, clamp(e / 1.8, 0, 1)) * dt * 60; // accelerate +Z
          vel[i3]   *= 0.88; vel[i3+1] *= 0.88; vel[i3+2] *= 0.96;
          pos[i3]   += vel[i3]   * dt;
          pos[i3+1] += vel[i3+1] * dt;
          pos[i3+2] += vel[i3+2] * dt;
          // Color: white core with cyan fringe
          const fr = clamp(e / 1.2, 0, 1);
          tCol[i3]   = lerp(1.0, 0.40, fr * twki * 0.6);
          tCol[i3+1] = lerp(1.0, 0.88, fr * twki * 0.4);
          tCol[i3+2] = 1.0;
          tSz[i]  = 0.40 + twki * 0.28;
          col[i3]   += (tCol[i3]   - col[i3])   * 0.14;
          col[i3+1] += (tCol[i3+1] - col[i3+1]) * 0.14;
          col[i3+2] += (tCol[i3+2] - col[i3+2]) * 0.14;
          sz[i]     += (tSz[i]     - sz[i])      * 0.10;
          continue;

        } else if (st.ph === "IMPACT") {
          vel[i3]   *= 0.88; vel[i3+1] *= 0.88; vel[i3+2] *= 0.88;
          pos[i3]   += vel[i3]   * dt * 52;
          pos[i3+1] += vel[i3+1] * dt * 52;
          pos[i3+2] += vel[i3+2] * dt * 52;
          tCol[i3]   = lerp(1.0, 0.13, clamp(e * 1.8, 0, 1));
          tCol[i3+1] = lerp(1.0, 0.77, clamp(e * 1.8, 0, 1));
          tCol[i3+2] = lerp(1.0, 0.88, clamp(e * 1.8, 0, 1));
          col[i3]   += (tCol[i3]   - col[i3])   * 0.14;
          col[i3+1] += (tCol[i3+1] - col[i3+1]) * 0.14;
          col[i3+2] += (tCol[i3+2] - col[i3+2]) * 0.14;
          sz[i]     += (tSz[i]     - sz[i])      * 0.12;
          continue;

        } else if (st.ph === "ASSEMBLE" && aisTargets) {
          const tx = aisTargets[i3], ty = aisTargets[i3+1], tz = aisTargets[i3+2];
          vel[i3]   *= 0.82; vel[i3+1] *= 0.82; vel[i3+2] *= 0.82;
          pos[i3]   += (tx - pos[i3])   * 0.045 + vel[i3]   * dt;
          pos[i3+1] += (ty - pos[i3+1]) * 0.045 + vel[i3+1] * dt;
          pos[i3+2] += (tz - pos[i3+2]) * 0.045 + vel[i3+2] * dt;
          const d = Math.abs(pos[i3]-tx) + Math.abs(pos[i3+1]-ty);
          const p = clamp(1 - d * 0.28, 0, 1);
          tCol[i3]   = 0.13 * p; tCol[i3+1] = 0.77 * p; tCol[i3+2] = 0.88 * p;
          tSz[i] = 0.15 + twki * 0.22;

        } else if (st.ph === "IDLE" && aisTargets) {
          const freq = 0.55 + twki * 0.85;
          const amp  = 0.007 + twki * 0.007;
          const tx = aisTargets[i3]   + Math.sin(t * freq + twki * TAU) * amp;
          const ty = aisTargets[i3+1] + Math.cos(t * freq + twki * TAU) * amp;
          const tz = aisTargets[i3+2];
          if (twki > 0.96) {
            // micro-orbit
            const ox = aisTargets[i3]   + Math.cos(t * 1.1 + twk2i * 9) * 0.028;
            const oy = aisTargets[i3+1] + Math.sin(t * 1.1 + twk2i * 9) * 0.028;
            pos[i3]   += (ox - pos[i3])   * 0.018;
            pos[i3+1] += (oy - pos[i3+1]) * 0.018;
          } else {
            pos[i3]   += (tx - pos[i3])   * 0.016;
            pos[i3+1] += (ty - pos[i3+1]) * 0.016;
          }
          pos[i3+2] += (tz - pos[i3+2]) * 0.016;
          if (Math.random() < 0.0022) {
            const gold = Math.random() < 0.5;
            tCol[i3] = 1.0; tCol[i3+1] = gold ? 0.82 : 1.0; tCol[i3+2] = gold ? 0.20 : 1.0;
            tSz[i] = 2.8 + Math.random() * 0.8;
          } else {
            tCol[i3]   = 0.13; tCol[i3+1] = 0.77; tCol[i3+2] = 0.88;
            tSz[i]     = 0.18 + twki * 0.22;
          }
        }

        // ── Standard color + size lerp ─────────────────────────────────
        col[i3]   += (tCol[i3]   - col[i3])   * 0.07;
        col[i3+1] += (tCol[i3+1] - col[i3+1]) * 0.07;
        col[i3+2] += (tCol[i3+2] - col[i3+2]) * 0.07;
        sz[i]     += (tSz[i]     - sz[i])      * 0.09;
      }

      aPos.needsUpdate = true;
      aCol.needsUpdate = true;
      aSz.needsUpdate  = true;

      const rSpeed = st.ph === "APPROACH" ? 0.004
                   : st.ph === "IMPACT"   ? 0.014
                   : st.ph === "IDLE"     ? 0.0018
                   : 0.003;
      rotY += rSpeed;
      points.rotation.y = rotY;
      renderer.render(scene, camera);
    };
    tick();

    // ── Cleanup ───────────────────────────────────────────────────────
    return () => {
      clearTimeout(nianTimer);
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
    <div
      ref={mountRef}
      className="absolute inset-0 z-50 cursor-pointer"
      style={{ background: "#060a0e" }}  // prevents background bleed before canvas mounts
    >
      {/* NIAN Industries logo — DOM image, clean & sharp, no particle blob */}
      <div
        ref={nianRef}
        style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          opacity:        0,
          pointerEvents:  "none",
        }}
      >
        <img
          src="/logo_empresa.png"
          alt="NIAN Industries"
          style={{
            width:      "300px",
            height:     "300px",
            objectFit:  "contain",
            filter:     "brightness(0.92) drop-shadow(0 0 18px rgba(200,220,255,0.35))",
            userSelect: "none",
          }}
        />
      </div>

      {/* Click prompt */}
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
          color:         "rgba(34, 197, 224, 0.72)",
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
