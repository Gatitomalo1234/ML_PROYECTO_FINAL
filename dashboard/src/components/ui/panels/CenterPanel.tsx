"use client";

import { useExperienceStore } from "@/state/experienceStore";

// SVG coordinate system: viewBox "0 0 800 480"
// Covers 12°E–76°E longitude, 42°N–12°N latitude
function svgX(lon: number) { return ((lon - 12) / 64) * 800; }
function svgY(lat: number) { return ((42 - lat) / 30) * 480; }

// Key geographic positions
const PT = {
  med:     [svgX(15),    svgY(38)  ] as [number, number],  // Med origin
  cyprus:  [svgX(33),    svgY(35)  ] as [number, number],
  syria:   [svgX(37),    svgY(34)  ] as [number, number],
  iraq:    [svgX(44),    svgY(31)  ] as [number, number],
  tehran:  [svgX(51.4),  svgY(35.7)] as [number, number],
  telAviv: [svgX(34.8),  svgY(32.1)] as [number, number],
  kuwait:  [svgX(47.9),  svgY(29.3)] as [number, number],
  riyadh:  [svgX(46.7),  svgY(24.6)] as [number, number],
  dubai:   [svgX(55.3),  svgY(25.2)] as [number, number],
  muscat:  [svgX(58.6),  svgY(23.6)] as [number, number],
  hormuz:  [svgX(56.5),  svgY(26.6)] as [number, number],
  gulfMid: [svgX(51.5),  svgY(27.5)] as [number, number],
};

// Aircraft route waypoints
const ROUTE = [
  PT.med, PT.cyprus, PT.syria, PT.iraq, PT.kuwait, PT.gulfMid, PT.hormuz,
].map(([x, y]) => `${x},${y}`).join(" ");

const CITIES: { key: keyof typeof PT; label: string; color: string; anchor: "start" | "end" }[] = [
  { key: "tehran",  label: "TEHERÁN",  color: "#d34b47", anchor: "start" },
  { key: "telAviv", label: "TEL AVIV", color: "#d6a24a", anchor: "start" },
  { key: "kuwait",  label: "KUWAIT",   color: "#58b8c8", anchor: "end"   },
  { key: "riyadh",  label: "RIYADH",   color: "#58b8c8", anchor: "end"   },
  { key: "dubai",   label: "DUBAI",    color: "#58b8c8", anchor: "start" },
  { key: "muscat",  label: "MASCATE",  color: "#58b8c8", anchor: "start" },
];

