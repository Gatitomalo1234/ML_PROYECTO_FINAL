import * as THREE from "three";

const DEG_TO_RAD = Math.PI / 180;

export function latLonToUnitVec3(lat: number, lon: number): THREE.Vector3 {
  const phi = lat * DEG_TO_RAD;
  const theta = lon * DEG_TO_RAD;
  const cosPhi = Math.cos(phi);

  return new THREE.Vector3(
    cosPhi * Math.sin(theta),
    Math.sin(phi),
    cosPhi * Math.cos(theta),
  ).normalize();
}

export function greatCirclePoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  segments: number,
): THREE.Vector3[] {
  const start = latLonToUnitVec3(startLat, startLon);
  const end = latLonToUnitVec3(endLat, endLon);
  const steps = Math.max(1, Math.floor(segments));
  const omega = start.angleTo(end);
  const sinOmega = Math.sin(omega);
  const points: THREE.Vector3[] = [];

  if (sinOmega < 1e-6) {
    for (let i = 0; i <= steps; i++) {
      points.push(start.clone());
    }
    return points;
  }

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    points.push(start.clone().multiplyScalar(a).add(end.clone().multiplyScalar(b)).normalize());
  }

  return points;
}
