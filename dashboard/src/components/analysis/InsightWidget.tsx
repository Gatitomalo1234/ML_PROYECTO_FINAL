import type { ReactNode } from "react";

export default function InsightWidget({
  title,
  description,
  insight,
  children,
}: {
  title: string;
  description?: string;
  insight?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-white/10 bg-graphite-950/60 shadow-panel backdrop-blur-sm transition-all hover:border-white/20 hover:bg-graphite-950/80">
      {/* Header section with Title and Description */}
      <div className="border-b border-white/5 bg-white/[0.02] px-3.5 py-3">
        <h3 className="text-[10px] font-semibold tracking-[0.2em] text-white/80">{title}</h3>
        {description && (
          <p className="mt-1.5 text-[10px] leading-relaxed text-white/45">{description}</p>
        )}
      </div>

      {/* Main Chart/Content Area */}
      <div className="flex-1 p-3.5 min-h-[160px] relative">
        {children}
      </div>

      {/* Footer Insight section */}
      {insight && (
        <div className="border-t border-system-500/10 bg-system-500/5 px-3.5 py-2.5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-system-500/80 shadow-[0_0_8px_rgba(88,184,200,0.6)]" />
            <p className="text-[9.5px] leading-snug tracking-wide text-system-500/90">
              <span className="font-semibold text-system-500">INSIGHT: </span>
              {insight}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
