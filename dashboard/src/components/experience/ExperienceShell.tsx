"use client";

import SceneCanvas from "@/components/scene/SceneCanvas";
import UIOverlay from "@/components/ui/UIOverlay";
import ExperienceController from "@/systems/ExperienceController";

export default function ExperienceShell() {
  return (
    <div className="relative min-h-dvh w-dvw bg-graphite-950">
      <SceneCanvas />
      <UIOverlay />
      <ExperienceController />
    </div>
  );
}
