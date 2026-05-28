"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

// Minecraft End-style: deep void, purple nebula wisps, dense bright stars with cross-flares

export default function Starfield() {
  const starsRef  = useRef<THREE.Points>(null);
  const starMat   = useRef<THREE.ShaderMaterial>(null);
  const nebulaMat = useRef<THREE.ShaderMaterial>(null);

  const starGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 7200;
    const pos    = new Float32Array(N * 3);
    const sizes  = new Float32Array(N);
    const colors = new Float32Array(N * 3);
    const phases = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const r     = 200 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(THREE.MathUtils.randFloatSpread(2));
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.cos(phi);
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);

      // Tiers: 2.5% sparkle (4-5), 7% bright (2.2-2.8), 22% medium (1.3-1.7), 68.5% tiny
      const rng = Math.random();
      sizes[i] = rng < 0.025 ? 4.0 + Math.random() * 1.0
               : rng < 0.095 ? 2.2 + Math.random() * 0.6
               : rng < 0.315 ? 1.3 + Math.random() * 0.4
               : 0.55 + Math.random() * 0.4;

      // End-style palette: blue-white, cold blue, purple, pure white, deep violet
      const cr = Math.random();
      if (cr < 0.42) {
        colors[i*3] = 0.83; colors[i*3+1] = 0.89; colors[i*3+2] = 1.00;
      } else if (cr < 0.62) {
        colors[i*3] = 0.52; colors[i*3+1] = 0.68; colors[i*3+2] = 1.00;
      } else if (cr < 0.80) {
        colors[i*3] = 0.72; colors[i*3+1] = 0.38; colors[i*3+2] = 1.00;
      } else if (cr < 0.92) {
        colors[i*3] = 1.00; colors[i*3+1] = 1.00; colors[i*3+2] = 1.00;
      } else {
        colors[i*3] = 0.52; colors[i*3+1] = 0.26; colors[i*3+2] = 0.88;
      }

      phases[i] = Math.random() * Math.PI * 2;
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize",    new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aPhase",   new THREE.BufferAttribute(phases, 1));
    return g;
  }, []);

  const starMaterial = useMemo(() =>
    new THREE.ShaderMaterial({
      vertexColors: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        varying vec3 vColor;
        varying float vPhase;
        varying float vSize;
        void main() {
          vColor = color;
          vPhase = aPhase;
          vSize  = aSize;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (440.0 / -mvPos.z);
          gl_Position  = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec3  vColor;
        varying float vPhase;
        varying float vSize;
        uniform float uTime;
        void main() {
          vec2  p    = gl_PointCoord * 2.0 - 1.0;
          float d    = length(p);
          float core = smoothstep(0.22, 0.0, d);
          float halo = smoothstep(1.0, 0.0, d) * 0.32;

          // Cross-flare for sparkle-tier stars
          float sparkle = 0.0;
          if (vSize > 3.5) {
            float arm = max(
              smoothstep(0.055, 0.0, abs(p.x)) * smoothstep(0.85, 0.06, abs(p.y)),
              smoothstep(0.055, 0.0, abs(p.y)) * smoothstep(0.85, 0.06, abs(p.x))
            );
            sparkle = arm * 0.65;
          }

          float freq    = mix(2.5, 0.55, clamp(vSize / 4.5, 0.0, 1.0));
          float twinkle = 0.75 + 0.25 * sin(uTime * freq + vPhase);
          float a = (core + halo + sparkle) * twinkle;
          if (a < 0.008) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }), []);

  const nebulaMaterial = useMemo(() =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      transparent: false,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec3 vPos;
        void main() {
          vPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec3 vPos;
        uniform float uTime;

        float h(vec3 p) {
          p = fract(p * vec3(443.8975, 441.423, 437.195));
          p += dot(p, p.yxz + 19.19);
          return fract((p.x + p.y) * p.z);
        }
        float vn(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(h(i),h(i+vec3(1,0,0)),f.x), mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x), f.y),
            mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x), mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x), f.y), f.z);
        }
        float fbm(vec3 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * vn(p);
            p = p * 2.1 + vec3(5.678, 2.345, 8.901);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 d = normalize(vPos);
          float t = uTime * 0.008;
          float n1 = fbm(d * 2.4 + vec3(t, 0.0, t * 0.4));
          float n2 = fbm(d * 4.8 + vec3(1.8, t * 0.6, 3.1));
          float n3 = fbm(d * 8.0 + vec3(t * 0.3, 4.5, t * 0.7));

          // Near-black void base
          vec3 col = vec3(0.0018, 0.0008, 0.0058);

          // Purple nebula clouds
          float c1 = smoothstep(0.40, 0.64, n1) * smoothstep(0.36, 0.60, n2);
          col += vec3(0.024, 0.004, 0.078) * c1;

          // Blue-indigo wisps
          float c2 = smoothstep(0.44, 0.66, n2 * 0.55 + n3 * 0.45);
          col += vec3(0.006, 0.012, 0.058) * c2;

          // Faint magenta fringe
          float c3 = smoothstep(0.42, 0.60, n3) * smoothstep(0.40, 0.58, n1) * 0.5;
          col += vec3(0.030, 0.002, 0.040) * c3;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }), []);

  useFrame((_, dt) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += dt * 0.00065;
      starsRef.current.rotation.x += dt * 0.00022;
    }
    if (starMat.current)   starMat.current.uniforms.uTime.value += dt;
    if (nebulaMat.current) nebulaMat.current.uniforms.uTime.value += dt;
  });

  return (
    <>
      {/* Nebula void background sphere */}
      <mesh renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[900, 48, 48]} />
        <primitive ref={nebulaMat} object={nebulaMaterial} attach="material" />
      </mesh>

      {/* Star field */}
      <points ref={starsRef} geometry={starGeometry} frustumCulled={false} renderOrder={-9}>
        <primitive ref={starMat} object={starMaterial} attach="material" />
      </points>
    </>
  );
}
