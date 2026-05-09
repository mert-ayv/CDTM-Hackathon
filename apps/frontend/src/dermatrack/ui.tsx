import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children?: ReactNode;
  style?: CSSProperties;
  padding?: number | string;
  onClick?: () => void;
  accent?: string;
}

export function Card({ children, style, padding = 16, onClick, accent }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-card)",
        padding,
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface SectionTitleProps {
  children?: ReactNode;
  action?: ReactNode;
  sub?: ReactNode;
}

export function SectionTitle({ children, action, sub }: SectionTitleProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 4px", marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>}
      </div>
      {action && <div style={{ fontSize: 13, color: "var(--sage-d)", fontWeight: 600 }}>{action}</div>}
    </div>
  );
}

export type ButtonKind = "primary" | "sage" | "clay" | "ghost" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children?: ReactNode;
  kind?: ButtonKind;
  size?: ButtonSize;
  onClick?: () => void;
  full?: boolean;
  icon?: ReactNode;
  style?: CSSProperties;
}

export function Button({ children, kind = "primary", size = "md", onClick, full, icon, style }: ButtonProps) {
  const sizes: Record<ButtonSize, CSSProperties> = {
    sm: { padding: "8px 12px", fontSize: 13, height: 34, borderRadius: 12, gap: 6 },
    md: { padding: "12px 16px", fontSize: 14, height: 44, borderRadius: 14, gap: 8 },
    lg: { padding: "14px 20px", fontSize: 15, height: 52, borderRadius: 16, gap: 10 },
  };
  const kinds: Record<ButtonKind, CSSProperties> = {
    primary: { background: "var(--ink)", color: "var(--bg)", border: "1px solid var(--ink)" },
    sage: { background: "var(--sage)", color: "var(--ink)", border: "1px solid color-mix(in oklch, var(--sage) 80%, black)" },
    clay: { background: "var(--clay)", color: "#fff", border: "1px solid color-mix(in oklch, var(--clay) 75%, black)" },
    ghost: { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" },
    soft: { background: "var(--bg-2)", color: "var(--ink)", border: "1px solid var(--line)" },
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        transition: "transform 80ms ease, opacity 80ms ease",
        width: full ? "100%" : undefined,
        ...sizes[size],
        ...kinds[kind],
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
      {icon && children ? <span style={{ width: 0 }} /> : null}
      {children}
    </button>
  );
}

export type PillColor = "sage" | "clay" | "ink" | "red" | "warn" | "neutral";

export interface PillProps {
  children?: ReactNode;
  color?: PillColor;
  size?: "sm" | "md";
  style?: CSSProperties;
}

export function Pill({ children, color = "sage", size = "md", style }: PillProps) {
  const palette: Record<PillColor, { bg: string; fg: string }> = {
    sage: { bg: "color-mix(in oklch, var(--sage) 22%, var(--card))", fg: "var(--sage-d)" },
    clay: { bg: "color-mix(in oklch, var(--clay) 22%, var(--card))", fg: "var(--clay-d)" },
    ink: { bg: "var(--bg-2)", fg: "var(--ink)" },
    red: { bg: "oklch(0.94 0.05 25)", fg: "oklch(0.50 0.16 25)" },
    warn: { bg: "oklch(0.95 0.06 75)", fg: "oklch(0.48 0.13 60)" },
    neutral: { bg: "var(--line-2)", fg: "var(--ink-2)" },
  };
  const c = palette[color] || palette.sage;
  const s: CSSProperties =
    size === "sm" ? { fontSize: 11, padding: "3px 8px", height: 22 } : { fontSize: 12, padding: "4px 10px", height: 24 };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: c.bg,
        color: c.fg,
        fontWeight: 600,
        borderRadius: 999,
        ...s,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export interface ChipProps {
  active?: boolean;
  children?: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  style?: CSSProperties;
}

export function Chip({ active, children, onClick, icon, style }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid " + (active ? "var(--ink)" : "var(--line)"),
        background: active ? "var(--ink)" : "var(--card)",
        color: active ? "var(--bg)" : "var(--ink)",
        height: 34,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export interface ProgressRingProps {
  size?: number;
  value: number;
  max?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}

export function ProgressRing({
  size = 112,
  value,
  max = 50,
  stroke = 9,
  color = "var(--sage)",
  track = "var(--line)",
  children,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const dash = c * pct;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
}

export interface SevDotProps {
  value: number;
  size?: number;
}

export function SevDot({ value, size = 8 }: SevDotProps) {
  const v = Math.max(0, Math.min(10, value));
  const hue = 155 - v * 12;
  const lightness = 0.78 - v * 0.014;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        background: `oklch(${lightness} ${0.04 + v * 0.013} ${hue})`,
      }}
    />
  );
}
