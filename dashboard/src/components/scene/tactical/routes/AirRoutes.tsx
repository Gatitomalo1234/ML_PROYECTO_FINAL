"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { greatCirclePoints } from "@/lib/geo";
import { useExperienceStore } from "@/state/experienceStore";

type Props = { visible: boolean };

export default function AirRoutes({ visible }: Props) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const cinematicT = useExperienceStore((s) => s.cinematicT);
  const { geometry } = useMemo(() => buildRouteGeometry(), []);

  useFrame((_, dt) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value += dt;
    const activation = smoothstep(0.40, 0.62, cinematicT);
    const orbit = smoothstep(0.62, 0.82, cinematicT);
    const focus = smoothstep(0.82, 0.98, cinematicT);

    material.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(0.0, 0.62, activation) + orbit * 0.18 + focus * 0.22;
    material.current.uniforms.uPulse.value = THREE.MathUtils.lerp(0.0, 1.0, activation) * (0.65 + focus * 0.45);
  });

  if (!visible) return null;

  return (
    <lineSegments frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uOpacity: { value: 0.0 },
          uPulse: { value: 0.0 }
        }}
        vertexShader={/* glsl */ `
          attribute float aPhase;
          attribute float aRoute;
          varying float vPhase;
          varying float vRoute;
          void main() {
            vPhase = aPhase;
            vRoute = aRoute;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          precision highp float;
          uniform float uTime;
          uniform float uOpacity;
          uniform float uPulse;
          varying float vPhase;
          varying float vRoute;

          float pulseHead(float route) {
            // Slightly different speed per-route using a low-cost hash.
            float h = fract(sin(route * 127.1) * 43758.5453);
            float spd = mix(0.16, 0.32, h);
            return fract(uTime * spd + route * 0.6180339);
          }

          void main() {
            float dash = abs(sin((vPhase * 10.0) - uTime * 1.15));
            float baseA = smoothstep(0.28, 0.86, dash) * uOpacity;

            float head = pulseHead(vRoute);
            float d = abs(vPhase - head);
            d = min(d, 1.0 - d); // wrap
            float pulse = smoothstep(0.06, 0.0, d) * uPulse;

            vec3 base = vec3(0.22, 0.62, 0.78);
            vec3 hi = vec3(0.30, 0.82, 0.90);
            vec3 col = mix(base, hi, dash);
            col += pulse * vec3(0.72, 0.60, 0.22);

            float a = baseA + pulse * 0.65;
            gl_FragColor = vec4(col, a);
          }
        `}
      />
    </lineSegments>
  );
}

function buildRouteGeometry() {
  // Strategic hubs (lat, lon). Keep a restrained set to avoid "spaghetti".
  const hubs: Array<[number, number]> = [
    [40.7128, -74.006], // NYC
    [33.9416, -118.4085], // LAX
    [51.5072, -0.1276], // London
    [48.8566, 2.3522], // Paris
    [52.52, 13.405], // Berlin
    [55.7558, 37.6173], // Moscow
    [25.2048, 55.2708], // Dubai
    [24.7136, 46.6753], // Riyadh
    [30.0444, 31.2357], // Cairo
    [28.6139, 77.209], // Delhi
    [35.6895, 139.6917], // Tokyo
    [37.5665, 126.978], // Seoul
    [1.3521, 103.8198], // Singapore
    [-33.8688, 151.2093], // Sydney
    [19.076, 72.8777], // Mumbai
    [41.0082, 28.9784], // Istanbul
    [31.7683, 35.2137], // Jerusalem region
    [29.3759, 47.9774], // Kuwait
    [25.2854, 51.531], // Doha
    [35.6762, 51.3853] // Tehran
  ];

  const pairs: Array<[number, number]> = [];
  const rng = mulberry32(7);
  const pairCount = 64;
  while (pairs.length < pairCount) {
    const a = Math.floor(rng() * hubs.length);
    const b = Math.floor(rng() * hubs.length);
    if (a === b) continue;
    // Avoid super-short local routes to keep it strategic.
    if (Math.abs(hubs[a][0] - hubs[b][0]) + Math.abs(hubs[a][1] - hubs[b][1]) < 35) continue;
    pairs.push([a, b]);
  }

  const segmentsPerRoute = 96;
  const positions: number[] = [];
  const phases: number[] = [];
  const routesAttr: number[] = [];

  for (let r = 0; r < pairs.length; r++) {
    const [ia, ib] = pairs[r];
    const [lat0, lon0] = hubs[ia];
    const [lat1, lon1] = hubs[ib];
    const pts = greatCirclePoints(lat0, lon0, lat1, lon1, segmentsPerRoute);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i].clone().multiplyScalar(1.006);
      const b = pts[i + 1].clone().multiplyScalar(1.006);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const phase = i / (pts.length - 1);
      phases.push(phase, phase);
      const routeId = r / pairs.length;
      routesAttr.push(routeId, routeId);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute("aRoute", new THREE.Float32BufferAttribute(routesAttr, 1));
  return { geometry };
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
