import type { DayLog, Lang } from "../data";
import { fmtDay } from "../i18n";

export interface DayStripProps {
  days: DayLog[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  lang: Lang;
  count?: number;
}

function severityHue(scorad: number) {
  if (scorad < 18) return "var(--sage)";
  if (scorad < 28) return "oklch(0.78 0.12 60)";
  return "oklch(0.66 0.18 25)";
}

export function DayStrip({ days, selectedIndex, onSelect, lang, count = 14 }: DayStripProps) {
  const slice = days.slice(-count);
  const baseIdx = days.length - slice.length;

  return (
    <div className="card" style={{ padding: 14, marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          padding: "0 4px",
        }}
      >
        <div className="stat-label">{lang === "de" ? "Tageslogbuch · 14 Tage" : "Day log · 14 days"}</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {lang === "de" ? "Tippe zum Bearbeiten" : "Tap to edit"}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${slice.length}, 1fr)`,
          gap: 6,
        }}
      >
        {slice.map((d, i) => {
          const idx = baseIdx + i;
          const isSelected = idx === selectedIndex;
          const isToday = i === slice.length - 1;
          const color = severityHue(d.scorad);
          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "10px 4px 8px",
                borderRadius: 12,
                border: "1px solid " + (isSelected ? "var(--ink)" : "var(--line)"),
                background: isSelected ? "var(--ink)" : isToday ? "var(--bg-2)" : "var(--card)",
                color: isSelected ? "var(--bg)" : "var(--ink-2)",
                cursor: "pointer",
                transition: "transform 80ms ease",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: isSelected ? "var(--bg-2)" : "var(--ink-3)",
                }}
              >
                {fmtDay(d.date, lang).slice(0, 2)}
              </span>
              <span
                className="num"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: isSelected ? "var(--bg)" : "var(--ink)",
                }}
              >
                {String(d.date.getDate()).padStart(2, "0")}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: isSelected ? "rgba(255,255,255,0.12)" : color,
                  color: isSelected ? "var(--bg)" : "var(--ink)",
                  minWidth: 26,
                }}
              >
                {d.scorad.toFixed(0)}
              </span>
              <div style={{ display: "flex", gap: 3, marginTop: 1, height: 5 }}>
                <span
                  title={lang === "de" ? "Foto" : "Photo"}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: d.hasPhoto
                      ? isSelected
                        ? "var(--bg)"
                        : "var(--clay-d)"
                      : "transparent",
                  }}
                />
                <span
                  title={lang === "de" ? "Sprache" : "Voice"}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: d.voiceNote
                      ? isSelected
                        ? "var(--bg)"
                        : "var(--sage-d)"
                      : "transparent",
                  }}
                />
                <span
                  title={lang === "de" ? "Mahlzeiten" : "Meals"}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background:
                      d.foods.length > 0
                        ? isSelected
                          ? "var(--bg)"
                          : "var(--ink-2)"
                        : "transparent",
                  }}
                />
              </div>
              {isToday && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    fontSize: 8,
                    fontWeight: 700,
                    color: isSelected ? "var(--bg)" : "var(--sage-d)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.04em",
                  }}
                >
                  •
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
