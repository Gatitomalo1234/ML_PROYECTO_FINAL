"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import AtmosphereShell from "@/components/scene/earth/AtmosphereShell";
import { useExperienceStore } from "@/state/experienceStore";
import EarthTextured from "@/components/scene/earth/EarthTextured";
import { latLonToUnitVec3 } from "@/lib/geo";

// World-space direction to the Hormuz impact point (geo.ts convention, Earth at -π/2)
const IMPACT_DIR = latLonToUnitVec3(26.77, 53.44).normalize();

export default function EarthSystem() {
  const group = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const cloudsMat = useRef<THREE.ShaderMaterial>(null);

  const sunDirection = useMemo(() => new THREE.Vector3(1, 0.15, 0.35).normalize(), []);
  const mode        = useExperienceStore((s) => s.mode);
  const cinematicT  = useExperienceStore((s) => s.cinematicT);
  const missileT    = useExperienceStore((s) => s.missileT);
  // Textures are always present in /public/textures/earth/ — no runtime check needed.
  const useTextures = true;

  // Impact tracking
  const impactAge    = useRef(-1.0);
  const prevMissileT = useRef(0.0);

  // Cached target rotation for Gulf-facing lock — computed once on CONFLICT_LOCK entry.
  const gulfTarget = useRef<number | null>(null);

  useEffect(() => {
    // THREE.SphereGeometry places the texture prime meridian at +X, but geo.ts places
    // lon=0 at +Z — a 90° offset. Starting at -π/2 corrects this so geographic
    // coordinates computed in geo.ts land on the correct texture position.
    if (group.current) group.current.rotation.y = -Math.PI / 2;
  }, []);

  const earthShader = useMemo(() => {
    const uniforms = {
      uTime:      { value: 0 },
      uSunDir:    { value: sunDirection },
      uExposure:  { value: 1.0 },
      uImpactDir: { value: IMPACT_DIR.clone() },
      uImpactAge: { value: -1.0 },
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        varying vec2 vUv;
        void main() {
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vPosW = worldPos.xyz;
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        varying vec2 vUv;
        uniform vec3  uSunDir;
        uniform float uTime;
        uniform float uExposure;
        uniform vec3  uImpactDir;
        uniform float uImpactAge;

        void applyBlast(inout vec3 col, vec3 n) {
          if (uImpactAge < 0.0) return;
          float d = length(n - uImpactDir);
          col += vec3(3.2, 2.1, 1.0)
               * max(0.0, 1.0 - uImpactAge * 1.55)
               * smoothstep(0.28, 0.0, d);
          if (uImpactAge > 0.05) {
            float t = uImpactAge - 0.05;
            float r = min(t * 0.20, 0.58);
            float w = 0.018 + r * 0.09;
            col += vec3(2.4, 0.72, 0.12)
                 * smoothstep(w, 0.0, abs(d - r))
                 * max(0.0, 1.0 - t / 3.5);
          }
          if (uImpactAge > 0.22) {
            float t = uImpactAge - 0.22;
            float r = min(t * 0.25, 0.52);
            float w = 0.013 + r * 0.07;
            col += vec3(1.5, 0.35, 0.04)
                 * smoothstep(w, 0.0, abs(d - r))
                 * max(0.0, 1.0 - t / 2.8) * 0.55;
          }
          // Seismic wave: slow, wide, low-intensity ripple spreading across the globe
          if (uImpactAge > 0.8) {
            float t = uImpactAge - 0.8;
            float r = min(t * 0.12, 1.4);
            float w = 0.025 + r * 0.12;
            col += vec3(0.8, 0.20, 0.04)
                 * smoothstep(w, 0.0, abs(d - r))
                 * max(0.0, 1.0 - t / 5.0) * 0.22;
          }
          float fi = min(uImpactAge * 4.0, 1.0);
          float fo = max(0.0, 1.0 - uImpactAge * 0.05);
          col += vec3(1.8, 0.32, 0.04)
               * smoothstep(0.040, 0.0, d) * fi * fo
               * (0.7 + 0.3 * sin(uImpactAge * 5.5));
        }

        float hash(vec2 p){
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.5;
          mat2 m = mat2(1.6, -1.2, 1.2, 1.6);
          for(int i=0;i<5;i++){
            v += a * noise(p);
            p = m * p;
            a *= 0.5;
          }
          return v;
        }

        vec3 paletteDay(vec3 n){
          float lat = n.y * 0.5 + 0.5;
          float ocean = smoothstep(0.36, 0.62, fbm(n.xz * 4.2 + lat * 1.8));
          vec3 deepOcean = vec3(0.02, 0.07, 0.12);
          vec3 shallow = vec3(0.04, 0.16, 0.20);
          vec3 land = vec3(0.20, 0.22, 0.16);
          vec3 desert = vec3(0.34, 0.30, 0.18);
          float desertMask = smoothstep(0.46, 0.76, fbm(n.zx * 2.6 + 7.0));
          vec3 landCol = mix(land, desert, desertMask);
          float continent = smoothstep(0.54, 0.84, fbm(n.xy * 2.9));
          vec3 base = mix(mix(deepOcean, shallow, ocean), landCol, continent);
          // Ice caps hint:
          float ice = smoothstep(0.72, 0.95, abs(n.y));
          base = mix(base, vec3(0.62, 0.68, 0.72), ice * 0.85);
          return base;
        }

        void main() {
          vec3 n = normalize(vNormalW);
          vec3 sun = normalize(uSunDir);
          float ndl = max(dot(n, sun), 0.0);
          float terminator = smoothstep(0.10, 0.52, ndl);

          // Day base (procedural placeholder; replace with textures later).
          vec3 dayCol = paletteDay(n);
          dayCol *= (0.30 + 1.25 * terminator);

          // Subtle normal perturbation for "terrain" relief cue (cheap).
          float relief = fbm(vUv * vec2(14.0, 7.0) + uTime * 0.002);
          dayCol += (relief - 0.5) * 0.04;

          // Night lights: sparse, latitude-weighted, very restrained.
          float city = pow(fbm(n.xz * 22.0 + uTime * 0.006), 12.0) * smoothstep(0.10, 0.55, 1.0 - ndl);
          float cityLat = smoothstep(-0.15, 0.45, n.y);
          vec3 nightCol = vec3(0.86, 0.78, 0.55) * city * cityLat * 0.9;

          // Subtle specular cue.
          vec3 v = normalize(cameraPosition - vPosW);
          vec3 h = normalize(v + normalize(uSunDir));
          float spec = pow(max(dot(n, h), 0.0), 72.0) * 0.16 * terminator;

          // Rim (atmospheric forward scattering hint on day side).
          float rim = pow(1.0 - max(dot(n, v), 0.0), 2.6);
          vec3 rimCol = vec3(0.10, 0.42, 0.62) * rim * (0.12 + 0.28 * terminator);

          vec3 col = dayCol + nightCol + spec + rimCol;
          col *= uExposure;
          applyBlast(col, n);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      transparent: false
    });
  }, [sunDirection]);

  const cloudsShader = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: sunDirection },
      uAlpha: { value: 0.0 }
    };
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec2 vUv;
        void main() {
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vNormalW;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform float uAlpha;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i=floor(p), f=fract(p);
          float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
          vec2 u=f*f*(3.0-2.0*f);
          return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
        }
        float fbm(vec2 p){
          float v=0.0,a=0.55;
          mat2 m=mat2(1.6,-1.2,1.2,1.6);
          for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; }
          return v;
        }

        void main() {
          vec3 n = normalize(vNormalW);
          float ndl = max(dot(n, normalize(uSunDir)), 0.0);
          vec2 uv = vUv * vec2(2.0, 1.0);
          uv.x += uTime * 0.008;
          uv.y += uTime * 0.003;

          float c = fbm(uv * 3.6);
          float alpha = smoothstep(0.58, 0.86, c) * 0.18 * uAlpha;
          // Clouds catch sun; night side is nearly invisible.
          vec3 col = mix(vec3(0.10,0.16,0.20), vec3(0.85,0.90,0.95), ndl);
          col *= 0.55 + ndl * 0.55;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
  }, [sunDirection]);

  useFrame((_, dt) => {
    if (!group.current) return;

    // Start locking to Gulf as soon as we begin the dive — so Hormuz is visible during FLY_TO_CONFLICT
    const lockMode = mode === "FLY_TO_CONFLICT" || mode === "CONFLICT_LOCK" || mode === "COMMAND_CENTER";

    if (lockMode) {
      if (gulfTarget.current === null) {
        const TARGET = -Math.PI / 2;
        const PI2 = Math.PI * 2;
        const cur = group.current.rotation.y;
        const diff = (((cur - TARGET) % PI2) + PI2) % PI2;
        gulfTarget.current = diff <= Math.PI ? cur - diff : cur + (PI2 - diff);
      }
      // During FLY_TO_CONFLICT rotate faster (0.00015), slow settle in CONFLICT_LOCK (0.0003)
      const decay = mode === "FLY_TO_CONFLICT" ? 0.00015 : 0.0003;
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        gulfTarget.current,
        1 - Math.pow(decay, dt),
      );
      if (clouds.current) clouds.current.rotation.y += dt * 0.006;
    } else {
      gulfTarget.current = null;
      group.current.rotation.y += dt * 0.035;
      if (clouds.current) clouds.current.rotation.y += dt * 0.02;
    }

    if (material.current) material.current.uniforms.uTime.value += dt;
    if (cloudsMat.current) cloudsMat.current.uniforms.uTime.value += dt;

    // Impact blast tracking
    if (missileT >= 0.95 && prevMissileT.current < 0.95) impactAge.current = 0.0;
    prevMissileT.current = missileT;
    if (impactAge.current >= 0) {
      impactAge.current += dt;
      if (material.current) material.current.uniforms.uImpactAge.value = impactAge.current;
    }

    // Exposure shift is very subtle; cinematic beats should not feel like "auto exposure".
    if (material.current) {
      const reveal = smoothstep(0.22, 0.40, cinematicT); // Earth emerges during EARTH_REVEAL
      const activation = smoothstep(0.40, 0.62, cinematicT); // airspace activation
      const targeting = smoothstep(0.82, 0.98, cinematicT); // Hormuz focus

      const boot = 1.0;
      const preRevealDark = (mode === "BOOT" || mode === "TYPOGRAPHY") ? 0.0 : 1.0;

      // Exposure ramps from near-black to full, then slightly deepens for targeting drama.
      const base = THREE.MathUtils.lerp(0.18, 1.02, reveal);
      const deepen = 1.0 - targeting * 0.07;
      const energize = 1.0 + activation * 0.03;
      material.current.uniforms.uExposure.value = boot * preRevealDark * base * deepen * energize;
    }

    // Clouds should be nearly invisible until reveal (avoid floating haze in darkness).
    if (cloudsMat.current) {
      const reveal = smoothstep(0.22, 0.44, cinematicT);
      cloudsMat.current.uniforms.uAlpha.value = reveal;
    }
  });

  const reveal = smoothstep(0.22, 0.40, cinematicT);
  const conflictGlow = THREE.MathUtils.clamp((cinematicT - 0.84) / 0.09, 0, 1);
  const exposure = (() => {
    const preRevealDark = (mode === "BOOT" || mode === "TYPOGRAPHY") ? 0.0 : 1.0;
    const base = THREE.MathUtils.lerp(0.18, 1.02, reveal);
    const targeting = smoothstep(0.82, 0.98, cinematicT);
    const deepen = 1.0 - targeting * 0.07;
    return preRevealDark * base * deepen;
  })();

  return (
    <group ref={group}>
      {useTextures ? (
        <EarthTextured reveal={reveal} exposure={exposure} sunDirection={sunDirection} textureSet="solarsystemscope" impactAge={impactAge.current} conflictGlow={conflictGlow} />
      ) : (
        <mesh>
          <sphereGeometry args={[1, 128, 128]} />
          <primitive ref={material} object={earthShader} attach="material" />
        </mesh>
      )}
      {!useTextures ? (
        <mesh ref={clouds}>
          <sphereGeometry args={[1.008, 96, 96]} />
          <primitive ref={cloudsMat} object={cloudsShader} attach="material" />
        </mesh>
      ) : null}
      <AtmosphereShell />
    </group>
  );
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
