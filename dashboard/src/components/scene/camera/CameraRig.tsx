"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useExperienceStore } from "@/state/experienceStore";
import { latLonToUnitVec3 } from "@/lib/geo";

// Geographic anchors
const HORMUZ          = { lat: 26.77, lon: 53.44 };          // Persian Gulf entrance
const CONFLICT_CENTER = { lat: 30.0,  lon: 44.0  };          // centroid Israel/Iran
const GULF_CAM        = { lat: 24.0,  lon: 36.0, radius: 2.15 }; // Gulf theater camera anchor

// Reusable objects — allocated once, mutated every frame to avoid GC pressure.
const _desiredPos = new THREE.Vector3();
const _targetPos  = new THREE.Vector3();
const _stratDir   = new THREE.Vector3(); // strategic-orbit camera direction (unit)
const _camDir     = new THREE.Vector3(); // interpolated camera direction (unit)
const _lookDir    = new THREE.Vector3();
const _upVec      = new THREE.Vector3(0, 1, 0);
const _lookMat    = new THREE.Matrix4();
const _baseQuat   = new THREE.Quaternion();
const _rollQuat   = new THREE.Quaternion();
const _finalQuat  = new THREE.Quaternion();
const _dirQuat    = new THREE.Quaternion(); // rotation strat → gulf direction
const _slerpQuat  = new THREE.Quaternion(); // partial rotation by `dive`
const _parallax   = new THREE.Vector3();

