"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Exact structure from particle_system.html ───────────────────────────────
const PARTICLE_COUNT = 18_000;
const LERP_SPEED     = 0.04;
const FRICTION       = 0.92;
const TAU            = Math.PI * 2;

const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Exact copy of particle_system.html createCircleTexture() ────────────────
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

// ─── Sample logo → N random 3-D positions (same approach as particle_system.html)
async function sampleLogo(src: string, n: number): Promise<Float32Array> {
  const W = 512, H = 512;
  const cv  = document.createElement("canvas");
  cv.width  = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = src; });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;

  const pts: [number, number][] = [];
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (px[(y * W + x) * 4] > 80) pts.push([x, y]);
    }
  }

  // Same scale approach as particle_system.html (scale = worldSize / canvasSize)
  const scale = 5.2 / W;
  const out   = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p       = pts[Math.floor(Math.random() * pts.length)];
    out[i * 3]     = (p[0] - W / 2) * scale;
    out[i * 3 + 1] = -(p[1] - H / 2) * scale;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
  }
  return out;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BootParticleIntro({ onStart }: { onStart: () => void }) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const textRef    = useRef<HTMLSpanElement>(null);
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Three.js setup — exact replica of particle_system.html ──────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060a0e, 1);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    // FOV=75, Z=5 — exactly as in particle_system.html
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // ── Buffers (same layout as particle_system.html) ───────────────────
    const positions    = new Float32Array(PARTICLE_COUNT * 3);
    const colors       = new Float32Array(PARTICLE_COUNT * 3);
    const velocities   = new Float32Array(PARTICLE_COUNT * 3);
    const targets      = new Float32Array(PARTICLE_COUNT * 3);
    const targetColors = new Float32Array(PARTICLE_COUNT * 3);
    const twk          = new Float32Array(PARTICLE_COUNT);   // stable random [0,1]
    const twk2         = new Float32Array(PARTICLE_COUNT);

    // ── Material — exact copy of particle_system.html ───────────────────
    const material = new THREE.PointsMaterial({
      size:         0.065,
      map:          createCircleTexture(),
      vertexColors: true,
      transparent:  true,
      opacity:      1.0,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      sizeAttenuation: true,
      alphaTest:    0.001,
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Init: particles scattered on the LEFT side (off-screen) ─────────
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      twk[i]  = Math.random();
      twk2[i] = Math.random();
      const i3 = i * 3;
      // Start in a cloud left of screen: x ~ [-14, -9]
      positions[i3]     = -12 - twk[i] * 4;
      positions[i3 + 1] = (twk2[i] - 0.5) * 9;
      positions[i3 + 2] = (twk[i]  - 0.5) * 4;
      velocities[i3]    = 0; velocities[i3 + 1] = 0; velocities[i3 + 2] = 0;
      targets[i3]        = positions[i3];
      targets[i3 + 1]    = positions[i3 + 1];
      targets[i3 + 2]    = positions[i3 + 2];
      colors[i3] = targetColors[i3] = 0.02;
      colors[i3 + 1] = targetColors[i3 + 1] = 0.04;
      colors[i3 + 2] = targetColors[i3 + 2] = 0.06;
    }

    // ── Phase machine ────────────────────────────────────────────────────
    type Ph = "LOADING"|"NIAN_ASSEMBLE"|"NIAN_HOLD"|"STREAM"|"AIS_ASSEMBLE"|"IDLE"|"DISPERSING";
    const st = { ph: "LOADING" as Ph, t0: performance.now() };
    const elapsed = () => (performance.now() - st.t0) / 1000;
    function goTo(p: Ph) { st.ph = p; st.t0 = performance.now(); }

    let nianT: Float32Array | null = null;
    let aisT:  Float32Array | null = null;

    // Pre-computed per-particle stream x positions (populated on STREAM entry)
    const streamTargets = new Float32Array(PARTICLE_COUNT * 3);

    // ── Load logos ───────────────────────────────────────────────────────
    Promise.all([
      sampleLogo("/logo_empresa.png", PARTICLE_COUNT),
      sampleLogo("/logo.png",         PARTICLE_COUNT),
    ]).then(([nian, ais]) => {
      nianT = nian;
      aisT  = ais;
      // Point targets at NIAN logo, color = cool white (brand silver)
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        targets[i3]     = nian[i3];
        targets[i3 + 1] = nian[i3 + 1];
        targets[i3 + 2] = nian[i3 + 2];
        targetColors[i3]     = 0.82;
        targetColors[i3 + 1] = 0.90;
        targetColors[i3 + 2] = 1.00;  // cool white / silver-blue
      }
      goTo("NIAN_ASSEMBLE");
    });

    // ── Click ─────────────────────────────────────────────────────────────
    const onClick = () => {
      if (st.ph !== "IDLE") return;
      goTo("DISPERSING");
      if (textRef.current) textRef.current.style.opacity = "0";
      setTimeout(() => onStartRef.current(), 1200);
    };
    mount.addEventListener("click", onClick);
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── RAF — structure identical to particle_system.html animate() ──────
    let prev = performance.now(), rafId = 0, rotY = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt  = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const t = now / 1000;
      const e = elapsed();

      const pos = geometry.attributes.position.array as Float32Array;
      const col = geometry.attributes.color.array    as Float32Array;

      // ── Phase-level transitions ────────────────────────────────────────
      if (st.ph === "NIAN_ASSEMBLE" && nianT) {
        // Check settlement
        let maxD = 0;
        for (let i = 0; i < PARTICLE_COUNT; i += 60) {
          const i3 = i * 3;
          maxD = Math.max(maxD, Math.abs(pos[i3] - nianT[i3]) + Math.abs(pos[i3 + 1] - nianT[i3 + 1]));
        }
        if (maxD < 0.12 || e > 4.0) goTo("NIAN_HOLD");
      }
      else if (st.ph === "NIAN_HOLD" && e > 1.4) {
        // Build stream targets: horizontal right-sweep band
        // twk[i] controls x position: leftmost particles travel least, rightmost cross screen
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3  = i * 3;
          const t_i = twk[i];
          streamTargets[i3]     = lerp(-1.5, 9.5, t_i);
          streamTargets[i3 + 1] = (twk2[i] - 0.5) * 1.6;
          streamTargets[i3 + 2] = (twk[i]  - 0.5) * 0.3;
          // Color gradient: left = warm gold, right = electric cyan
          targetColors[i3]     = lerp(1.0, 0.18, t_i);
          targetColors[i3 + 1] = lerp(0.72, 0.88, t_i);
          targetColors[i3 + 2] = lerp(0.22, 1.00, t_i);
        }
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          targets[i3]     = streamTargets[i3];
          targets[i3 + 1] = streamTargets[i3 + 1];
          targets[i3 + 2] = streamTargets[i3 + 2];
        }
        goTo("STREAM");
      }
      else if (st.ph === "STREAM" && e > 1.4) {
        // Converge to AIS logo
        if (aisT) {
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            targets[i3]     = aisT[i3];
            targets[i3 + 1] = aisT[i3 + 1];
            targets[i3 + 2] = aisT[i3 + 2];
            // AIS system cyan
            targetColors[i3]     = 0.13;
            targetColors[i3 + 1] = 0.77;
            targetColors[i3 + 2] = 0.88;
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
        if (maxD < 0.12 || e > 3.5) {
          goTo("IDLE");
          if (textRef.current) {
            textRef.current.style.transition = "opacity 1.4s ease";
            textRef.current.style.opacity    = "1";
          }
        }
      }

      // ── DISPERSING (opacity fade on canvas element) ────────────────────
      if (st.ph === "DISPERSING") {
        renderer.domElement.style.opacity = String(clamp(1 - e / 1.2, 0, 1));
      }

      // ── Main particle loop — identical to particle_system.html ─────────
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3   = i * 3;
        const twki = twk[i];

        let tx = targets[i3];
        let ty = targets[i3 + 1];
        let tz = targets[i3 + 2];
        let tr = targetColors[i3];
        let tg = targetColors[i3 + 1];
        let tb = targetColors[i3 + 2];

        // ── Phase-specific target overrides ──────────────────────────────

        if (st.ph === "NIAN_HOLD" && nianT) {
          // Breathing oscillation around NIAN shape
          tx = nianT[i3]     + Math.sin(t * (0.7 + twki * 0.5) + twki * TAU) * 0.013;
          ty = nianT[i3 + 1] + Math.cos(t * (0.7 + twki * 0.5) + twki * TAU) * 0.013;
          tz = nianT[i3 + 2];
          // Gold sparkle flashes
          if (Math.random() < 0.0025) { tr = 1.0; tg = 0.86; tb = 0.28; }
        }

        else if (st.ph === "IDLE" && aisT) {
          // Individual oscillation — each particle its own frequency
          const freq = 0.55 + twki * 0.85;
          const amp  = 0.008 + twki * 0.007;
          tx = aisT[i3]     + Math.sin(t * freq + twki * TAU) * amp;
          ty = aisT[i3 + 1] + Math.cos(t * freq + twki * TAU) * amp;
          tz = aisT[i3 + 2];
          // Micro-orbiting particles (3%)
          if (twki > 0.97) {
            tx = aisT[i3]     + Math.cos(t * 1.15 + twki * 9) * 0.030;
            ty = aisT[i3 + 1] + Math.sin(t * 1.15 + twki * 9) * 0.030;
          }
          // Sparkle flashes (white + gold)
          if (Math.random() < 0.0022) {
            const gold = Math.random() < 0.45;
            tr = 1.0; tg = gold ? 0.82 : 1.0; tb = gold ? 0.18 : 1.0;
          }
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

        // ── Standard physics — identical to particle_system.html ─────────
        // velocities decay by friction, then applied as impulse
        velocities[i3]     *= FRICTION;
        velocities[i3 + 1] *= FRICTION;
        velocities[i3 + 2] *= FRICTION;
        pos[i3]     += (tx - pos[i3])     * LERP_SPEED + velocities[i3]     * dt;
        pos[i3 + 1] += (ty - pos[i3 + 1]) * LERP_SPEED + velocities[i3 + 1] * dt;
        pos[i3 + 2] += (tz - pos[i3 + 2]) * LERP_SPEED + velocities[i3 + 2] * dt;

        // ── Standard color lerp — identical to particle_system.html ──────
        col[i3]     += (tr - col[i3])     * LERP_SPEED;
        col[i3 + 1] += (tg - col[i3 + 1]) * LERP_SPEED;
        col[i3 + 2] += (tb - col[i3 + 2]) * LERP_SPEED;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate    = true;

      // Rotation — gentle auto-rotate matching particle_system.html autoRotate
      const rSpeed = st.ph === "STREAM"      ? 0.010
                   : st.ph === "IDLE"        ? 0.0020
                   : st.ph === "DISPERSING"  ? 0.012
                   : 0.0038;
      rotY += rSpeed;
      points.rotation.y = rotY;

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      mount.removeEventListener("click", onClick);
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
    >
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
