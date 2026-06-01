"use client";

import SceneCanvas from "@/components/scene/SceneCanvas";
import UIOverlay from "@/components/ui/UIOverlay";
import ExperienceController from "@/systems/ExperienceController";
import CustomCursor from "@/components/ui/CustomCursor";

export default function ExperienceShell() {
  return (
    <div className="relative min-h-dvh w-dvw bg-graphite-950">
      <SceneCanvas />
      <UIOverlay />
      <ExperienceController />
      <CustomCursor />
    </div>
  );
}
