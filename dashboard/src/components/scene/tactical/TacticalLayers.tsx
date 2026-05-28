"use client";

import type { ExperienceMode } from "@/state/experienceTypes";
import AirRoutes from "@/components/scene/tactical/routes/AirRoutes";
import AOIOverlay from "@/components/scene/tactical/aoi/AOIOverlay";
import TacticalAircraft from "@/components/scene/tactical/aircraft/TacticalAircraft";
import MissileTrack from "@/components/scene/tactical/missile/MissileTrack";

export default function TacticalLayers({ mode }: { mode: ExperienceMode }) {
  const airRoutesVisible =
    mode === "AIRSPACE_ACTIVATION" ||
    mode === "STRATEGIC_ORBIT"     ||
    mode === "FLY_TO_CONFLICT"     ||
    mode === "CONFLICT_LOCK"       ||
    mode === "COMMAND_CENTER";

  const aircraftVisible =
    mode === "AIRSPACE_ACTIVATION" ||
    mode === "STRATEGIC_ORBIT"     ||
    mode === "FLY_TO_CONFLICT"     ||
    mode === "CONFLICT_LOCK"       ||
    mode === "COMMAND_CENTER";

  const aoiVisible =
    mode === "FLY_TO_CONFLICT" ||
    mode === "CONFLICT_LOCK"   ||
    mode === "COMMAND_CENTER";

  return (
    <>
      <AirRoutes visible={airRoutesVisible} />
      <TacticalAircraft visible={aircraftVisible} />
      <AOIOverlay visible={aoiVisible} />
      <MissileTrack />
    </>
  );
}
