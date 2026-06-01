"use client";

import { create } from "zustand";
import type { AlertItem, ConflictEvent, DataStatus, ExperienceMode, ThreatLevel } from "@/state/experienceTypes";
import { buildMockSeries, defaultAlerts, defaultConflictEvents, defaultMetrics, defaultModelComparison } from "@/state/mockData";

type QualityState = {
  targetDpr: number;
  postFX: boolean;
};

type Metrics = {
  flightsAirborne: number;
  flightDropIndex: number;
  anomalies24h: number;
};

type ChartSeries = {
  flights: number[];
  fatalities: number[];
  confidence: number[];
};

export type ModelComparisonEntry = {
  name: string;
  f1: number;
  accuracy: number;
  precision: number;
  recall: number;
  balancedAccuracy?: number;
  rocAuc?: number;
  averagePrecision?: number;
  tn?: number;
  fp?: number;
  fn?: number;
  tp?: number;
  note?: string;
};

type ExperienceState = {
  mode: ExperienceMode;
  cinematicT: number; // 0..1 master normalized timeline
  allowUserOrbit: boolean;
  debug: boolean;
  initialized: boolean;
  scrollProgress: number;
  mouse: { x: number; y: number };

  quality: QualityState;
  dataStatus: DataStatus;
  dataError: string | null;
  threatLevel: ThreatLevel;

  metrics: Metrics;
  alerts: AlertItem[];
  conflictEvents: ConflictEvent[];
  selectedConflictEventId: string;
  chartSeries: ChartSeries;
  modelComparison: ModelComparisonEntry[];

  missileActive: boolean;
  missileT: number;

  narrativeModalOpen: boolean;
  setNarrativeModalOpen: (v: boolean) => void;

  setMode: (mode: ExperienceMode) => void;
  setCinematicT: (t: number) => void;
  setAllowUserOrbit: (v: boolean) => void;
  setQuality: (q: Partial<QualityState>) => void;
  setDataStatus: (s: DataStatus) => void;
  setDataError: (msg: string | null) => void;
  setInitialized: (v: boolean) => void;
  setScrollProgress: (v: number) => void;
  setMouse: (v: { x: number; y: number }) => void;
  hydrateFromExports: (payload: Partial<{ threatLevel: ThreatLevel; metrics: Metrics; alerts: AlertItem[]; conflictEvents: ConflictEvent[]; chartSeries: ChartSeries; modelComparison: ModelComparisonEntry[] }>) => void;
  selectConflictEvent: (id: string) => void;
  triggerMissile: () => void;
  setMissileT: (t: number) => void;
  setMissileActive: (v: boolean) => void;
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  mode: "BOOT",
  cinematicT: 0,
  allowUserOrbit: false,
  debug: false,
  initialized: false,
  scrollProgress: 0,
  mouse: { x: 0, y: 0 },

  quality: { targetDpr: 1.25, postFX: true },
  dataStatus: "MOCK",
  dataError: null,
  threatLevel: "NOMINAL",

  metrics: defaultMetrics(),
  alerts: defaultAlerts(),
  conflictEvents: defaultConflictEvents(),
  selectedConflictEventId: "",
  chartSeries: buildMockSeries(),
  modelComparison: defaultModelComparison(),

  missileActive: false,
  missileT: 0,

  narrativeModalOpen: false,

  setMode: (mode) => set({ mode }),
  setCinematicT: (t) => set({ cinematicT: t }),
  setAllowUserOrbit: (v) => set({ allowUserOrbit: v }),
  setQuality: (q) => set((s) => ({ quality: { ...s.quality, ...q } })),
  setDataStatus: (s) => set({ dataStatus: s }),
  setDataError: (msg) => set({ dataError: msg }),
  setInitialized: (v) => set({ initialized: v }),
  setScrollProgress: (v) => set({ scrollProgress: v }),
  setMouse: (v) => set({ mouse: v }),
  hydrateFromExports: (payload) =>
    set((s) => ({
      threatLevel: payload.threatLevel ?? s.threatLevel,
      metrics: payload.metrics ?? s.metrics,
      alerts: payload.alerts ?? s.alerts,
      conflictEvents: payload.conflictEvents ?? s.conflictEvents,
      selectedConflictEventId: payload.conflictEvents?.[0]?.id ?? s.selectedConflictEventId,
      chartSeries: payload.chartSeries ?? s.chartSeries,
      modelComparison: payload.modelComparison ?? s.modelComparison
    })),
  selectConflictEvent: (id) => set({ selectedConflictEventId: id }),
  triggerMissile: () => set({ missileActive: true, missileT: 0 }),
  setMissileT: (t) => set({ missileT: t }),
  setMissileActive: (v) => set({ missileActive: v }),
  setNarrativeModalOpen: (v) => set({ narrativeModalOpen: v }),
}));
