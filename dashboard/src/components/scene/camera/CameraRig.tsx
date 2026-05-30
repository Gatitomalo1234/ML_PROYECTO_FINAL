"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useExperienceStore } from "@/state/experienceStore";
import { latLonToUnitVec3 } from "@/lib/geo";

// Geographic anchors
// HORMUZ: Google Maps ref @26.7756116,53.4422413 — Persian Gulf center (entrance region)
const HORMUZ          = { lat: 26.77, lon: 53.44 };
const CONFLICT_CENTER = { lat: 30.0,  lon: 44.0  }; // centroid Israel/Iran
// Camera position for the Gulf theater — close enough to show the Gulf region in detail.
// Radius 2.0 ≈ altitude ~6 400 km: fills frame with Middle East, Iran, Hormuz, Arabia.
const GULF_CAM = { lat: 24.0, lon: 36.0, radius: 2.15 }; // Gulf theater — camera west of Gulf so Hormuz sits right-of-center

// Reusable objects — allocated once, mutated every frame to avoid GC pressure.
const _desiredPos  = new THREE.Vector3();
const _targetPos   = new THREE.Vector3();
const _lookDir     = new THREE.Vector3();
const _upVec       = new THREE.Vector3(0, 1, 0);
const _lookMat     = new THREE.Matrix4();
const _baseQuat    = new THREE.Quaternion();
const _rollQuat    = new THREE.Quaternion();
const _finalQuat   = new THREE.Quaternion();
const _parallax    = new THREE.Vector3();
const _gulfCamPos  = new THREE.Vector3(); // pre-alloc for CONFLICT_LOCK override

