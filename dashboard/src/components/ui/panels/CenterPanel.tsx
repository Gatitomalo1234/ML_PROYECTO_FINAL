"use client";

import { useEffect } from "react";
import { useExperienceStore } from "@/state/experienceStore";

export default function CenterPanel() {
  const {
    conflictEvents,
    selectedConflictEventId,
    selectConflictEvent,
  } = useExperienceStore();

  // ── Receive marker-click events from the embedded Folium iframe ──────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "selectConflictEvent" && typeof e.data.id === "string") {
        selectConflictEvent(e.data.id);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [selectConflictEvent]);

  const selectedEvent =
    conflictEvents.find((event) => event.id === selectedConflictEventId) ??
    conflictEvents[0];

  const casualties      = conflictEvents.reduce((s, e) => s + e.fatalities, 0);
  const kineticEvents   = conflictEvents.filter((e) =>
    ["AIRSTRIKE", "MISSILE", "DRONE", "MARITIME", "GROUND"].includes(e.type)
  ).length;
  const civilianTargets = conflictEvents.filter((e) => {
    const text = `${e.metadata.target ?? ""} ${e.metadata.keywords.join(" ")} ${e.summary}`.toLowerCase();
    return (
      text.includes("civilian") ||
      text.includes("school") ||
      text.includes("hospital") ||
      text.includes("residential")
    );
  }).length;
  const sourceCount   = new Set(conflictEvents.map((e) => sourceLabel(e.source))).size;
  const criticalCount = conflictEvents.filter((e) => e.severity === "CRITICAL").length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-white/8 bg-graphite-900">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="text-[10px] tracking-[0.28em] text-white/55">
          OSINT LIVE MAP / TEATRO REGIONAL 2026
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-critical-500" />
          <span className="font-mono text-[9px] tracking-[0.3em] text-critical-500">ACTIVO</span>
        </div>
      </div>

      {/* ── Folium map iframe ─────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-graphite-950">
        <iframe
          src="/data/operational_map_2026.html"
          className="h-full w-full border-0"
          title="Mapa operacional de conflictos 2026"
          loading="eager"
        />

        {/* Selected event detail card ─────────────────────────────────────── */}
        {selectedEvent && (
          <div className="pointer-events-none absolute bottom-3 left-3 w-[min(360px,calc(100%-24px))] rounded border border-white/10 bg-graphite-900/82 p-3 shadow-panel backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] tracking-[0.24em] text-white/38">
                  {selectedEvent.date} {selectedEvent.time}
                </div>
                <div className="mt-1 text-[12px] font-medium leading-snug text-white/78">
                  {selectedEvent.location}
                </div>
              </div>
              <div
                className={`rounded border px-2 py-1 text-[9px] tracking-[0.18em] ${eventBadgeClass(selectedEvent.severity)}`}
              >
                {selectedEvent.type}
              </div>
            </div>
            <div className="mt-2 line-clamp-2 text-[10px] leading-snug text-white/52">
              {selectedEvent.summary}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[9px]">
              <MiniStat label="MUERTES"   value={selectedEvent.fatalities.toString()}                    tone="critical" />
              <MiniStat label="CONFIANZA" value={`${Math.round(selectedEvent.confidence * 100)}%`}       tone="system"   />
              <MiniStat label="FUENTE"    value={sourceLabel(selectedEvent.source)}                      tone="caution"  />
            </div>
          </div>
        )}

        {/* Legend / source chip ────────────────────────────────────────────── */}
        <div className="pointer-events-none absolute right-3 top-3 rounded border border-white/10 bg-graphite-900/72 px-3 py-2 shadow-panel backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[8px] tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-critical-500" /> CRITICAL
            <span className="ml-2 h-1.5 w-1.5 rounded-full bg-caution-500" /> HIGH
            <span className="ml-2 h-1.5 w-1.5 rounded-full bg-system-500" /> MEDIUM
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[8px] tracking-[0.14em]">
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-1 text-white/42">STRIKES</span>
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-1 text-white/42">TARGETS</span>
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-1 text-white/42">GDELT</span>
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-1 text-white/42">2026</span>
          </div>
        </div>
      </div>

      {/* ── Bottom metrics bar ────────────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-4 divide-x divide-white/8 border-t border-white/8">
        <MetricBox
          label="MUERTES REPORTADAS"
          value={casualties > 0 ? casualties.toLocaleString() : "--"}
          sub="eventos visibles"
          valueClass="text-critical-500"
        />
        <MetricBox
          label="EVENTOS KINETIC"
          value={kineticEvents.toString()}
          sub="strikes/targets"
          valueClass="text-caution-500"
        />
        <MetricBox
          label="OBJETIVOS CIVILES"
          value={civilianTargets.toString()}
          sub="texto/fuente"
          valueClass="text-system-500"
        />
        <MetricBox
          label="FUENTES / CRITICAL"
          value={`${sourceCount}/${criticalCount}`}
          sub="CAPP IRW GDELT"
          valueClass="text-white/75"
          small
        />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function eventBadgeClass(severity: string) {
  if (severity === "CRITICAL") return "border-critical-500/35 text-critical-500 bg-critical-500/10";
  if (severity === "HIGH")     return "border-caution-500/35 text-caution-500 bg-caution-500/10";
  if (severity === "MEDIUM")   return "border-system-500/30 text-system-500 bg-system-500/8";
  return "border-white/15 text-white/60 bg-white/5";
}

function sourceLabel(source: string) {
  if (source.includes("conflictsapp")) return "CAPP";
  if (source.includes("gdeltcloud"))   return "GDELT";
  if (source.includes("iranwarlive"))  return "IRW";
  return "OTRA";
}

function MiniStat({
  label, value, tone,
}: {
  label: string; value: string; tone: "system" | "caution" | "critical";
}) {
  const color =
    tone === "system"   ? "text-system-500"   :
    tone === "caution"  ? "text-caution-500"  :
    "text-critical-500";
  return (
    <div className="rounded border border-white/10 bg-graphite-950/55 px-2 py-1.5 text-center">
      <div className="text-[7px] tracking-[0.16em] text-white/28">{label}</div>
      <div className={`mt-0.5 text-[11px] ${color}`}>{value}</div>
    </div>
  );
}

function MetricBox({
  label, value, sub, valueClass, small = false,
}: {
  label: string; value: string; sub: string; valueClass: string; small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3 text-center">
      <div className="text-[8.5px] tracking-[0.22em] text-white/40">{label}</div>
      <div
        className={`mt-1 font-mono font-medium leading-tight ${
          small ? "text-[16px]" : "text-[22px]"
        } ${valueClass}`}
      >
        {value}
      </div>
      <div className="text-[8px] tracking-[0.18em] text-white/28">{sub}</div>
    </div>
  );
}
