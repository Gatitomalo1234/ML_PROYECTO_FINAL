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
      <ScrollScaffold />
    </div>
  );
}

function ScrollScaffold() {
  // Invisible scroll narrative sections that drive the cinematic state machine.
  // Canvas is fixed, so this creates a premium landing flow without UI clutter.
  return (
    <div className="relative">
      <section className="h-dvh" aria-label="Typography" />
      <section className="h-dvh" aria-label="Earth Reveal" />
      <section className="h-dvh" aria-label="Airspace Activation" />
      <section className="h-dvh" aria-label="Strategic Orbit" />
      <section className="h-dvh" aria-label="Fly to Conflict Zone" />
      <section className="h-dvh" aria-label="Conflict Lock" />
      <section className="h-dvh" aria-label="Command Center" />
    </div>
  );
}
