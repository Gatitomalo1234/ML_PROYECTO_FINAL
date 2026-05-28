export type ExperienceMode =
  | "BOOT"
  | "TYPOGRAPHY"
  | "EARTH_REVEAL"
  | "AIRSPACE_ACTIVATION"
  | "STRATEGIC_ORBIT"
  | "FLY_TO_CONFLICT"
  | "CONFLICT_LOCK"
  | "COMMAND_CENTER"
  // legacy — kept for backward compat, no longer used in scroll map
  | "HORMUZ_TARGETING"
  | "INTERACTIVE_PLAYBACK";

export type ThreatLevel = "NOMINAL" | "CAUTION" | "CRITICAL";

export type DataStatus = "MOCK" | "OK";

export type AlertItem = {
  id: string;
  ts: string;
  kind: "AIRSPACE" | "GEO" | "MODEL" | "MARITIME";
  title: string;
};
