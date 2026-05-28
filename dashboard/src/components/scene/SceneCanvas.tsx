"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import SceneRoot from "@/components/scene/SceneRoot";
import { useAdaptiveDpr } from "@/hooks/useAdaptiveDpr";
import { useExperienceStore } from "@/state/experienceStore";

export default function SceneCanvas() {
  const { targetDpr } = useAdaptiveDpr();
  const mode = useExperienceStore((s) => s.mode);

  return (
    <Canvas
      className="!fixed inset-0 !z-0"
      dpr={targetDpr}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      }}
      camera={{ fov: 42, near: 0.1, far: 3000, position: [0, 0, 8] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        void scene; // no fog — prevents darkening on zoom
      }}
    >
      <color attach="background" args={["#05070a"]} />
      <SceneRoot mode={mode} />
    </Canvas>
  );
}
