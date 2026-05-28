"use client";

import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { latLonToUnitVec3 } from "@/lib/geo";

const IMPACT_DIR = latLonToUnitVec3(26.77, 53.44).normalize();

type Props = {
  reveal: number;
  exposure: number;
  sunDirection: THREE.Vector3;
  textureSet: "solarsystemscope";
  impactAge: number; // seconds since missile impact, -1 = none
  conflictGlow: number; // 0→1, rises during CONFLICT_LOCK
};

export default function EarthTextured({ reveal, exposure, sunDirection, textureSet, impactAge, conflictGlow }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const paths = useMemo(() => {
    // For now we support the files you already dropped in `public/textures/earth/`.
    // Keep this non-null for type-safety.
    if (textureSet === "solarsystemscope") {
      return {
        day: "/textures/earth/Solarsystemscope_texture_8k_earth_daymap (1).jpg",
        night: "/textures/earth/Solarsystemscope_texture_8k_earth_nightmap.jpg",
        clouds: "/textures/earth/Solarsystemscope_texture_8k_earth_clouds.jpg",
        bump: "/textures/earth/earthbump1k.jpg",
        spec: "/textures/earth/earthspec1k.jpg"
      };
    }
    return {
      day: "/textures/earth/Solarsystemscope_texture_8k_earth_daymap (1).jpg",
      night: "/textures/earth/Solarsystemscope_texture_8k_earth_nightmap.jpg",
      clouds: "/textures/earth/Solarsystemscope_texture_8k_earth_clouds.jpg",
      bump: "/textures/earth/earthbump1k.jpg",
      spec: "/textures/earth/earthspec1k.jpg"
    };
  }, [textureSet]);

  const [dayMap, nightMap, cloudsMap, bumpMap, specMap] = useTexture([
    paths.day,
    paths.night,
    paths.clouds,
    paths.bump,
    paths.spec
  ]);

  useMemo(() => {
    // Color spaces
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    bumpMap.colorSpace = THREE.NoColorSpace;
    specMap.colorSpace = THREE.NoColorSpace;

    for (const t of [dayMap, nightMap, cloudsMap, bumpMap, specMap]) {
      t.anisotropy = 8;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
    }
  }, [dayMap, nightMap, cloudsMap, bumpMap, specMap]);

  const material = useMemo(() => {
    const uniforms = {
      uDay:       { value: dayMap },
      uNight:     { value: nightMap },
      uClouds:    { value: cloudsMap },
      uBump:      { value: bumpMap },
      uSpec:      { value: specMap },
      uSunDir:    { value: sunDirection.clone().normalize() },
      uReveal:    { value: reveal },
      uExposure:  { value: exposure },
      uTime:      { value: 0 },
      uImpactDir:    { value: IMPACT_DIR.clone() },
      uImpactAge:    { value: -1.0 },
      uConflictGlow: { value: 0.0 },
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vPosW = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        varying vec2 vUv;
        uniform sampler2D uDay;
        uniform sampler2D uNight;
        uniform sampler2D uClouds;
        uniform sampler2D uBump;
        uniform sampler2D uSpec;
        uniform vec3  uSunDir;
        uniform float uReveal;
        uniform float uExposure;
        uniform float uTime;
        uniform vec3  uImpactDir;
        uniform float uImpactAge;
        uniform float uConflictGlow;

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

        // Cheap normal perturbation from bump map (height -> pseudo normal)
        vec3 perturbNormal(vec3 n, vec2 uv) {
          float h = texture2D(uBump, uv).r;
          float hx = texture2D(uBump, uv + vec2(0.0015, 0.0)).r;
          float hy = texture2D(uBump, uv + vec2(0.0, 0.0015)).r;
          vec3 grad = vec3((hx - h), (hy - h), 1.0);
          grad.xy *= 12.0;
          vec3 p = normalize(grad);
          // approximate tangent->world by mixing with world normal (stable, cheap)
          return normalize(mix(n, p, 0.28));
        }

        void main() {
          vec3 n = normalize(vNormalW);
          vec3 sun = normalize(uSunDir);

          // Terminator (soft): controls day/night blend.
          float ndl = dot(n, sun);
          float term = smoothstep(-0.06, 0.28, ndl);

          // Textures
          vec3 day = texture2D(uDay, vUv).rgb;
          vec3 night = texture2D(uNight, vUv).rgb;

          // Night lights only on shadow side; keep restrained.
          float nightMask = smoothstep(0.12, -0.25, ndl);
          vec3 nightCol = night * nightMask * 0.85;

          // Bump/spec cues
          vec3 nb = perturbNormal(n, vUv);
          vec3 v = normalize(cameraPosition - vPosW);
          vec3 h = normalize(v + sun);

          float specMask = texture2D(uSpec, vUv).r; // oceans brighter
          float spec = pow(max(dot(nb, h), 0.0), 90.0) * (0.06 + 0.18 * specMask) * term;

          // Forward-scatter rim cue (atmosphere hint on day side)
          float rim = pow(1.0 - max(dot(n, v), 0.0), 2.8);
          vec3 rimCol = vec3(0.10, 0.42, 0.62) * rim * (0.10 + 0.24 * term);

          // Clouds: derive alpha from luminance; animate slowly.
          vec2 cuv = vUv;
          cuv.x += uTime * 0.004;
          float cLum = dot(texture2D(uClouds, cuv).rgb, vec3(0.299, 0.587, 0.114));
          float cA = smoothstep(0.52, 0.86, cLum) * 0.18 * uReveal;
          vec3 cCol = vec3(0.85, 0.90, 0.96) * (0.45 + 0.55 * term);

          vec3 base = day * (0.30 + 1.15 * term);
          vec3 col = base + nightCol + spec + rimCol;
          col = mix(col, cCol, cA);
          col *= uExposure;
          applyBlast(col, n);

          // Conflict zone glow: Iran (red-orange) and Israel (cool blue)
          if (uConflictGlow > 0.0) {
            const vec3 IRAN_DIR   = vec3(0.6773, 0.5299, 0.5104);
            const vec3 ISRAEL_DIR = vec3(0.4890, 0.5225, 0.6987);
            float dIran   = max(0.0, 1.0 - length(n - IRAN_DIR)   / 0.32);
            float dIsrael = max(0.0, 1.0 - length(n - ISRAEL_DIR) / 0.22);
            col += vec3(0.90, 0.28, 0.08) * pow(dIran,   2.2) * uConflictGlow * 0.40;
            col += vec3(0.28, 0.48, 0.88) * pow(dIsrael, 2.2) * uConflictGlow * 0.34;
          }

          float alpha = clamp(0.04 + uReveal * 0.96, 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: true
    });
  }, [dayMap, nightMap, cloudsMap, bumpMap, specMap, sunDirection, reveal, exposure]);

  // Update per-frame uniforms directly (avoids material reconstruction).
  material.uniforms.uReveal.value        = reveal;
  material.uniforms.uExposure.value      = exposure;
  material.uniforms.uImpactAge.value     = impactAge;
  material.uniforms.uConflictGlow.value  = conflictGlow;

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });

  return (
    <mesh>
      <sphereGeometry args={[1, 192, 192]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  );
}
