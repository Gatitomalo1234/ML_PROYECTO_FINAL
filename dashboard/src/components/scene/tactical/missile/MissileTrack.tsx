"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/state/experienceStore";
import { greatCirclePoints, latLonToUnitVec3 } from "@/lib/geo";

const ORIGIN_LAT = 27.2;
const ORIGIN_LON = 56.3;
const DEST_LAT   = 26.77;
const DEST_LON   = 53.44;

const SURFACE_R = 1.016;
const TRAIL_MAX = 40;
const SPEED     = 1 / 4.2;

const _tangent = new THREE.Vector3();
const _yAxis   = new THREE.Vector3(0, 1, 0);

export default function MissileTrack() {
  const missileActive  = useExperienceStore((s) => s.missileActive);
  const missileT       = useExperienceStore((s) => s.missileT);
  const setMissileT    = useExperienceStore((s) => s.setMissileT);
  const triggerMissile = useExperienceStore((s) => s.triggerMissile);
  const mode           = useExperienceStore((s) => s.mode);

  const impactTimer  = useRef(0);
  const impacted     = useRef(false);
  const hasTriggered = useRef(false); // fires only once per session

  useEffect(() => {
    if (mode !== "CONFLICT_LOCK" || hasTriggered.current) return;
    hasTriggered.current = true;
    // 4s delay so the user can see the Earth before the attack
    const id = setTimeout(() => triggerMissile(), 4000);
    return () => clearTimeout(id);
  }, [mode, triggerMissile]);

  // ── Path ─────────────────────────────────────────────────────────────────────
  const path = useMemo(() =>
    greatCirclePoints(ORIGIN_LAT, ORIGIN_LON, DEST_LAT, DEST_LON, 180)
      .map((p) => p.multiplyScalar(SURFACE_R)),
    [],
  );

  const hormuzPos = useMemo(
    () => latLonToUnitVec3(DEST_LAT, DEST_LON).multiplyScalar(SURFACE_R),
    [],
  );

  const impactNormal = useMemo(
    () => latLonToUnitVec3(DEST_LAT, DEST_LON).normalize(),
    [],
  );

  const impactQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), impactNormal),
    [impactNormal],
  );

  // ── Geometries (useMemo — never recreated) ───────────────────────────────────
  const missileBodyGeo = useMemo(() => new THREE.CylinderGeometry(0.005, 0.007, 0.065, 8), []);
  const missileConeGeo = useMemo(() => new THREE.ConeGeometry(0.007, 0.022, 8), []);
  const missileGlowGeo = useMemo(() => new THREE.SphereGeometry(0.045, 10, 10), []);

  const ringGeo = useMemo(() => new THREE.RingGeometry(0.012, 0.022, 64), []);

  // ── Arc geometries ───────────────────────────────────────────────────────────
  const arcGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(path.length * 3), 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, [path]);

  const arcMat = useMemo(() => new THREE.LineBasicMaterial({
    color: 0xff3322, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), []);

  const guideGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(path.length * 3);
    path.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, [path]);

  const guideMat = useMemo(() => new THREE.LineBasicMaterial({
    color: 0xd34b47, transparent: true, opacity: 0.08, depthWrite: false,
  }), []);

  const arcLine   = useMemo(() => new THREE.Line(arcGeo, arcMat), [arcGeo, arcMat]);
  const guideLine = useMemo(() => new THREE.Line(guideGeo, guideMat), [guideGeo, guideMat]);

  // ── Trail ────────────────────────────────────────────────────────────────────
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  const trailMat = useMemo(() => new THREE.LineBasicMaterial({
    color: 0xff9966, transparent: true, opacity: 0.90,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), []);

  const trailLine = useMemo(() => new THREE.Line(trailGeo, trailMat), [trailGeo, trailMat]);

  // ── Debris particles ─────────────────────────────────────────────────────────
  const COUNT = 60;
  const debrisGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    return geo;
  }, []);

  const debrisMat = useMemo(() => new THREE.PointsMaterial({
    color: 0xff6633, size: 0.010, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }), []);

  const debrisPoints = useMemo(() => new THREE.Points(debrisGeo, debrisMat), [debrisGeo, debrisMat]);

  const debrisVelocities = useMemo(() => {
    const vels: THREE.Vector3[] = [];
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.55;
      const speed = 0.14 + Math.random() * 0.26;
      const v = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
      v.applyQuaternion(impactQuat).multiplyScalar(speed);
      vels.push(v);
    }
    return vels;
  }, [impactQuat]);

  const debrisPositions = useMemo(
    () => Array.from({ length: COUNT }, () => hormuzPos.clone()),
    [hormuzPos],
  );

  // ── Smoke plume ──────────────────────────────────────────────────────────────
  const SMOKE = 80;
  const smokeGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SMOKE * 3), 3));
    return geo;
  }, []);

  const smokeMat = useMemo(() => new THREE.PointsMaterial({
    color: 0x884422, size: 0.018, transparent: true, opacity: 0,
    blending: THREE.NormalBlending, depthWrite: false, sizeAttenuation: true,
  }), []);

  const smokePoints = useMemo(() => new THREE.Points(smokeGeo, smokeMat), [smokeGeo, smokeMat]);

  const smokeVelocities = useMemo(() => {
    const vels: THREE.Vector3[] = [];
    for (let i = 0; i < SMOKE; i++) {
      const theta = Math.random() * Math.PI * 2;
      const lateralStr = Math.random() * 0.018;
      const upStr = 0.025 + Math.random() * 0.055;
      // Random lateral direction in the tangent plane of the surface normal
      const tang1 = new THREE.Vector3(1, 0, 0);
      const tang2 = new THREE.Vector3(0, 0, 1);
      const v = impactNormal.clone()
        .multiplyScalar(upStr)
        .addScaledVector(tang1, Math.cos(theta) * lateralStr)
        .addScaledVector(tang2, Math.sin(theta) * lateralStr);
      vels.push(v);
    }
    return vels;
  }, [impactNormal]);

  const smokePositions = useMemo(
    () => Array.from({ length: SMOKE }, () => hormuzPos.clone()),
    [hormuzPos],
  );

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const missileGroupRef = useRef<THREE.Group>(null);
  const missileQuatRef  = useRef(new THREE.Quaternion());

  const coreRef    = useRef<THREE.Mesh>(null); // fireball core
  const midRef     = useRef<THREE.Mesh>(null); // fireball mid
  const outerRef   = useRef<THREE.Mesh>(null); // fireball outer
  const craterRef  = useRef<THREE.Mesh>(null);

  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  // ── Per-frame ────────────────────────────────────────────────────────────────
  useFrame((_, dt) => {
    if (!missileActive) return;

    const newT = Math.min(missileT + dt * SPEED, 1.0);
    if (newT !== missileT) setMissileT(newT);

    const idx  = Math.min(Math.floor(newT * (path.length - 1)), path.length - 1);
    const next = path[Math.min(idx + 1, path.length - 1)];
    const flying = newT < 0.95;

    // ── Missile shape — oriented along path tangent ───────────────────────────
    if (missileGroupRef.current) {
      missileGroupRef.current.visible = flying;
      missileGroupRef.current.position.copy(path[idx]);

      _tangent.subVectors(next, path[idx]);
      if (_tangent.lengthSq() > 0) {
        _tangent.normalize();
        missileQuatRef.current.setFromUnitVectors(_yAxis, _tangent);
        missileGroupRef.current.quaternion.copy(missileQuatRef.current);
      }
    }

    // ── Progressive arc reveal ────────────────────────────────────────────────
    if (idx > 0) {
      const buf = arcGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= idx; i++) {
        buf.setXYZ(i, path[i].x, path[i].y, path[i].z);
      }
      buf.needsUpdate = true;
      arcGeo.setDrawRange(0, idx + 1);
    }

    // ── Trail ─────────────────────────────────────────────────────────────────
    if (idx > 0) {
      const start = Math.max(0, idx - TRAIL_MAX + 1);
      const pts   = path.slice(start, idx + 1);
      const buf   = trailGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pts.length; i++) {
        buf.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
      }
      buf.needsUpdate = true;
      trailGeo.setDrawRange(0, pts.length);
      trailMat.opacity = flying
        ? 0.90
        : THREE.MathUtils.lerp(0.90, 0, (newT - 0.95) / 0.05);
    }

    // ── Impact trigger ────────────────────────────────────────────────────────
    if (newT >= 0.95 && !impacted.current) {
      impacted.current = true;
      impactTimer.current = 0;
      // Reset debris to impact point
      const buf = debrisGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < COUNT; i++) {
        debrisPositions[i].copy(hormuzPos);
        buf.setXYZ(i, hormuzPos.x, hormuzPos.y, hormuzPos.z);
      }
      buf.needsUpdate = true;
      // Reset smoke to impact point
      const sbuf = smokeGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SMOKE; i++) {
        smokePositions[i].copy(hormuzPos);
        sbuf.setXYZ(i, hormuzPos.x, hormuzPos.y, hormuzPos.z);
      }
      sbuf.needsUpdate = true;
    }

    // ── Post-impact animations ────────────────────────────────────────────────
    if (impacted.current) {
      impactTimer.current += dt;
      const it = impactTimer.current;

      // Fireball core (white-hot): 0→0.12s grow, 0.12→0.5s fade
      if (coreRef.current) {
        const mat = coreRef.current.material as THREE.MeshBasicMaterial;
        if (it < 0.12) {
          const p = it / 0.12;
          coreRef.current.scale.setScalar(p);
          mat.opacity = p * 0.95;
        } else {
          const p = 1.0 - (it - 0.12) / 0.38;
          coreRef.current.scale.setScalar(Math.max(p, 0));
          mat.opacity = Math.max(p * 0.95, 0);
        }
      }

      // Fireball mid (orange): 0→0.22s grow, 0.22→1.2s fade
      if (midRef.current) {
        const mat = midRef.current.material as THREE.MeshBasicMaterial;
        if (it < 0.22) {
          const p = it / 0.22;
          midRef.current.scale.setScalar(p);
          mat.opacity = p * 0.85;
        } else {
          const p = 1.0 - (it - 0.22) / 0.98;
          midRef.current.scale.setScalar(Math.max(p, 0));
          mat.opacity = Math.max(p * 0.85, 0);
        }
      }

      // Fireball outer (red): 0→0.40s grow, 0.40→2.0s fade
      if (outerRef.current) {
        const mat = outerRef.current.material as THREE.MeshBasicMaterial;
        if (it < 0.40) {
          const p = it / 0.40;
          outerRef.current.scale.setScalar(p);
          mat.opacity = p * 0.60;
        } else {
          const p = 1.0 - (it - 0.40) / 1.60;
          outerRef.current.scale.setScalar(Math.max(p, 0));
          mat.opacity = Math.max(p * 0.60, 0);
        }
      }

      // Crater glow: persistent pulse
      if (craterRef.current) {
        const mat = craterRef.current.material as THREE.MeshBasicMaterial;
        const appear = Math.min(it / 0.2, 1.0);
        mat.opacity = appear * (0.45 + 0.20 * Math.sin(it * 4.5));
      }

      // Shockwave rings
      const animRing = (
        ref: React.RefObject<THREE.Mesh>,
        delay: number, maxS: number, dur: number,
      ) => {
        if (!ref.current) return;
        const local = it - delay;
        if (local < 0) { ref.current.scale.setScalar(0); return; }
        const p = Math.min(local / dur, 1.0);
        ref.current.scale.setScalar(p * maxS);
        (ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.80;
      };
      animRing(ring1Ref, 0.00, 4.5, 1.3);
      animRing(ring2Ref, 0.18, 6.0, 1.6);
      animRing(ring3Ref, 0.40, 8.0, 2.0);

      // Debris
      if (it < 2.2) {
        const buf = debrisGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < COUNT; i++) {
          debrisPositions[i].addScaledVector(debrisVelocities[i], dt);
          buf.setXYZ(i, debrisPositions[i].x, debrisPositions[i].y, debrisPositions[i].z);
        }
        buf.needsUpdate = true;
        debrisMat.opacity = Math.max(0, 1.0 - it / 2.2) * 0.85;
      } else {
        debrisMat.opacity = 0;
      }

      // Smoke plume — rises slowly, persists 8s
      if (it > 0.3 && it < 8.0) {
        const sbuf = smokeGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < SMOKE; i++) {
          smokePositions[i].addScaledVector(smokeVelocities[i], dt * Math.max(0, 1 - it / 4.0));
          sbuf.setXYZ(i, smokePositions[i].x, smokePositions[i].y, smokePositions[i].z);
        }
        sbuf.needsUpdate = true;
        const ramp = Math.min((it - 0.3) / 0.5, 1.0);
        smokeMat.opacity = ramp * Math.max(0, 1.0 - it / 8.0) * 0.55;
        // Darken smoke over time: warm brown → cool dark gray
        const warmth = Math.max(0, 1.0 - it / 3.5);
        smokeMat.color.setHex(
          warmth > 0.5 ? 0x884422 : warmth > 0.2 ? 0x553322 : 0x222222,
        );
      } else if (it >= 8.0) {
        smokeMat.opacity = 0;
      }
    }
  });

  if (!missileActive) return null;

  return (
    <group>
      {/* Static guide */}
      <primitive object={guideLine} />
      {/* Progressive arc */}
      <primitive object={arcLine} />
      {/* Trail */}
      <primitive object={trailLine} />

      {/* Missile: cylinder body + cone nose + glow halo */}
      <group ref={missileGroupRef}>
        {/* Body */}
        <mesh geometry={missileBodyGeo}>
          <meshBasicMaterial
            color={0xff6622} blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
        {/* Nose cone — offset to front tip */}
        <mesh geometry={missileConeGeo} position={[0, 0.043, 0]}>
          <meshBasicMaterial
            color={0xffcc88} blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
        {/* Engine glow behind */}
        <mesh geometry={missileGlowGeo} position={[0, -0.04, 0]}>
          <meshBasicMaterial
            color={0xff3300} transparent opacity={0.30}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
      </group>

      {/* Fireball — 3 layers at impact point */}
      {/* Core: bright white */}
      <mesh ref={coreRef} position={hormuzPos.toArray()} scale={0}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial
          color={0xfff0cc} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
      {/* Mid: orange */}
      <mesh ref={midRef} position={hormuzPos.toArray()} scale={0}>
        <sphereGeometry args={[0.115, 16, 16]} />
        <meshBasicMaterial
          color={0xff5500} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
      {/* Outer: deep red */}
      <mesh ref={outerRef} position={hormuzPos.toArray()} scale={0}>
        <sphereGeometry args={[0.200, 16, 16]} />
        <meshBasicMaterial
          color={0xcc1100} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Crater glow */}
      <mesh ref={craterRef} position={hormuzPos.toArray()}>
        <sphereGeometry args={[0.032, 14, 14]} />
        <meshBasicMaterial
          color={0xff3300} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Shockwave rings — oriented to surface normal */}
      <mesh ref={ring1Ref} position={hormuzPos.toArray()} quaternion={impactQuat} scale={0}>
        <primitive object={ringGeo} attach="geometry" />
        <meshBasicMaterial
          color={0xff6600} transparent opacity={0} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
      <mesh ref={ring2Ref} position={hormuzPos.toArray()} quaternion={impactQuat} scale={0}>
        <primitive object={ringGeo.clone()} attach="geometry" />
        <meshBasicMaterial
          color={0xff4400} transparent opacity={0} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
      <mesh ref={ring3Ref} position={hormuzPos.toArray()} quaternion={impactQuat} scale={0}>
        <primitive object={ringGeo.clone()} attach="geometry" />
        <meshBasicMaterial
          color={0xdd2200} transparent opacity={0} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Debris particles */}
      <primitive object={debrisPoints} />

      {/* Smoke plume */}
      <primitive object={smokePoints} />
    </group>
  );
}