export default function CameraRig() {
  const rig    = useRef<THREE.Group>(null);
  const pivot  = useRef<THREE.Object3D>(null); // look-at target
  const camera = useRef<THREE.PerspectiveCamera>(null);

  const cinematicT      = useExperienceStore((s) => s.cinematicT);
  const allowUserOrbit  = useExperienceStore((s) => s.allowUserOrbit);
  const mouse           = useExperienceStore((s) => s.mouse);
  const mode            = useExperienceStore((s) => s.mode);
  const missileT        = useExperienceStore((s) => s.missileT);

  const hormuzVec   = useMemo(() => latLonToUnitVec3(HORMUZ.lat,          HORMUZ.lon),          []);
  const conflictVec = useMemo(() => latLonToUnitVec3(CONFLICT_CENTER.lat, CONFLICT_CENTER.lon), []);
  const gulfCamVec  = useMemo(() => latLonToUnitVec3(GULF_CAM.lat,        GULF_CAM.lon),        []);

  const smoothedRoll  = useRef(0);
  const shakeTimer    = useRef(0);
  const prevMissileT  = useRef(0);
  // Smoothed T input — camera always follows the cinematic arc even on fast scroll.
  // Without this, rapid scroll causes the position lerp to cut straight through 3D
  // space instead of following the intended yaw/pitch/radius arc.
  const smoothT       = useRef(cinematicT);

  useFrame((_, dt) => {
    if (!rig.current || !pivot.current || !camera.current) return;
    if (allowUserOrbit) return; // OrbitControls takes over in COMMAND_CENTER

    // Ease toward the current store value — ~120ms lag prevents jarring arc cuts.
    smoothT.current = THREE.MathUtils.lerp(
      smoothT.current, cinematicT,
      1 - Math.pow(0.0006, dt),
    );
    const t = smoothT.current;

    // ─── Segment helpers ──────────────────────────────────────────────────────
    const bootReveal   = ss(0.00, 0.10, t);  // Earth emerges from darkness
    const globalOrbit  = ss(0.06, 0.34, t);  // slow strategic arc
    const overlayBuild = ss(0.34, 0.56, t);  // air-routes appear, HUD builds
    const stratHold    = ss(0.56, 0.68, t);  // hold on strategic overview
    const flyApproach  = ss(0.68, 0.84, t);  // FLY_TO_CONFLICT — aggressive dive
    const conflictLock = ss(0.84, 0.93, t);  // CONFLICT_LOCK — arrived, tension
    const cmdReveal    = ss(0.93, 0.98, t);  // COMMAND_CENTER — panels reveal

    // ─── Radius ───────────────────────────────────────────────────────────────
    // Boot/global: 10.6 → 7.2  |  FLY_TO_CONFLICT: 7.2 → 2.0
    // CONFLICT_LOCK+: position is blended toward gulfCamPos (radius 1.45)
    const globalR = THREE.MathUtils.lerp(10.6, 7.2, globalOrbit);
    const flyR    = THREE.MathUtils.lerp(7.2, 2.0, flyApproach);
    const radius  = t < 0.68 ? globalR : flyR;

    // ─── Yaw / Pitch ──────────────────────────────────────────────────────────
    // Drives position through FLY_TO_CONFLICT; CONFLICT_LOCK overrides via lerp.
    const yaw =
      THREE.MathUtils.lerp(-1.65, 0.85, globalOrbit) +
      THREE.MathUtils.lerp( 0.00, 0.30, overlayBuild) +
      THREE.MathUtils.lerp( 0.00, 0.10, stratHold) +
      THREE.MathUtils.lerp( 0.00, 0.45, flyApproach);

    const pitch =
      THREE.MathUtils.lerp(0.12, 0.42, globalOrbit) +
      THREE.MathUtils.lerp(0.00, 0.10, overlayBuild) +
      THREE.MathUtils.lerp(0.00, 0.08, stratHold) +
      THREE.MathUtils.lerp(0.00, 0.28, flyApproach);

    _desiredPos.set(
      Math.cos(yaw) * Math.cos(pitch) * radius,
      Math.sin(pitch) * radius,
      Math.sin(yaw) * Math.cos(pitch) * radius,
    );

    // ─── CONFLICT_LOCK: override toward Gulf theater position ─────────────────
    // Blends from wherever the dive ended → 28°N 52°E at radius 1.45 (≈2852 km alt).
    // This replicates the Google Maps view: full theater from Israel to Pakistan.
    if (conflictLock > 0) {
      _gulfCamPos.copy(gulfCamVec).multiplyScalar(GULF_CAM.radius);
      _desiredPos.lerp(_gulfCamPos, conflictLock);
    }

    // ─── Look-at target ───────────────────────────────────────────────────────
    // Boot → global: look at Earth center
    // FLY_TO_CONFLICT: shift toward conflict centroid (Israel/Iran midpoint)
    // CONFLICT_LOCK + COMMAND_CENTER: lock on Hormuz
    const toConflict = ss(0.65, 0.80, t); // blend center → conflict centroid
    const toHormuz   = ss(0.80, 0.90, t); // blend conflict centroid → Hormuz

    _targetPos
      .copy(conflictVec)
      .multiplyScalar(toConflict)
      .lerp(hormuzVec, toHormuz);

    // ─── Parallax ─────────────────────────────────────────────────────────────
    const parallaxActive =
      mode === "TYPOGRAPHY" || mode === "EARTH_REVEAL" ||
      mode === "AIRSPACE_ACTIVATION" || mode === "STRATEGIC_ORBIT";
    const pStrength = THREE.MathUtils.lerp(0.022, 0.008, flyApproach);
    _parallax.set(
      parallaxActive ? THREE.MathUtils.clamp(mouse.x, -1, 1) * pStrength : 0,
      parallaxActive ? THREE.MathUtils.clamp(mouse.y, -1, 1) * -pStrength : 0,
      0,
    );
    _desiredPos.add(_parallax);

    // ─── Camera shake on missile impact ──────────────────────────────────────
    if (missileT >= 0.95 && prevMissileT.current < 0.95) {
      shakeTimer.current = 1.4; // 1.4s shake duration
    }
    prevMissileT.current = missileT;

    if (shakeTimer.current > 0) {
      shakeTimer.current -= dt;
      const intensity = (shakeTimer.current / 1.4) * 0.04;
      _desiredPos.x += (Math.random() - 0.5) * intensity;
      _desiredPos.y += (Math.random() - 0.5) * intensity;
      _desiredPos.z += (Math.random() - 0.5) * intensity;
    }

    // ─── Lerp position and target ──────────────────────────────────────────────
    // T is already smoothed above, so we can use a tighter position lerp here
    // for a more responsive feel without causing arc-cut artifacts.
    const posAlpha    = 1 - Math.pow(0.0002, dt);
    const targetAlpha = 1 - Math.pow(0.0003, dt);
    rig.current.position.lerp(_desiredPos, posAlpha);
    pivot.current.position.lerp(_targetPos, targetAlpha);

    // ─── FOV ──────────────────────────────────────────────────────────────────
    // 46° global → 38° overlay → 22° dive → 34° locked (Gulf theater regional view at r=2.0)
    const fov =
      THREE.MathUtils.lerp(46.0, 38.0, ss(0.34, 0.56, t)) +
      THREE.MathUtils.lerp( 0.0,-16.0, flyApproach) +   // narrow to 22° during dive
      THREE.MathUtils.lerp( 0.0, +12.0, conflictLock);  // open to 34° for Gulf theater
    camera.current.fov = THREE.MathUtils.clamp(fov, 18, 50);
    camera.current.updateProjectionMatrix();

    // ─── FIX: Quaternion rotation (no lookAt + rotation.z conflict) ───────────
    // Instead of calling rig.lookAt() and then overwriting rotation.z (Euler gimbal
    // conflict), we build the final rotation as: base_look ⊗ roll_around_view_axis.
    _lookDir.subVectors(pivot.current.position, rig.current.position).normalize();
    _lookMat.lookAt(rig.current.position, pivot.current.position, _upVec);
    _baseQuat.setFromRotationMatrix(_lookMat);

    // Smooth roll — a tiny negative roll during the dive adds cinematic tilt;
    // it eases back to 0 at CONFLICT_LOCK for a clean arrival.
    const rollTarget = THREE.MathUtils.lerp(0, -0.055, flyApproach) +
                       THREE.MathUtils.lerp(0,  0.055, conflictLock);
    smoothedRoll.current = THREE.MathUtils.lerp(smoothedRoll.current, rollTarget, 1 - Math.pow(0.0005, dt));
    _rollQuat.setFromAxisAngle(_lookDir, smoothedRoll.current);

    // Compose: apply roll in view space, then slerp the rig quaternion.
    _finalQuat.copy(_rollQuat).multiply(_baseQuat);
    rig.current.quaternion.slerp(_finalQuat, 1 - Math.pow(0.0002, dt));

    void bootReveal; void cmdReveal;
  });

  return (
    <group ref={rig}>
      <object3D ref={pivot} />
      <PerspectiveCamera ref={camera} makeDefault position={[0, 0, 8]} />
    </group>
  );
}

function ss(e0: number, e1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
