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
          <Bloom intensity={0.28} luminanceThreshold={0.58} luminanceSmoothing={0.22} />
          <Vignette eskil={false} offset={0.18} darkness={0.7} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
        </EffectComposer>
      ) : null}
    </>
  );
}