export default function CameraRig() {
  const rig    = useRef<THREE.Group>(null);
  const pivot  = useRef<THREE.Object3D>(null); // look-at target
  const camera = useRef<THREE.PerspectiveCamera>(null);

  const cinematicT     = useExperienceStore((s) => s.cinematicT);
  const allowUserOrbit = useExperienceStore((s) => s.allowUserOrbit);
  const mouse          = useExperienceStore((s) => s.mouse);
  const mode           = useExperienceStore((s) => s.mode);
  const missileT       = useExperienceStore((s) => s.missileT);

  const hormuzVec   = useMemo(() => latLonToUnitVec3(HORMUZ.lat,          HORMUZ.lon),          []);
  const conflictVec = useMemo(() => latLonToUnitVec3(CONFLICT_CENTER.lat, CONFLICT_CENTER.lon), []);
  const gulfCamVec  = useMemo(() => latLonToUnitVec3(GULF_CAM.lat,        GULF_CAM.lon),        []);

  const smoothedRoll = useRef(0);
  const shakeTimer   = useRef(0);
  const prevMissileT = useRef(0);
  // Smoothed scroll input — the camera always follows the cinematic arc even on
  // fast scroll, instead of cutting straight through 3D space.
  const smoothT      = useRef(cinematicT);

  useFrame((_, dt) => {
    if (!rig.current || !pivot.current || !camera.current) return;
    if (allowUserOrbit) return; // OrbitControls takes over in COMMAND_CENTER

    // ─── Smoothed timeline ────────────────────────────────────────────────────
    smoothT.current = THREE.MathUtils.lerp(
      smoothT.current, cinematicT, 1 - Math.pow(0.0006, dt),
    );
    const t = smoothT.current;

    // ─── Segment helpers (strategic phase) ────────────────────────────────────
    const globalOrbit  = ss(0.06, 0.34, t); // slow strategic arc
    const overlayBuild = ss(0.34, 0.56, t); // air-routes appear, HUD builds
    const stratHold    = ss(0.56, 0.68, t); // hold on strategic overview

    // Single continuous dive factor: strategic orbit → Gulf theater.
    // Forced to 1 once locked so the missile never fires before the camera arrives.
    // Because ss(0.68,0.84,0.84) already equals 1, the forced value is continuous
    // at the mode boundary — no positional jump.
    const locked = mode === "CONFLICT_LOCK" || mode === "COMMAND_CENTER";
    const dive   = locked ? 1 : ss(0.68, 0.84, t);

    // ─── Strategic-orbit camera direction & radius ────────────────────────────
    const yaw =
      THREE.MathUtils.lerp(-1.65, 0.85, globalOrbit) +
      THREE.MathUtils.lerp( 0.00, 0.30, overlayBuild) +
      THREE.MathUtils.lerp( 0.00, 0.10, stratHold);
    const pitch =
      THREE.MathUtils.lerp(0.12, 0.42, globalOrbit) +
      THREE.MathUtils.lerp(0.00, 0.10, overlayBuild) +
      THREE.MathUtils.lerp(0.00, 0.08, stratHold);
    const stratR = THREE.MathUtils.lerp(10.6, 7.2, globalOrbit);

    _stratDir.set(
      Math.cos(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.sin(yaw) * Math.cos(pitch),
    ).normalize();

    // ─── Dive: great-circle slerp of direction + radius lerp ──────────────────
    // Interpolating the DIRECTION (not raw XYZ) keeps the camera on a clean arc
    // around the globe; the radius lerp is the zoom-in. No chord cutting, no
    // double-blend, fully continuous from strategic orbit to the Gulf anchor.
    _dirQuat.setFromUnitVectors(_stratDir, gulfCamVec);
    _slerpQuat.identity().slerp(_dirQuat, dive);
    _camDir.copy(_stratDir).applyQuaternion(_slerpQuat);
    const radius = THREE.MathUtils.lerp(stratR, GULF_CAM.radius, dive);
    _desiredPos.copy(_camDir).multiplyScalar(radius);

    // ─── Look-at target: Earth center → conflict centroid → Hormuz ────────────
    const toConflict = locked ? 1 : ss(0.58, 0.72, t);
    const toHormuz   = locked ? 1 : ss(0.70, 0.84, t);
    _targetPos
      .copy(conflictVec)
      .multiplyScalar(toConflict)
      .lerp(hormuzVec, toHormuz);

    // ─── Parallax (scenic phases only) ────────────────────────────────────────
    const parallaxActive =
      mode === "TYPOGRAPHY" || mode === "EARTH_REVEAL" ||
      mode === "AIRSPACE_ACTIVATION" || mode === "STRATEGIC_ORBIT";
    const pStrength = THREE.MathUtils.lerp(0.022, 0.0, dive);
    _parallax.set(
      parallaxActive ? THREE.MathUtils.clamp(mouse.x, -1, 1) *  pStrength : 0,
      parallaxActive ? THREE.MathUtils.clamp(mouse.y, -1, 1) * -pStrength : 0,
      0,
    );
    _desiredPos.add(_parallax);

    // ─── Camera shake on missile impact ───────────────────────────────────────
    if (missileT >= 0.95 && prevMissileT.current < 0.95) shakeTimer.current = 1.4;
    prevMissileT.current = missileT;
    if (shakeTimer.current > 0) {
      shakeTimer.current -= dt;
      const intensity = (shakeTimer.current / 1.4) * 0.04;
      _desiredPos.x += (Math.random() - 0.5) * intensity;
      _desiredPos.y += (Math.random() - 0.5) * intensity;
      _desiredPos.z += (Math.random() - 0.5) * intensity;
    }

    // ─── Frame-rate-independent position / target easing ──────────────────────
    rig.current.position.lerp(_desiredPos, 1 - Math.pow(0.0002, dt));
    pivot.current.position.lerp(_targetPos, 1 - Math.pow(0.0003, dt));

    // ─── FOV: wide → overlay base, punch-in mid-dive, settle on Gulf theater ──
    const fovBase = THREE.MathUtils.lerp(46.0, 38.0, ss(0.34, 0.56, t));
    const fov     = THREE.MathUtils.lerp(fovBase, 34.0, dive) - Math.sin(dive * Math.PI) * 8.0;
    camera.current.fov = THREE.MathUtils.clamp(fov, 18, 50);
    camera.current.updateProjectionMatrix();

    // ─── Orientation: look-at quaternion + smoothed cinematic roll ────────────
    _lookDir.subVectors(pivot.current.position, rig.current.position).normalize();
    _lookMat.lookAt(rig.current.position, pivot.current.position, _upVec);
    _baseQuat.setFromRotationMatrix(_lookMat);

    // Banked-turn roll that peaks mid-dive and levels to 0 at both ends.
    const rollTarget = Math.sin(dive * Math.PI) * -0.05;
    smoothedRoll.current = THREE.MathUtils.lerp(
      smoothedRoll.current, rollTarget, 1 - Math.pow(0.0005, dt),
    );
    _rollQuat.setFromAxisAngle(_lookDir, smoothedRoll.current);

    _finalQuat.copy(_rollQuat).multiply(_baseQuat);
    rig.current.quaternion.slerp(_finalQuat, 1 - Math.pow(0.0002, dt));
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
