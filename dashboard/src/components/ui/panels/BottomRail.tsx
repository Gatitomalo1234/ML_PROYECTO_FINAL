"use client";

import Panel from "@/components/ui/primitives/Panel";
import ModelEvaluationDashboard from "@/components/analysis/ModelEvaluationDashboard";

export default function BottomRail() {
  return (
    <Panel title="RESULTADOS CLASIFICACION 2026" className="mt-3 max-h-[34vh] overflow-y-auto">
      <ModelEvaluationDashboard />
    </Panel>
  );
}
