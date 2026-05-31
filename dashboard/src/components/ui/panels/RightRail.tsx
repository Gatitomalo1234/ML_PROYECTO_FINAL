"use client";

import Panel from "@/components/ui/primitives/Panel";
import type { ConflictEvent } from "@/state/experienceTypes";
import { useExperienceStore } from "@/state/experienceStore";

export default function RightRail() {
  const events = useExperienceStore((s) => s.conflictEvents);
  const selectedId = useExperienceStore((s) => s.selectedConflictEventId);
  const selected = events.find((event) => event.id === selectedId) ?? events[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-1">
      <Panel title="DETALLE DEL EVENTO" className="min-h-full">
        {selected ? <EventDetail event={selected} /> : <EmptyDetail />}
      </Panel>
    </div>
  );
}

function EventDetail({ event }: { event: ConflictEvent }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[9px] tracking-[0.22em] text-white/35">{event.country} / {event.location}</div>
            <div className="mt-1 text-[12px] font-medium leading-snug text-white/78">{event.title}</div>
          </div>
          <span className={`shrink-0 rounded border px-2 py-1 text-[9px] tracking-[0.18em] ${eventBadgeClass(event.severity)}`}>
            {event.severity}
          </span>
        </div>
        <div className="mt-2 text-[10px] leading-snug text-white/52">{event.summary}</div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <DetailStat label="MUERTOS" value={event.fatalities.toString()} tone="critical" />
        <DetailStat label="CONFIANZA" value={`${Math.round(event.confidence * 100)}%`} tone="system" />
        <DetailStat label="PESO" value={event.metadata.modelScore.toFixed(2)} tone="caution" />
      </div>

      <div className="rounded border border-system-500/15 bg-system-500/8 px-2.5 py-2 text-[9px] leading-snug text-white/46">
        Confianza indica calidad/verificacion de la fuente; peso resume la relevancia operativa usada para ordenar el mapa.
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] leading-snug">
        <InfoBlock label="TIPO" value={event.type} />
        <InfoBlock label="ARMA" value={event.metadata.weapon ?? event.type} />
        <InfoBlock label="OBJETIVO" value={event.metadata.target ?? "No confirmado"} />
        <InfoBlock label="FECHA" value={`${event.date} ${event.time}`} mono />
      </div>

      <div className="rounded border border-white/10 bg-graphite-950/40 px-2.5 py-2">
        <div className="text-[8px] tracking-[0.20em] text-white/30">ACTORES</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {event.actors.length > 0 ? (
            event.actors.map((actor) => (
              <span key={actor} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-white/56">
                {actor}
              </span>
            ))
          ) : (
            <span className="text-[9px] text-white/36">No especificado en la fuente</span>
          )}
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[8px] tracking-[0.20em] text-white/30">FUENTE</div>
          <div className="font-mono text-[8.5px] text-white/30">{event.lat.toFixed(2)}, {event.lon.toFixed(2)}</div>
        </div>
        <div className="mt-1 text-[10px] text-white/58">{event.source}</div>
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex text-[9px] tracking-[0.16em] text-system-500/80 hover:text-system-500"
          >
            VER REFERENCIA
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {event.metadata.keywords.map((keyword) => (
          <span key={keyword} className="rounded border border-system-500/15 bg-system-500/8 px-1.5 py-0.5 text-[8.5px] tracking-[0.12em] text-system-500/78">
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-3 text-[10px] leading-snug text-white/45">
      Selecciona un marcador en el mapa para ver la informacion asociada.
    </div>
  );
}

function DetailStat({ label, value, tone }: { label: string; value: string; tone: "system" | "caution" | "critical" }) {
  const color =
    tone === "system" ? "text-system-500" :
    tone === "caution" ? "text-caution-500" :
    "text-critical-500";

  return (
    <div className="rounded border border-white/10 bg-graphite-950/45 px-2 py-1.5 text-center">
      <div className="text-[7.5px] tracking-[0.16em] text-white/30">{label}</div>
      <div className={`mt-0.5 font-mono text-[13px] ${color}`}>{value}</div>
    </div>
  );
}

function InfoBlock({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="text-[7.5px] tracking-[0.16em] text-white/28">{label}</div>
      <div className={`mt-0.5 text-[9.5px] text-white/58 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function eventBadgeClass(severity: string) {
  if (severity === "CRITICAL") return "border-critical-500/35 text-critical-500 bg-critical-500/10";
  if (severity === "HIGH") return "border-caution-500/35 text-caution-500 bg-caution-500/10";
  if (severity === "MEDIUM") return "border-system-500/30 text-system-500 bg-system-500/8";
  return "border-white/15 text-white/60 bg-white/5";
}
