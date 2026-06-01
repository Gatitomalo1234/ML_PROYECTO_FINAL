"use client";
import { motion } from "framer-motion";
import { useExperienceStore } from "@/state/experienceStore";

export default function NewsTicker() {
  const events = useExperienceStore((s) => s.conflictEvents);
  
  if (!events || events.length === 0) return null;

  const tickerText = events.slice(0, 15).map((e) => `[${e.date} ${e.time} ${e.location.toUpperCase()}] ${e.title.toUpperCase()}`).join("  •  ");

  return (
    <div className="pointer-events-auto flex w-full overflow-hidden bg-system-500/5 border-y border-system-500/10 py-1.5 backdrop-blur-md">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ ease: "linear", duration: 150, repeat: Infinity }}
      >
        <span className="mx-4 font-mono text-[10px] tracking-[0.2em] text-system-500/60 font-medium">
          {tickerText}  •  {tickerText}
        </span>
        <span className="mx-4 font-mono text-[10px] tracking-[0.2em] text-system-500/60 font-medium">
          {tickerText}  •  {tickerText}
        </span>
      </motion.div>
    </div>
  );
}
