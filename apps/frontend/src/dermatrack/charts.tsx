import type { DayLog, ForecastDay, Lang, Med, TreatmentEffect, TriggerInsight } from "./data";
import { fmtDay } from "./i18n";
import { Pill } from "./ui";

type Pt = [number, number];

function smoothPath(points: Pt[]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cx = (p0[0] + p1[0]) / 2;
    d += ` Q${cx},${p0[1]} ${cx},${(p0[1] + p1[1]) / 2} T${p1[0]},${p1[1]}`;
  }
  return d;
}

export interface SCORADChartProps {
  days: DayLog[];
  height?: number;
  width?: number;
  highlightToday?: boolean;
}

export function SCORADChart({ days, height = 130, width = 340, highlightToday = true }: SCORADChartProps) {
  const pad = { l: 28, r: 12, t: 14, b: 22 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const max = 40;
  const min = 8;
  const xs = days.map((_, i) => pad.l + (i / (days.length - 1)) * w);
  const ys = days.map((d) => pad.t + (1 - (d.scorad - min) / (max - min)) * h);
  const pts: Pt[] = xs.map((x, i) => [x, ys[i]]);
  const areaPath = `${smoothPath(pts)} L${xs[xs.length - 1]},${pad.t + h} L${xs[0]},${pad.t + h} Z`;
  const todayIdx = days.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="scoradFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sage)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--sage)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[10, 20, 30, 40].map((v) => {
        const y = pad.t + (1 - (v - min) / (max - min)) * h;
        return (
          <g key={v}>
            <line x1={pad.l} y1={y} x2={pad.l + w} y2={y} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="2 4" />
            <text x={pad.l - 6} y={y + 3} fontSize={9} textAnchor="end" fill="var(--ink-3)" fontFamily="var(--font-mono)">
              {v}
            </text>
          </g>
        );
      })}
      <rect
        x={pad.l}
        y={pad.t + (1 - (28 - min) / (max - min)) * h}
        width={w}
        height={((28 - 18) / (max - min)) * h}
        fill="oklch(0.93 0.04 80)"
        opacity={0.55}
      />
      <path d={areaPath} fill="url(#scoradFill)" />
      <path d={smoothPath(pts)} stroke="var(--sage-d)" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {highlightToday && (
        <g>
          <circle cx={xs[todayIdx]} cy={ys[todayIdx]} r={9} fill="var(--sage-d)" opacity={0.18} />
          <circle cx={xs[todayIdx]} cy={ys[todayIdx]} r={4} fill="var(--sage-d)" />
          <circle cx={xs[todayIdx]} cy={ys[todayIdx]} r={2} fill="white" />
        </g>
      )}
      {days.map((d, i) =>
        i % 5 === 0 || i === days.length - 1 ? (
          <text
            key={i}
            x={xs[i]}
            y={pad.t + h + 14}
            fontSize={9}
            textAnchor="middle"
            fill="var(--ink-3)"
            fontFamily="var(--font-mono)"
          >
            {String(d.date.getDate()).padStart(2, "0")}.
          </text>
        ) : null,
      )}
    </svg>
  );
}

export interface RiskGaugeProps {
  value: number;
  label?: string;
  size?: number;
}

