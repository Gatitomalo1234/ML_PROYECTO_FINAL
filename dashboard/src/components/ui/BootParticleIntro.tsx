"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const N = 14000;
const LERP_SPEED = 0.04;

function createGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const cvs = document.createElement("canvas");
  cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,    "rgba(255,255,255,1)");
  grad.addColorStop(0.15, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.25)");
  grad.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cvs);
}

export default function BootParticleIntro({ onStart }: { onStart: () => void }) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const textRef   = useRef<HTMLSpanElement>(null);
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060a0e, 1);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5.5;

    // ── Buffers ───────────────────────────────────────────────────────────────
    const positions  = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 3);
    const targets    = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 14;
      positions[i3 + 1] = (Math.random() - 0.5) * 14;
      positions[i3 + 2] = (Math.random() - 0.5) * 5;
      targets[i3]       = positions[i3];
      targets[i3 + 1]   = positions[i3 + 1];
      targets[i3 + 2]   = positions[i3 + 2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.028,
      map: createGlowTexture(),
      color: new THREE.Color(0x22c5e0),
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      alphaTest: 0.001,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── State machine ─────────────────────────────────────────────────────────
    type Phase = "LOADING" | "ASSEMBLING" | "IDLE" | "DISPERSING";
    const phase = { current: "LOADING" as Phase };
    let assembleStart  = 0;
    let disperseStart  = 0;
    let rotY           = 0;

    // ── Logo sampling ─────────────────────────────────────────────────────────
    const W = 512, H = 512;
    const offCvs = document.createElement("canvas");
    offCvs.width = W; offCvs.height = H;
    const offCtx = offCvs.getContext("2d")!;

    const img = new Image();
    img.src = "/logo.png";
    img.onload = () => {
      offCtx.drawImage(img, 0, 0, W, H);
      const data = offCtx.getImageData(0, 0, W, H).data;

      const pts: [number, number][] = [];
      for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
          const idx = (y * W + x) * 4;
          if (data[idx] > 90) pts.push([x, y]);
        }
      }
      if (pts.length === 0) return;

      const scale = 5.2 / W;
      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const p  = pts[Math.floor(Math.random() * pts.length)];
        targets[i3]     = (p[0] - W / 2) * scale;
        targets[i3 + 1] = -(p[1] - H / 2) * scale;
        targets[i3 + 2] = (Math.random() - 0.5) * 0.05;
      }

      phase.current  = "ASSEMBLING";
      assembleStart  = performance.now();
    };

    // ── Click to disperse ─────────────────────────────────────────────────────
    const handleClick = () => {
      if (phase.current !== "IDLE") return;
      phase.current  = "DISPERSING";
      disperseStart  = performance.now();
      if (textRef.current) textRef.current.style.opacity = "0";
      setTimeout(() => { onStartRef.current(); }, 1200);
    };
    mount.addEventListener("click", handleClick);

    // ── Resize ────────────────────────────────────────────────────────────────
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // ── RAF loop ──────────────────────────────────────────────────────────────
    let prevTime = performance.now();
    let rafId    = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt  = Math.min((now - prevTime) / 1000, 0.05);
      prevTime  = now;
      const t   = now / 1000;

      const pos = geometry.attributes.position.array as Float32Array;

      if (phase.current === "LOADING") {
        // Float gently while logo loads
        for (let i = 0; i < N; i++) {
          const i3 = i * 3;
          pos[i3]     += (targets[i3]     - pos[i3])     * 0.005;
          pos[i3 + 1] += (targets[i3 + 1] - pos[i3 + 1]) * 0.005;
          pos[i3 + 2] += (targets[i3 + 2] - pos[i3 + 2]) * 0.005;
        }
        rotY += 0.004;

      } else if (phase.current === "ASSEMBLING") {
        let settled = true;
        for (let i = 0; i < N; i++) {
          const i3 = i * 3;
          const tx = targets[i3], ty = targets[i3 + 1], tz = targets[i3 + 2];
          velocities[i3]     *= 0.92;
          velocities[i3 + 1] *= 0.92;
          velocities[i3 + 2] *= 0.92;
          pos[i3]     += (tx - pos[i3])     * LERP_SPEED + velocities[i3]     * dt;
          pos[i3 + 1] += (ty - pos[i3 + 1]) * LERP_SPEED + velocities[i3 + 1] * dt;
          pos[i3 + 2] += (tz - pos[i3 + 2]) * LERP_SPEED + velocities[i3 + 2] * dt;
          if (Math.abs(pos[i3] - tx) + Math.abs(pos[i3 + 1] - ty) > 0.15) settled = false;
        }
        if (settled || now - assembleStart > 3200) {
          phase.current = "IDLE";
          if (textRef.current) {
            textRef.current.style.opacity = "1";
            textRef.current.style.transition = "opacity 0.9s ease";
          }
        }
        rotY += 0.003;

      } else if (phase.current === "IDLE") {
        for (let i = 0; i < N; i++) {
          const i3 = i * 3;
          const tx = targets[i3]     + Math.sin(t * 0.7 + i * 0.00042) * 0.009;
          const ty = targets[i3 + 1] + Math.cos(t * 0.7 + i * 0.00042) * 0.009;
          const tz = targets[i3 + 2];
          pos[i3]     += (tx - pos[i3])     * 0.018;
          pos[i3 + 1] += (ty - pos[i3 + 1]) * 0.018;
          pos[i3 + 2] += (tz - pos[i3 + 2]) * 0.018;
        }
        material.size = 0.028 + Math.sin(t * 1.4) * 0.0022;
        rotY += 0.0025;

      } else if (phase.current === "DISPERSING") {
        const progress = (now - disperseStart) / 1200;
        renderer.domElement.style.opacity = String(Math.max(0, 1 - progress));

        for (let i = 0; i < N; i++) {
          const i3 = i * 3;
          const tx = targets[i3], ty = targets[i3 + 1];
          const dist = Math.sqrt(tx * tx + ty * ty) + 0.001;
          velocities[i3]     += (tx / dist) * 0.22;
          velocities[i3 + 1] += (ty / dist) * 0.22 + 0.06;
          velocities[i3]     *= 0.93;
          velocities[i3 + 1] *= 0.93;
          velocities[i3 + 2] *= 0.93;
          pos[i3]     += velocities[i3]     * dt * 55;
          pos[i3 + 1] += velocities[i3 + 1] * dt * 55;
          pos[i3 + 2] += velocities[i3 + 2] * dt * 55;
        }
        rotY += 0.008;
      }

      geometry.attributes.position.needsUpdate = true;
      points.rotation.y = rotY;
      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      mount.removeEventListener("click", handleClick);
      window.removeEventListener("resize", handleResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={mountRef} className="absolute inset-0 z-50 cursor-pointer">
      <span
        ref={textRef}
        style={{
          position: "absolute",
          bottom: "28%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.38em",
          color: "rgba(255,255,255,0.45)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          opacity: "0",
        }}
      >
        CLICK PARA INICIALIZAR
      </span>
    </div>
  );
}
