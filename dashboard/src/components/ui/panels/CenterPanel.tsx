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
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-6 py-3.5">
        <div className="text-[11px] tracking-widest text-white/60">
          OSINT LIVE MAP / TEATRO REGIONAL 2026
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-critical-500 shadow-[0_0_8px_rgba(var(--critical-500),0.8)]" />
          <span className="font-mono text-[10px] tracking-widest text-critical-500 font-semibold">SISTEMA ACTIVO</span>
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
          <div className="pointer-events-none absolute bottom-4 left-4 w-[min(420px,calc(100%-32px))] rounded-lg border border-white/10 bg-graphite-900/60 p-4 shadow-panel backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] tracking-widest text-white/50">
                  {selectedEvent.date} {selectedEvent.time}
                </div>
                <div className="mt-1 text-base font-medium leading-snug text-white/90">
                  {selectedEvent.location}
                </div>
              </div>
              <div
                className={`rounded-md border px-3 py-1.5 text-[10px] font-semibold tracking-widest ${eventBadgeClass(selectedEvent.severity)}`}
              >
                {selectedEvent.type}
              </div>
            </div>
            <div className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/70">
              {selectedEvent.summary}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
              <MiniStat label="MUERTES"   value={selectedEvent.fatalities.toString()}                    tone="critical" />
              <MiniStat label="CONFIANZA" value={`${Math.round(selectedEvent.confidence * 100)}%`}       tone="system"   />
              <MiniStat label="FUENTE"    value={sourceLabel(selectedEvent.source)}                      tone="caution"  />
            </div>
          </div>
        )}


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
    <div className="rounded-md border border-white/10 bg-graphite-950/40 px-3 py-2 text-center shadow-inner">
      <div className="text-[9px] tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function MetricBox({
  label, value, sub, valueClass, small = false,
}: {
  label: string; value: string; sub: string; valueClass: string; small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-4 text-center">
      <div className="text-[10px] tracking-widest text-white/50">{label}</div>
      <div
        className={`mt-1.5 font-mono font-semibold leading-tight ${
          small ? "text-xl" : "text-3xl"
        } ${valueClass}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[9px] tracking-widest text-white/40">{sub}</div>
    </div>
  );
}
