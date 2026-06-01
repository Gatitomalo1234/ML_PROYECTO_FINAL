"use client";

import { ResponsiveContainer, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import type { ModelKey } from "./analysisData";
import { models } from "./analysisData";

export default function RadarChart({ selectedModel, split = "temporal" }: { selectedModel: ModelKey; split?: "temporal" | "cv" }) {
  const activeModel = models.find((m) => m.key === selectedModel) ?? models[0];

  const data = [
    { subject: "ROC AUC", A: activeModel[split].rocAuc * 100, fullMark: 100 },
    { subject: "F1 Score", A: activeModel[split].f1 * 100, fullMark: 100 },
    { subject: "Precision", A: activeModel[split].precision * 100, fullMark: 100 },
    { subject: "Recall", A: activeModel[split].recall * 100, fullMark: 100 },
    { subject: "Avg Precision", A: activeModel[split].averagePrecision * 100, fullMark: 100 },
  ];

  return (
    <div className="h-56 w-full rounded-lg border border-white/5 bg-white/4 p-2 shadow-inner">
      <div className="mb-2 text-center text-[10px] tracking-widest text-white/50 font-medium">
        HUELLA DEL MODELO ({split.toUpperCase()})
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 9, fontFamily: "monospace", fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name={activeModel.shortName} dataKey="A" stroke={activeModel.color} fill={activeModel.color} fillOpacity={0.35} />
          <Tooltip 
            contentStyle={{ backgroundColor: "rgba(10,12,16,0.9)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "6px" }} 
            itemStyle={{ color: activeModel.color, fontSize: "12px", fontWeight: "bold" }} 
            labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", marginBottom: "4px" }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
