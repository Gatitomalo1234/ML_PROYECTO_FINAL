"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/state/experienceStore";
import { greatCirclePoints } from "@/lib/geo";

// Great circle path: NATO/Mediterranean → Strait of Hormuz
const ORIGIN_LAT =  38.0;
const ORIGIN_LON =  15.0;  // Sicily / central Mediterranean
const DEST_LAT   =  26.77;
const DEST_LON   =  53.44; // Strait of Hormuz entrance

const SURFACE_R   = 1.015; // slightly above Earth surface (radius = 1.0)
const TRAIL_MAX   = 48;    // max trail points kept in buffer

export default function TacticalAircraft({ visible }: { visible: boolean }) {
  const planeRef = useRef<THREE.Mesh>(null);
  const echoRef  = useRef<THREE.Mesh>(null);
  const ringRef  = useRef<THREE.Mesh>(null);
  const lineRef  = useRef<THREE.Line>(null);

  const cinematicT = useExperienceStore((s) => s.cinematicT);
  const elapsed    = useRef(0);

  // Pre-compute full great circle path (one-time, no GC pressure).
  const path = useMemo(() =>
    greatCirclePoints(ORIGIN_LAT, ORIGIN_LON, DEST_LAT, DEST_LON, 120)
      .map((p) => p.multiplyScalar(SURFACE_R)),
    [],
  );

  // Pre-allocate trail buffer (TRAIL_MAX points × 3 floats).
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3),
    );
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  const trailMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x58b8c8,
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );

  const lineObj = useMemo(
    () => new THREE.Line(trailGeo, trailMat),
    [trailGeo, trailMat],
  );

  useFrame((_, dt) => {
    if (!visible) return;
    elapsed.current += dt;

    // Path progress: 0 when AIRSPACE_ACTIVATION starts (t=0.40), 1 at end of FLY_TO_CONFLICT (t=0.84).
    // After 0.84 the plane stays at Hormuz (CONFLICT_LOCK pulse).
    const pathT = ss(0.40, 0.84, cinematicT);
    const idx   = Math.min(Math.floor(pathT * (path.length - 1)), path.length - 1);
    const pos   = path[idx];

    // ── Plane dot ──────────────────────────────────────────────────────────
    if (planeRef.current) {
      planeRef.current.position.copy(pos);
      const mat = planeRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.75 + Math.sin(elapsed.current * 4.0) * 0.25;
    }
    // ── Echo dot (desfasado) ───────────────────────────────────────────────
    if (echoRef.current) {
      echoRef.current.position.copy(pos);
      const mat = echoRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.abs(Math.sin(elapsed.current * 2.2 + 1.2)) * 0.10;
    }

    // ── Pulsing ring (oriented perpendicular to Earth surface = outward) ───
    if (ringRef.current) {
      ringRef.current.position.copy(pos);
      // Face the ring outward — align its +Z with the surface normal.
      const normal = pos.clone().normalize();
      ringRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      );
      // Pulse: fast on arrival (CONFLICT_LOCK), slower during flight.
      const atDest   = pathT >= 0.99;
      const freq     = atDest ? 2.8 : 1.6;
      const amplitude = atDest ? 0.45 : 0.25;
      const scale = 1.0 + Math.sin(elapsed.current * freq) * amplitude;
      ringRef.current.scale.setScalar(scale);
      const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
      ringMat.opacity = atDest
        ? 0.20 + Math.abs(Math.sin(elapsed.current * freq)) * 0.35
        : 0.28;
    }

    // ── Contrail (trail of last N points) ─────────────────────────────────
    if (lineRef.current && idx > 0) {
      const start = Math.max(0, idx - TRAIL_MAX + 1);
      const pts   = path.slice(start, idx + 1);
      const buf   = trailGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pts.length; i++) {
        buf.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
      }
      buf.needsUpdate = true;
      trailGeo.setDrawRange(0, pts.length);

      // Fade trail opacity as the plane approaches and is fully locked.
      trailMat.opacity = pathT < 0.95 ? 0.55 : THREE.MathUtils.lerp(0.55, 0.0, (pathT - 0.95) / 0.05);
    }
  });

  return (
    <group visible={visible}>
      {/* Plane dot — additive so bloom picks it up */}
      <mesh ref={planeRef}>
        <sphereGeometry args={[0.011, 10, 10]} />
        <meshBasicMaterial
          color={0x58b8c8}
          transparent
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Echo glow sphere — larger, very transparent, desfasado */}
      <mesh ref={echoRef}>
        <sphereGeometry args={[0.024, 10, 10]} />
        <meshBasicMaterial
          color={0x58b8c8}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Pulsing targeting ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.018, 0.025, 28]} />
        <meshBasicMaterial
          color={0x58b8c8}
          transparent
          opacity={0.30}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Contrail */}
      <primitive ref={lineRef} object={lineObj} />
    </group>
  );
}

function ss(e0: number, e1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
