"use client";

import { cn } from "@/lib/cn";

export default function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border border-white/10 bg-graphite-900/55 shadow-panel backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="text-[11px] tracking-tactical text-white/55">{title}</div>
        <div className="h-2 w-2 rounded-full bg-system-500/60" />
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

