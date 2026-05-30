"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useExperienceStore } from "@/state/experienceStore";
import { latLonToUnitVec3 } from "@/lib/geo";

const HORMUZ_DIR = latLonToUnitVec3(26.77, 53.44).normalize();
const SUN_DIR    = new THREE.Vector3(1, 0.15, 0.35).normalize();

export default function AtmosphereShell() {
  const matRef      = useRef<THREE.ShaderMaterial>(null);
  const cinematicT  = useExperienceStore((s) => s.cinematicT);
  const mode        = useExperienceStore((s) => s.mode);
  const missileT    = useExperienceStore((s) => s.missileT);

  const impactFlash  = useRef(0);
  const atmShockwave = useRef(0);   // 0→1 expanding ring in atmosphere
  const prevMissileT = useRef(0);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uAlpha:       { value: 0.0 },
        uImpactFlash: { value: 0.0 },
        uShockwave:   { value: 0.0 },
        uImpactDir:   { value: HORMUZ_DIR },
        uSunDir:      { value: SUN_DIR },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
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
        uniform float uAlpha;
        uniform float uImpactFlash;
        uniform float uShockwave;
        uniform vec3  uImpactDir;
        uniform vec3  uSunDir;

        void main() {
          vec3 n = normalize(vNormalW);
          vec3 v = normalize(cameraPosition - vPosW);
          float view = 1.0 - max(dot(n, v), 0.0);
          float fres  = pow(view, 2.8);
          float high  = pow(view, 5.5);

          // Rayleigh: sun-aware coloring of the limb
          float dayFactor = smoothstep(-0.15, 0.35, dot(n, uSunDir));
          // Terminator blend (0 = full day, 1 = approaching night)
          float termFactor = smoothstep(0.15, 0.55, 1.0 - dayFactor);

          vec3 dayAtm    = mix(vec3(0.12, 0.42, 0.62), vec3(0.22, 0.62, 0.82), high);
          vec3 termAtm   = mix(vec3(0.70, 0.30, 0.08), vec3(0.85, 0.50, 0.15), high);
          vec3 nightAtm  = vec3(0.04, 0.10, 0.18) * fres * 0.35;
          vec3 baseGlow  = mix(
            mix(dayAtm, termAtm, termFactor * 0.7),
            nightAtm,
            smoothstep(0.35, 0.75, 1.0 - dayFactor)
          );

          // Impact fire tint near Hormuz
          float proximity  = max(dot(n, normalize(uImpactDir)), 0.0);
          float impactZone = pow(proximity, 4.0);
          vec3  fireGlow   = vec3(1.0, 0.28, 0.06);
          vec3  glow = mix(baseGlow, fireGlow, impactZone * uImpactFlash * 0.85);

          // Atmospheric shockwave ring
          if (uShockwave > 0.0) {
            float r_atm  = uShockwave * 0.55;
            float proxAng = acos(clamp(proximity, 0.0, 1.0));
            float impactAng = acos(clamp(dot(n, normalize(uImpactDir)), 0.0, 1.0));
            float dist    = abs(impactAng - r_atm);
            float ring    = smoothstep(0.055, 0.0, dist);
            glow += vec3(1.6, 0.55, 0.12) * ring * (1.0 - uShockwave) * 1.8;
          }

          float alpha = fres * (0.55 + 0.40 * dayFactor) * uAlpha;
          alpha += impactZone * uImpactFlash * 0.45;

          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((_, dt) => {
    if (!matRef.current) return;

    if (missileT >= 0.95 && prevMissileT.current < 0.95) {
      impactFlash.current  = 1.0;
      atmShockwave.current = 0.0;
    }
    prevMissileT.current = missileT;

    if (impactFlash.current > 0) {
      impactFlash.current = Math.max(0, impactFlash.current - dt * 0.38);
    }
    // Shockwave expands 0→1 over ~2s then disappears
    if (impactFlash.current > 0 || atmShockwave.current > 0) {
      atmShockwave.current = Math.min(1.0, atmShockwave.current + dt * 0.5);
    }

    matRef.current.uniforms.uImpactFlash.value = impactFlash.current;
    matRef.current.uniforms.uShockwave.value   = atmShockwave.current;

    const hidden = mode === "BOOT" || mode === "TYPOGRAPHY";
    const target = hidden ? 0.0 : ss(0.25, 0.42, cinematicT);
    const alphaLerp = 1 - Math.pow(0.004, dt); // frame-rate independent
    matRef.current.uniforms.uAlpha.value = THREE.MathUtils.lerp(
      matRef.current.uniforms.uAlpha.value,
      target,
      alphaLerp,
    );
  });

  return (
    <mesh>
      <sphereGeometry args={[1.04, 96, 96]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  );
}

function ss(e0: number, e1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
