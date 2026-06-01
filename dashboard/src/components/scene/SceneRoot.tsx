"use client";

import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { OrbitControls } from "@react-three/drei";
import CameraRig from "@/components/scene/camera/CameraRig";
import EarthSystem from "@/components/scene/earth/EarthSystem";
import Starfield from "@/components/scene/space/Starfield";
import TacticalLayers from "@/components/scene/tactical/TacticalLayers";
import type { ExperienceMode } from "@/state/experienceTypes";
import { useExperienceStore } from "@/state/experienceStore";

export default function SceneRoot({ mode }: { mode: ExperienceMode }) {
  const quality = useExperienceStore((s) => s.quality);
  const allowUserOrbit = useExperienceStore((s) => s.allowUserOrbit);

  return (
    <>
      <ambientLight intensity={0.035} />
      <directionalLight position={[8, 3.2, 7]} intensity={2.25} color="#e7f2ff" />
      <hemisphereLight intensity={0.12} color="#263a4a" groundColor="#020305" />
      <CameraRig />
      {allowUserOrbit && (
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={1.8}
          maxDistance={12}
          rotateSpeed={0.4}
          zoomSpeed={0.6}
        />
      )}
      <Starfield />
      <EarthSystem />
      <TacticalLayers mode={mode} />

      {quality.postFX ? (
        <EffectComposer multisampling={2}>
          <Bloom intensity={0.38} luminanceThreshold={0.52} luminanceSmoothing={0.18} />
          <Vignette eskil={false} offset={0.16} darkness={0.62} />
          {/* Opacity 0 during PROJECT_NARRATIVE — per-frame grain causes visible flickering on stars */}
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT}
            opacity={mode === "PROJECT_NARRATIVE" ? 0 : 0.14} />
        </EffectComposer>
      ) : null}
    </>
  );
}
