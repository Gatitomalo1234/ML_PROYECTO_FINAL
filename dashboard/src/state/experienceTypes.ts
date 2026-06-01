export type ExperienceMode =
  | "BOOT"
  | "TYPOGRAPHY"
  | "PROJECT_NARRATIVE"
  | "EARTH_REVEAL"
  | "AIRSPACE_ACTIVATION"
  | "STRATEGIC_ORBIT"
  | "FLY_TO_CONFLICT"
  | "CONFLICT_LOCK"
  | "COMMAND_CENTER"
  | "AVIATION_FRONT";

export type ThreatLevel = "NOMINAL" | "CAUTION" | "CRITICAL";

export type DataStatus = "MOCK" | "OK";

export type AlertItem = {
  id: string;
  ts: string;
  kind: "AIRSPACE" | "GEO" | "MODEL" | "MARITIME";
  title: string;
};

export type ConflictEvent = {
  id: string;
  date: string;
  time: string;
  type: "DRONE" | "MISSILE" | "AIRSTRIKE" | "MARITIME" | "CYBER" | "GROUND";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  location: string;
  country: string;
  lat: number;
  lon: number;
  fatalities: number;
  injured: number;
  actors: string[];
  source: string;
  url?: string;
  confidence: number;
  summary: string;
  metadata: {
    weapon?: string;
    target?: string;
    infrastructure?: string;
    keywords: string[];
    modelScore: number;
  };
};
