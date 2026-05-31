"use client";

import { useMemo, useState } from "react";
import ConfusionMatrixChart from "@/components/analysis/ConfusionMatrixChart";
import CoefficientChart from "@/components/analysis/CoefficientChart";
import KnnSensitivityChart from "@/components/analysis/KnnSensitivityChart";
import LineCurveChart from "@/components/analysis/LineCurveChart";
import MetricBarChart from "@/components/analysis/MetricBarChart";
import ProbabilityDistributionChart from "@/components/analysis/ProbabilityDistributionChart";
import ThresholdChart from "@/components/analysis/ThresholdChart";
import { metricLabels, models, prCurves, rocCurves, type MetricKey, type ModelKey, type SplitKey } from "@/components/analysis/analysisData";

const metricOrder: MetricKey[] = ["rocAuc", "f1", "precision", "recall", "averagePrecision"];

export default function ModelEvaluationDashboard() {
  const [selectedModel, setSelectedModel] = useState<ModelKey>("logreg");
  const [metric, setMetric] = useState<MetricKey>("rocAuc");
  const [split, setSplit] = useState<SplitKey>("temporal");
  const [threshold, setThreshold] = useState(0.5);

  const activeModel = useMemo(
    () => models.find((m) => m.key === selectedModel) ?? models[0],
    [selectedModel],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.24em] text-white/55">MÓDULO DE EVALUACIÓN COMPARATIVA</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/45">
            <span className="rounded bg-white/10 px-1.5 py-0.5">Train: Ene-Abr 2026</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5">Test: May 2026</span>
            <span className="rounded bg-critical-500/15 text-critical-500 px-1.5 py-0.5">Predicción: Probabilidad de letalidad (víctimas fatales &gt; 0) en incidentes</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedModel(m.key)}
              className={`rounded border px-2.5 py-1.5 text-[9px] tracking-[0.18em] transition ${selectedModel === m.key ? "border-white/25 bg-white/10 text-white/78" : "border-white/10 bg-white/5 text-white/42 hover:bg-white/8"}`}
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
              {m.shortName.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSplit(split === "temporal" ? "cv" : "temporal")}
            className="rounded border border-system-500/20 bg-system-500/8 px-2.5 py-1.5 text-[9px] tracking-[0.18em] text-system-500"
          >
            {split === "temporal" ? "TEMPORAL" : "CV/RANDOM"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {metricOrder.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMetric(key)}
            className={`rounded border px-2 py-1 text-[9px] tracking-[0.16em] transition ${metric === key ? "border-caution-500/35 bg-caution-500/12 text-caution-500" : "border-white/10 bg-white/4 text-white/42 hover:bg-white/8"}`}
          >
            {metricLabels[key].toUpperCase()}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="flex snap-x snap-mandatory gap-3">
          <section className="min-w-full snap-start">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-3">
                <MetricBarChart models={models} metric={metric} split={split} selected={selectedModel} onSelect={setSelectedModel} />
              </div>
              <div className="col-span-12 md:col-span-3">
                <LineCurveChart title="CURVAS ROC" kicker="overlay 3 modelos" models={models} curves={rocCurves} selected={selectedModel} xLabel="FPR" yLabel="TPR" />
              </div>
              <div className="col-span-12 md:col-span-3">
                <LineCurveChart title="PRECISION-RECALL" kicker="dataset desbalanceado" models={models} curves={prCurves} selected={selectedModel} xLabel="RECALL" yLabel="PRECISION" />
              </div>
              <div className="col-span-12 md:col-span-3">
                <ConfusionMatrixChart model={activeModel} />
              </div>
            </div>
          </section>

          <section className="min-w-full snap-start pt-2">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <CoefficientChart />
              </div>
              <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <ProbabilityDistributionChart model={activeModel} />
              </div>
              <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <ThresholdChart threshold={threshold} onThreshold={setThreshold} />
              </div>
              <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <KnnSensitivityChart />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