export function RiskGauge({ value, label, size = 140 }: RiskGaugeProps) {
  const cx = size / 2;
  const cy = size / 2 + 8;
  const r = size / 2 - 14;
  const startA = Math.PI * 1.0;
  const endA = Math.PI * 2.0;
  const a = startA + (endA - startA) * value;

  const arc = (a0: number, a1: number, color: string, sw: number) => {
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    return (
      <path
        d={`M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1}`}
        stroke={color}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
      />
    );
  };
  return (
    <svg viewBox={`0 0 ${size} ${size * 0.78}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="oklch(0.78 0.06 155)" />
          <stop offset="0.5" stopColor="oklch(0.78 0.10 70)" />
          <stop offset="1" stopColor="oklch(0.66 0.18 25)" />
        </linearGradient>
      </defs>
      {arc(startA, endA, "var(--line)", 10)}
      {arc(startA, a, "url(#riskGrad)", 10)}
      <line
        x1={cx}
        y1={cy}
        x2={cx + (r - 4) * Math.cos(a)}
        y2={cy + (r - 4) * Math.sin(a)}
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={5} fill="var(--ink)" />
      <text
        x={cx}
        y={cy - 16}
        fontSize={34}
        fontWeight={700}
        textAnchor="middle"
        fill="var(--ink)"
        fontFamily="var(--font-mono)"
        letterSpacing={-1}
      >
        {Math.round(value * 100)}%
      </text>
      <text x={cx} y={cy + 22} fontSize={10} textAnchor="middle" fill="var(--ink-3)" letterSpacing={2}>
        {(label || "").toUpperCase()}
      </text>
    </svg>
  );
}

export interface MiniSparkProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function MiniSpark({ values, width = 72, height = 24, color = "var(--sage-d)" }: MiniSparkProps) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const xs = values.map((_, i) => (i / (values.length - 1)) * width);
  const ys = values.map((v) => height - ((v - min) / (max - min || 1)) * height);
  return (
    <svg viewBox={`0 0 ${width} ${height + 2}`} width={width} height={height + 2} style={{ display: "block" }}>
      <path d={smoothPath(xs.map((x, i) => [x, ys[i] + 1]))} stroke={color} strokeWidth={1.5} fill="none" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1] + 1} r={2} fill={color} />
    </svg>
  );
}

export interface RankedBarsProps {
  items: TriggerInsight[];
  lang?: Lang;
}

export function RankedBars({ items, lang = "de" }: RankedBarsProps) {
  const colors: Record<string, string> = {
    food: "var(--clay)",
    env: "oklch(0.72 0.08 200)",
    lifestyle: "oklch(0.74 0.06 280)",
  };
  const tagColor: Record<string, "clay" | "sage" | "neutral"> = { food: "clay", env: "sage", lifestyle: "neutral" };
  const kindLabel: Record<string, { de: string; en: string }> = {
    food: { de: "Essen", en: "Food" },
    env: { de: "Umwelt", en: "Env" },
    lifestyle: { de: "Lebensstil", en: "Lifestyle" },
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span className="num" style={{ fontSize: 11, color: "var(--ink-3)", width: 14 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.label[lang]}
              </span>
              <Pill size="sm" color={tagColor[t.kind] || "sage"}>
                {kindLabel[t.kind][lang]}
              </Pill>
            </div>
            <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>
              {t.confidence}%
            </span>
          </div>
          <div style={{ position: "relative", height: 8, background: "var(--line-2)", borderRadius: 999 }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${t.confidence}%`,
                background: colors[t.kind] || "var(--sage)",
                borderRadius: 999,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>
              {lang === "de" ? "Latenz" : "Lag"} ~{t.lag}h
            </span>
            <span>
              +{t.deltaScorad.toFixed(1)} SCORAD ·{" "}
              {t.evidence === 1 ? (lang === "de" ? "1 Fall" : "1 case") : `${t.evidence} ${lang === "de" ? "Fälle" : "cases"}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface HeatmapCalendarProps {
  days: DayLog[];
  lang?: Lang;
}

export function HeatmapCalendar({ days, lang = "de" }: HeatmapCalendarProps) {
  const lanes = [
    { id: "wine", label: { de: "Rotwein", en: "Wine" }, get: (d: DayLog) => (d.foods.find((f) => f.id === "rotwein") ? 1 : 0) },
    {
      id: "cheese",
      label: { de: "Käse", en: "Cheese" },
      get: (d: DayLog) => (d.foods.find((f) => f.id === "reifer-kaese") ? 1 : 0),
    },
    { id: "birch", label: { de: "Birke", en: "Birch" }, get: (d: DayLog) => d.birchPollen / 4 },
    { id: "sleep", label: { de: "<6h Schlaf", en: "Sleep <6h" }, get: (d: DayLog) => (d.sleepH < 6 ? 1 : 0) },
    { id: "flare", label: { de: "Flare", en: "Flare" }, get: (d: DayLog) => Math.max(0, (d.scorad - 18) / 22) },
  ];
  const cell = 9;
  const gap = 3;
  const W = days.length * (cell + gap);
  const H = lanes.length * (cell + gap) + 18;
  const colorOf = (laneIdx: number, v: number) => {
    if (v === 0) return "var(--line-2)";
    if (laneIdx === 4) return `oklch(${0.86 - v * 0.18} ${0.05 + v * 0.13} ${30 + (1 - v) * 90})`;
    const hues = [55, 55, 130, 280];
    return `oklch(${0.85 - v * 0.18} ${0.04 + v * 0.10} ${hues[laneIdx]})`;
  };
  return (
    <div>
      <svg viewBox={`-58 0 ${W + 58} ${H + 6}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        {lanes.map((lane, i) => (
          <g key={lane.id}>
            <text
              x={-6}
              y={i * (cell + gap) + cell - 1}
              fontSize={9.5}
              textAnchor="end"
              fill="var(--ink-2)"
              dominantBaseline="middle"
            >
              {lane.label[lang]}
            </text>
            {days.map((d, j) => {
              const v = lane.get(d);
              return (
                <rect
                  key={j}
                  x={j * (cell + gap)}
                  y={i * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={2}
                  fill={colorOf(i, v)}
                />
              );
            })}
          </g>
        ))}
        {days.map((d, j) =>
          j % 5 === 0 || j === days.length - 1 ? (
            <text
              key={j}
              x={j * (cell + gap) + cell / 2}
              y={lanes.length * (cell + gap) + 12}
              fontSize={8.5}
              textAnchor="middle"
              fill="var(--ink-3)"
              fontFamily="var(--font-mono)"
            >
              {String(d.date.getDate()).padStart(2, "0")}.
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export interface FlareForecastChartProps {
  forecast: ForecastDay[];
  lang?: Lang;
}

export function FlareForecastChart({ forecast, lang = "de" }: FlareForecastChartProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {forecast.map((f, i) => {
        const h = Math.round(f.risk * 100);
        const color =
          f.risk > 0.6 ? "oklch(0.66 0.18 25)" : f.risk > 0.4 ? "oklch(0.78 0.12 60)" : "oklch(0.78 0.05 155)";
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ height: 80, width: "100%", position: "relative", display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(8, h)}%`,
                  background: color,
                  borderRadius: 8,
                  position: "relative",
                }}
              >
                <span
                  className="num"
                  style={{ position: "absolute", top: -16, left: 0, right: 0, textAlign: "center", fontSize: 10, color: "var(--ink-2)" }}
                >
                  {h}%
                </span>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
              {fmtDay(f.date, lang).slice(0, 2)}
            </div>
            <div className="num" style={{ fontSize: 10, color: "var(--ink-2)" }}>
              {String(f.date.getDate()).padStart(2, "0")}.
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface WeatherStripProps {
  forecast: ForecastDay[];
  lang?: Lang;
}

export function WeatherStrip({ forecast, lang = "de" }: WeatherStripProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--ink-2)",
      }}
    >
      {forecast.map((f, i) => (
        <div key={i} style={{ textAlign: "center", display: "grid", gap: 2 }}>
          <div>{f.tempC}°</div>
          <div title={lang === "de" ? "Birke" : "Birch"} style={{ display: "flex", justifyContent: "center", gap: 1 }}>
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                style={{
                  width: 4,
                  height: 8,
                  borderRadius: 2,
                  background: n <= f.birch ? "oklch(0.74 0.10 130)" : "var(--line)",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface EffectivenessChartProps {
  treatments: TreatmentEffect[];
  meds: Med[];
  lang?: Lang;
}

export function EffectivenessChart({ treatments, meds, lang = "de" }: EffectivenessChartProps) {
  const sorted = treatments.slice().sort((a, b) => a.deltaScorad - b.deltaScorad);
  const max = 4;
  const kindLabel: Record<string, string> = {
    kortison: lang === "de" ? "Kortison" : "Steroid",
    calcineurin: "Calcineurin",
    pflege: lang === "de" ? "Pflege" : "Emollient",
    oral: lang === "de" ? "Oral" : "Oral",
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {sorted.map((t) => {
        const med = meds.find((m) => m.id === t.medId);
        if (!med) return null;
        const w = Math.abs(t.deltaScorad / max) * 100;
        const isStrong = Math.abs(t.deltaScorad) > 1.5;
        const color =
          t.deltaScorad < -2 ? "var(--sage-d)" : t.deltaScorad < -1 ? "var(--sage)" : "var(--clay-2)";
        return (
          <div key={t.medId}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                {med[lang]}
                <Pill size="sm" color={isStrong ? "sage" : "neutral"}>
                  {kindLabel[med.kind]}
                </Pill>
              </div>
              <span className="num" style={{ fontSize: 13, fontWeight: 700, color: "var(--sage-d)" }}>
                {t.deltaScorad.toFixed(1)}
              </span>
            </div>
            <div style={{ position: "relative", height: 10, background: "var(--line-2)", borderRadius: 999 }}>
              <div
                style={{
                  position: "absolute",
                  right: "50%",
                  top: 0,
                  bottom: 0,
                  width: `${w / 2}%`,
                  background: color,
                  borderRadius: 999,
                }}
              />
              <div style={{ position: "absolute", left: "50%", top: -4, bottom: -4, width: 1.5, background: "var(--ink-3)" }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontSize: 11,
                color: "var(--ink-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>
                {t.applications} {lang === "de" ? "Anwendungen" : "applications"}
              </span>
              <span>
                {lang === "de" ? "Wirkbeginn" : "Onset"} {t.daysToOnset}d
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
