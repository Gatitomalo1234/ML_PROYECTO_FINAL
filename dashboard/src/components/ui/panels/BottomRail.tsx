"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/components/ui/primitives/Panel";
import ModelEvaluationDashboard from "@/components/analysis/ModelEvaluationDashboard";

export default function BottomRail() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex flex-col items-center w-full">
      <button
        onClick={() => { setCollapsed(!collapsed); }}
        className="mb-3 rounded-full border border-white/10 bg-graphite-900/50 px-6 py-2 text-xs font-medium tracking-[0.2em] text-white/60 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
      >
        {collapsed ? "▼ MOSTRAR ANÁLISIS DE MODELOS ML" : "▲ OCULTAR ANÁLISIS"}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="w-full overflow-hidden"
          >
            <Panel title="RESULTADOS CLASIFICACIÓN 2026" className="max-h-[40vh] overflow-y-auto border-t-system-500/30">
              <ModelEvaluationDashboard />
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
