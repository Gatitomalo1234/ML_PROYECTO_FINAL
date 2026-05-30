"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { latLonToUnitVec3 } from "@/lib/geo";

const HORMUZ_LAT = 26.77;
const HORMUZ_LON = 53.44;

const RING_RADII  = [0.048, 0.095, 0.170, 0.260] as const;
const RING_PHASES = [0.0,   0.8,   1.6,   2.4  ] as const;

type Props = { visible: boolean };

export default function AOIOverlay({ visible }: Props) {
  const hormuzPos  = useMemo(
    () => latLonToUnitVec3(HORMUZ_LAT, HORMUZ_LON).multiplyScalar(1.018),
    [],
  );
  const hormuzNorm = useMemo(
    () => latLonToUnitVec3(HORMUZ_LAT, HORMUZ_LON).normalize(),
    [],
  );
  const surfaceQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), hormuzNorm),
    [hormuzNorm],
  );

  const elapsed   = useRef(0);
  const dotRef    = useRef<THREE.Mesh>(null);
  const ring0Ref  = useRef<THREE.Mesh>(null);
  const ring1Ref  = useRef<THREE.Mesh>(null);
  const ring2Ref  = useRef<THREE.Mesh>(null);
  const ring3Ref  = useRef<THREE.Mesh>(null);
  const ringRefs  = [ring0Ref, ring1Ref, ring2Ref, ring3Ref] as const;

  const ringGeos = useMemo(
    () => RING_RADII.map((r) => new THREE.RingGeometry(r * 0.88, r, 64)),
    [],
  );

  useFrame((_, dt) => {
    if (!visible) return;
    elapsed.current += dt;
    const t = elapsed.current;

    // Central dot pulse
    if (dotRef.current) {
      const mat = dotRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.65 + 0.35 * Math.abs(Math.sin(t * 2.2));
    }

    // Rings: each pulses independently with staggered phase
    ringRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const mat   = ref.current.material as THREE.MeshBasicMaterial;
      const phase = RING_PHASES[i];
      mat.opacity = 0.10 + 0.40 * Math.abs(Math.sin(t * 1.1 + phase));
      // Outer two rings scale slightly
      if (i >= 2) {
        const s = 1.0 + Math.sin(t * 0.9 + phase) * 0.05;
        ref.current.scale.setScalar(s);
      }
    });
  });

  if (!visible) return null;

  return (
    <group position={hormuzPos.toArray()} quaternion={surfaceQuat}>
      {/* Central dot — additive for bloom */}
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial
          color="#d6a24a"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric rings */}
      {RING_RADII.map((_, i) => (
        <mesh
          key={i}
          ref={ringRefs[i]}
          quaternion={new THREE.Quaternion()}
        >
          <primitive object={ringGeos[i]} attach="geometry" />
          <meshBasicMaterial
            color={i === 0 ? "#d6a24a" : "#58b8c8"}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

    </group>
  );
}
