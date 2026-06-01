"use client";

import { cn } from "@/lib/cn";

export default function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-white/5 bg-graphite-900/40 shadow-panel backdrop-blur-md", className)}>
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
        <div className="text-xs tracking-tactical text-white/70 font-medium">{title}</div>
        <div className="h-2 w-2 rounded-full bg-system-500/80 shadow-[0_0_8px_rgba(var(--system-500),0.8)]" />
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