export default function CenterPanel() {
  const { metrics, alerts, modelComparison, threatLevel, chartSeries } = useExperienceStore();

  const bestModel  = modelComparison.reduce((a, b) => (b.f1 > a.f1 ? b : a), modelComparison[0]);
  const confidence = Math.round((bestModel?.rocAuc ?? bestModel?.f1 ?? 0) * 100);
  const casualties = Math.round((chartSeries.fatalities.at(-1) ?? 0));

  const riskColor =
    threatLevel === "CRITICAL" ? "text-critical-500" :
    threatLevel === "CAUTION" ? "text-caution-500"  : "text-system-500";

  const [hx, hy] = PT.hormuz;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-white/8 bg-graphite-900">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="text-[10px] tracking-[0.28em] text-white/55">
          TEATRO OPERACIONAL · ESTRECHO DE HORMUZ
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-critical-500" />
          <span className="font-mono text-[9px] tracking-[0.3em] text-critical-500">ACTIVO</span>
        </div>
      </div>

      {/* Tactical SVG map */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-graphite-950">
        <svg
          viewBox="0 0 800 480"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="cp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="cp-aoi" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#58b8c8" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#58b8c8" stopOpacity="0"    />
            </radialGradient>
            <radialGradient id="cp-radar-sweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#58b8c8" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#58b8c8" stopOpacity="0"    />
            </radialGradient>
            <clipPath id="cp-radar-clip">
              <circle cx={hx} cy={hy} r="80" />
            </clipPath>
            <style>{`
              .aoi-ring-2 { animation: aoi-pulse 2.8s ease-in-out infinite; }
              .aoi-ring-3 { animation: aoi-pulse 2.8s ease-in-out infinite 0.9s; }
              @keyframes aoi-pulse {
                0%, 100% { opacity: 0.12; }
                50%       { opacity: 0.45; }
              }
              .radar-sweep { animation: radar-rot 4s linear infinite; transform-origin: ${hx}px ${hy}px; }
              @keyframes radar-rot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
          </defs>

          {/* Background grid */}
          <rect width="800" height="480" fill="url(#cp-grid)" />

          {/* Lat/lon reference grid (every ~5° in SVG space) */}
          {[20, 25, 30, 35, 40].map((lat) => (
            <line key={`lat${lat}`}
              x1="0" y1={svgY(lat)} x2="800" y2={svgY(lat)}
              stroke="rgba(88,184,200,0.055)" strokeWidth="0.5" strokeDasharray="3 8" />
          ))}
          {[20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70].map((lon) => (
            <line key={`lon${lon}`}
              x1={svgX(lon)} y1="0" x2={svgX(lon)} y2="480"
              stroke="rgba(88,184,200,0.055)" strokeWidth="0.5" strokeDasharray="3 8" />
          ))}

          {/* Persian Gulf — simplified water body */}
          <ellipse cx="494" cy="252" rx="88" ry="28"
            fill="rgba(88,184,200,0.06)" stroke="rgba(88,184,200,0.18)" strokeWidth="0.8" />

          {/* Red Sea hint */}
          <line x1="135" y1="195" x2="82" y2="370"
            stroke="rgba(88,184,200,0.10)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Threat zone: Iran */}
          <circle cx={svgX(53)} cy={svgY(33)} r="95"
            fill="rgba(211,75,71,0.04)" stroke="rgba(211,75,71,0.16)"
            strokeWidth="0.7" strokeDasharray="4 3" />

          {/* Threat zone: Israel / Lebanon */}
          <circle cx={svgX(35)} cy={svgY(31.5)} r="52"
            fill="rgba(214,162,74,0.04)" stroke="rgba(214,162,74,0.14)"
            strokeWidth="0.7" strokeDasharray="4 3" />

          {/* Aircraft route: Mediterranean → Hormuz */}
          <polyline points={ROUTE}
            fill="none" stroke="rgba(88,184,200,0.45)"
            strokeWidth="1.2" strokeDasharray="5 4" />

          {/* Route start dot */}
          <circle cx={PT.med[0]} cy={PT.med[1]} r="2.5"
            fill="rgba(88,184,200,0.55)" />

          {/* Cross-target line: Tehran ↔ Tel Aviv */}
          <line
            x1={PT.tehran[0]}  y1={PT.tehran[1]}
            x2={PT.telAviv[0]} y2={PT.telAviv[1]}
            stroke="rgba(211,75,71,0.22)" strokeWidth="0.8" strokeDasharray="3 5" />

          {/* AOI glow at Hormuz */}
          <circle cx={hx} cy={hy} r="32" fill="url(#cp-aoi)" />

          {/* Radar sweep sector — 60° wedge rotating around Hormuz */}
          <g clipPath="url(#cp-radar-clip)">
            <path
              className="radar-sweep"
              d={`M ${hx} ${hy} L ${hx + 80} ${hy} A 80 80 0 0 1 ${hx + 80 * Math.cos(Math.PI / 3)} ${hy + 80 * Math.sin(Math.PI / 3)} Z`}
              fill="url(#cp-radar-sweep)"
              opacity="0.6"
            />
          </g>

          {/* AOI rings */}
          <circle cx={hx} cy={hy} r="10"
            fill="rgba(88,184,200,0.15)" stroke="rgba(88,184,200,0.75)" strokeWidth="1.2" />
          <circle cx={hx} cy={hy} r="22" className="aoi-ring-2"
            fill="none" stroke="rgba(88,184,200,0.5)" strokeWidth="0.8" strokeDasharray="3 2" />
          <circle cx={hx} cy={hy} r="38" className="aoi-ring-3"
            fill="none" stroke="rgba(88,184,200,0.3)" strokeWidth="0.5" strokeDasharray="2 4" />

          {/* Hormuz label */}
          <text x={hx + 46} y={hy + 4}
            fontSize="8.5" fill="rgba(88,184,200,0.85)" letterSpacing="2.5"
            fontFamily="'IBM Plex Mono', monospace">HORMUZ STRAIT</text>

          {/* City markers */}
          {CITIES.map(({ key, label, color, anchor }) => {
            const [cx, cy] = PT[key];
            const dx = anchor === "start" ? 11 : -11;
            return (
              <g key={key}>
                <circle cx={cx} cy={cy} r="3.5" fill={color} opacity="0.85" />
                <circle cx={cx} cy={cy} r="7" fill="none" stroke={color} strokeWidth="0.6" opacity="0.35" />
                <text
                  x={cx + dx} y={cy + 4}
                  fontSize="8" fill={color} opacity="0.70"
                  letterSpacing="2" textAnchor={anchor}
                  fontFamily="'IBM Plex Mono', monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Range rings around Tehran */}
          <circle cx={PT.tehran[0]} cy={PT.tehran[1]} r="40"
            fill="none" stroke="rgba(211,75,71,0.12)" strokeWidth="0.6" strokeDasharray="2 6" />

          {/* Map border */}
          <rect width="800" height="480" fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </svg>
      </div>

      {/* Metrics strip */}
      <div className="grid shrink-0 grid-cols-4 divide-x divide-white/8 border-t border-white/8">
        <MetricBox
          label="EVENTOS LETALES"
          value={casualties > 0 ? casualties.toLocaleString() : "--"}
          sub="mayo test"
          valueClass="text-critical-500"
        />
        <MetricBox
          label="MODELO PRINCIPAL"
          value="LOGREG"
          sub="L1 core"
          valueClass="text-system-500"
          small
        />
        <MetricBox
          label="ROC-AUC"
          value={`${confidence}%`}
          sub="ranking"
          valueClass={riskColor}
        />
        <MetricBox
          label="RECALL"
          value={`${Math.round((bestModel?.recall ?? 0) * 100)}%`}
          sub="letalidad"
          valueClass="text-caution-500"
        />
      </div>
    </div>
  );
}

function MetricBox({
  label, value, sub, valueClass, small = false,
}: {
  label: string; value: string; sub: string; valueClass: string; small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3 text-center">
      <div className="text-[8.5px] tracking-[0.22em] text-white/40">{label}</div>
      <div className={`font-mono mt-1 font-medium leading-tight ${small ? "text-[16px]" : "text-[22px]"} ${valueClass}`}>
        {value}
      </div>
      <div className="text-[8px] tracking-[0.18em] text-white/28">{sub}</div>
    </div>
  );
}
