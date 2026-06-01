"use client";

import Panel from "@/components/ui/primitives/Panel";
import ScrambleText from "@/components/ui/primitives/ScrambleText";
import type { ConflictEvent } from "@/state/experienceTypes";
import { useExperienceStore } from "@/state/experienceStore";

export default function RightRail() {
  const events = useExperienceStore((s) => s.conflictEvents);
  const selectedId = useExperienceStore((s) => s.selectedConflictEventId);
  const selected = events.find((event) => event.id === selectedId) ?? events[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-2">
      <Panel title="REPORTE DE INTELIGENCIA" className="h-full flex flex-col">
        <div className="h-full overflow-y-auto">
          {selected ? <EventDetail event={selected} /> : <EmptyDetail />}
        </div>
      </Panel>
    </div>
  );
}

function EventDetail({ event }: { event: ConflictEvent }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-widest text-white/50">{event.country} / {event.location}</div>
            <div className="mt-1.5 text-lg font-medium leading-snug text-white/90">
              <ScrambleText text={event.title} />
            </div>
          </div>
          <span className={`shrink-0 rounded-md border px-3 py-1.5 text-[10px] tracking-widest font-semibold ${eventBadgeClass(event.severity)}`}>
            {event.severity}
          </span>
        </div>
        <div className="mt-3 text-sm leading-relaxed text-white/70">{event.summary}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <DetailStat label="MUERTOS" value={event.fatalities.toString()} tone="critical" />
        <DetailStat label="CONFIANZA" value={`${Math.round(event.confidence * 100)}%`} tone="system" />
        <DetailStat label="PESO (ML)" value={event.metadata.modelScore.toFixed(2)} tone="caution" />
      </div>

      <div className="rounded-lg border border-system-500/20 bg-system-500/10 px-4 py-3 text-xs leading-relaxed text-system-500/80">
        <strong className="text-system-500">Nota Analítica:</strong> Confianza indica calidad/verificación de la fuente; el peso resume la relevancia operativa asignada por el modelo para ordenar el mapa.
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs leading-snug">
        <InfoBlock label="TIPO" value={event.type} />
        <InfoBlock label="ARMA" value={event.metadata.weapon ?? event.type} />
        <InfoBlock label="OBJETIVO" value={event.metadata.target ?? "No confirmado"} />
        <InfoBlock label="FECHA" value={`${event.date} ${event.time}`} mono />
      </div>

      <div className="rounded-lg border border-white/5 bg-graphite-950/40 px-4 py-3">
        <div className="text-[10px] tracking-widest text-white/40 mb-2">ACTORES INVOLUCRADOS</div>
        <div className="flex flex-wrap gap-2">
          {event.actors.length > 0 ? (
            event.actors.map((actor) => (
              <span key={actor} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 shadow-sm">
                {actor}
              </span>
            ))
          ) : (
            <span className="text-xs text-white/40 italic">No especificado en la fuente</span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 mt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] tracking-widest text-white/40">FUENTE / COORDENADAS</div>
          <div className="font-mono text-[10px] text-white/40">{event.lat.toFixed(2)}, {event.lon.toFixed(2)}</div>
        </div>
        <div className="mt-2 text-xs text-white/70">{event.source}</div>
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-[10px] tracking-widest font-semibold text-system-500 hover:text-white transition-colors"
          >
            VER REFERENCIA EXTERNA ↗
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {event.metadata.keywords.map((keyword) => (
          <span key={keyword} className="rounded-full border border-system-500/30 bg-system-500/10 px-3 py-1 text-[10px] tracking-widest text-system-500/90">
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-5 text-sm leading-relaxed text-white/60 text-center italic">
      Selecciona un marcador en el mapa para cargar su reporte de inteligencia.
    </div>
  );
}

function DetailStat({ label, value, tone }: { label: string; value: string; tone: "system" | "caution" | "critical" }) {
  const color =
    tone === "system" ? "text-system-500" :
    tone === "caution" ? "text-caution-500" :
    "text-critical-500";

  return (
    <div className="rounded-lg border border-white/5 bg-graphite-950/60 px-3 py-2 text-center shadow-inner">
      <div className="text-[9px] tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 font-mono text-xl ${color}`}>
        <ScrambleText text={value} />
      </div>
    </div>
  );
}

function InfoBlock({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <div className="text-[9px] tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 text-sm text-white/80 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function eventBadgeClass(severity: string) {
  if (severity === "CRITICAL") return "border-critical-500/35 text-critical-500 bg-critical-500/10";
  if (severity === "HIGH") return "border-caution-500/35 text-caution-500 bg-caution-500/10";
  if (severity === "MEDIUM") return "border-system-500/30 text-system-500 bg-system-500/8";
  return "border-white/15 text-white/60 bg-white/5";
}
