import type { ReactNode } from "react";

export default function ChartFrame({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <div className="rounded border border-white/10 bg-graphite-950/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] tracking-[0.22em] text-white/55">{title}</div>
        {kicker && <div className="font-mono text-[9px] tracking-[0.18em] text-white/30">{kicker}</div>}
      </div>
      {children}
    </div>
  );
}
