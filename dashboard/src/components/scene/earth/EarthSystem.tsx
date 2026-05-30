"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import AtmosphereShell from "@/components/scene/earth/AtmosphereShell";
import { useExperienceStore } from "@/state/experienceStore";
import EarthTextured from "@/components/scene/earth/EarthTextured";
import { latLonToUnitVec3 } from "@/lib/geo";

// World-space direction to the Hormuz impact point (geo.ts convention, Earth at -π/2)
const IMPACT_DIR = latLonToUnitVec3(26.77, 53.44).normalize();
void IMPACT_DIR; // passed as prop to EarthTextured

export default function EarthSystem() {
  const group = useRef<THREE.Group>(null);

  const sunDirection = useMemo(() => new THREE.Vector3(1, 0.15, 0.35).normalize(), []);
  const mode        = useExperienceStore((s) => s.mode);
  const cinematicT  = useExperienceStore((s) => s.cinematicT);
  const missileT    = useExperienceStore((s) => s.missileT);

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

  useFrame((_, dt) => {
    if (!group.current) return;

    const lockMode = mode === "FLY_TO_CONFLICT" || mode === "CONFLICT_LOCK" || mode === "COMMAND_CENTER";

    const TARGET = -Math.PI / 2;
    const PI2    = Math.PI * 2;

    if (lockMode) {
      if (gulfTarget.current === null) {
        // Normalize current rotation to within π of TARGET so the lerp takes the
        // SHORT path (never spins through the wrong continents). Adding/removing
        // 2π is a visual no-op on the sphere.
        let cur = group.current.rotation.y;
        while (cur - TARGET >  Math.PI) cur -= PI2;
        while (TARGET - cur  >  Math.PI) cur += PI2;
        group.current.rotation.y = cur;
        gulfTarget.current = TARGET;
      }
      if (mode === "FLY_TO_CONFLICT") {
        // During the dive, rotate quickly toward the Gulf orientation (smooth, ~0.4s).
        group.current.rotation.y = THREE.MathUtils.lerp(
          group.current.rotation.y, TARGET, 1 - Math.pow(0.00003, dt),
        );
      } else {
        // CONFLICT_LOCK / COMMAND_CENTER: hold exactly on target — guaranteed correct.
        group.current.rotation.y = TARGET;
      }
    } else {
      gulfTarget.current = null;
      group.current.rotation.y += dt * 0.035;
      // Keep free rotation normalized so it never wanders far from TARGET.
      while (group.current.rotation.y - TARGET >  Math.PI) group.current.rotation.y -= PI2;
      while (TARGET - group.current.rotation.y >  Math.PI) group.current.rotation.y += PI2;
    }

    if (missileT >= 0.95 && prevMissileT.current < 0.95) impactAge.current = 0.0;
    prevMissileT.current = missileT;
    if (impactAge.current >= 0) impactAge.current += dt;
  });

  const reveal       = smoothstep(0.22, 0.40, cinematicT);
  const conflictGlow = THREE.MathUtils.clamp((cinematicT - 0.84) / 0.09, 0, 1);
  const exposure = (() => {
    const preRevealDark = mode === "BOOT" ? 0.0 : 1.0;
    const base     = THREE.MathUtils.lerp(0.18, 1.02, reveal);
    const targeting = smoothstep(0.82, 0.98, cinematicT);
    const deepen   = 1.0 - targeting * 0.07;
    return preRevealDark * base * deepen;
  })();

  return (
    <group ref={group}>
      <EarthTextured
        reveal={reveal}
        exposure={exposure}
        sunDirection={sunDirection}
        textureSet="solarsystemscope"
        impactAge={impactAge.current}
        conflictGlow={conflictGlow}
      />
      <AtmosphereShell />
    </group>
  );
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
