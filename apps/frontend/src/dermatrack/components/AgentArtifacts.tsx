import { useState, type ReactNode } from "react";
import type { SaveResult } from "../api";
import { SCORADChart } from "../charts";
import type { DermaTrackData, Lang } from "../data";
import { fmtDate } from "../i18n";
import { Icon } from "../icons";
import type { Route } from "../shell";

// ── ConfirmCard: proposal → confirmed (with artifact + success state) ──

export interface ConfirmCardProps {
  proposal: {
    title: string;
    summary: ReactNode;
    confirmLabel: string;
    declineLabel?: string;
    icon?: ReactNode;
    accent?: string;
  };
  success: {
    title: string;
    artifact?: ReactNode;
  };
  lang: Lang;
  onConfirm?: () => Promise<SaveResult | SaveResult[]>;
}

export function ConfirmCard({ proposal, success, lang, onConfirm }: ConfirmCardProps) {
  const [state, setState] = useState<"pending" | "running" | "confirmed" | "declined">("pending");
  const [source, setSource] = useState<SaveResult["source"] | null>(null);

  const confirm = async () => {
    setState("running");
    if (!onConfirm) {
      setSource("local");
      setState("confirmed");
      return;
    }
    const result = await onConfirm();
    const results = Array.isArray(result) ? result : [result];
    setSource(results.every((item) => item.source === "backend") ? "backend" : "local");
    setState("confirmed");
  };

  if (state === "declined") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: "var(--ink-3)",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 12,
        }}
      >
        <Icon.close size={12} color="var(--ink-3)" />
        {lang === "de" ? "Abgelehnt" : "Declined"}
      </div>
    );
  }

  if (state === "confirmed") {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: "color-mix(in oklch, var(--good) 14%, var(--card))",
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "var(--good)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon.check size={11} color="#fff" />
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sage-d)" }}>
            {success.title}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            {source === "backend" ? "BACKEND SYNC" : "DEMO SAVE"}
          </span>
        </div>
        {success.artifact && <div style={{ padding: 14 }}>{success.artifact}</div>}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        ...(proposal.accent ? { borderTop: `3px solid ${proposal.accent}` } : {}),
      }}
    >
      <div style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
        {proposal.icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {proposal.icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              fontFamily: "var(--font-mono)",
              marginBottom: 4,
            }}
          >
            {lang === "de" ? "Agent-Vorschlag" : "Agent action"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.01em" }}>
            {proposal.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{proposal.summary}</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 14px",
          borderTop: "1px solid var(--line-2)",
          background: "var(--bg-2)",
        }}
      >
        <button
          onClick={() => setState("declined")}
          style={{
            padding: "7px 14px",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--card)",
            color: "var(--ink-2)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {proposal.declineLabel || (lang === "de" ? "Abbrechen" : "Cancel")}
        </button>
        <button
          onClick={confirm}
          disabled={state === "running"}
          style={{
            marginLeft: "auto",
            padding: "7px 14px",
            borderRadius: 10,
            border: "1px solid var(--ink)",
            background: "var(--ink)",
            color: "var(--bg)",
            fontSize: 12,
            fontWeight: 700,
            cursor: state === "running" ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon.check size={12} color="var(--bg)" />
          {state === "running" ? (lang === "de" ? "Synchronisiert..." : "Syncing...") : proposal.confirmLabel}
        </button>
      </div>
    </div>
  );
}

// ── ReminderArtifact ──

export interface ReminderArtifactProps {
  time: string;
  label: string;
  detail?: string;
  lang: Lang;
}

export function ReminderArtifact({ time, label, detail, lang }: ReminderArtifactProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon.bell size={18} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
          {lang === "de" ? "Heute" : "Today"} · {time}
          {detail ? ` · ${detail}` : ""}
        </div>
      </div>
      <span
        className="pill sage"
        style={{ height: 22, fontSize: 10, fontFamily: "var(--font-mono)" }}
      >
        ON
      </span>
    </div>
  );
}

// ── MealLoggedArtifact ──

export interface MealLoggedArtifactProps {
  mealLabel: string;
  foods: string[];
  flagged?: string[];
  lang: Lang;
  onRoute?: (r: Route) => void;
}

export function MealLoggedArtifact({ mealLabel, foods, flagged = [], lang, onRoute }: MealLoggedArtifactProps) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Icon.bowl size={14} color="var(--sage-d)" />
        <span style={{ fontSize: 12, fontWeight: 700 }}>{mealLabel}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {lang === "de" ? "in Tageseintrag" : "in daily entry"}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {foods.map((f) => {
          const isFlagged = flagged.includes(f);
          return (
            <span
              key={f}
              className={"pill " + (isFlagged ? "clay" : "neutral")}
              style={{ height: 22, fontSize: 11 }}
            >
              {f}
              {isFlagged && (
                <span style={{ opacity: 0.7, fontSize: 9 }}>⚠</span>
              )}
            </span>
          );
        })}
      </div>
      {onRoute && (
        <button
          onClick={() => onRoute("entry")}
          style={{
            marginTop: 10,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--sage-d)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {lang === "de" ? "Im Tageseintrag öffnen" : "Open in daily entry"}
          <Icon.arrowRight size={11} color="var(--sage-d)" />
        </button>
      )}
    </div>
  );
}

export function SyncReceipt({
  label,
  detail,
  lang,
  onRoute,
  route,
}: {
  label: string;
  detail: string;
  lang: Lang;
  onRoute?: (r: Route) => void;
  route?: Route;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 12,
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 12,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: "color-mix(in oklch, var(--sage) 28%, var(--card))",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon.check size={16} color="var(--sage-d)" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
        <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
          {detail}
        </div>
      </div>
      {onRoute && route && (
        <button
          onClick={() => onRoute(route)}
          style={{
            border: "1px solid var(--line)",
            background: "var(--card)",
            color: "var(--sage-d)",
            borderRadius: 10,
            padding: "6px 9px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {lang === "de" ? "Öffnen" : "Open"}
        </button>
      )}
    </div>
  );
}

export function FlareLoggedArtifact({
  region,
  severity,
  lang,
  onRoute,
}: {
  region: string;
  severity: number;
  lang: Lang;
  onRoute?: (r: Route) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 12,
      }}
    >
      <Icon.body size={20} color="var(--clay-d)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{region}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
          {lang === "de" ? "Juckreiz" : "Itch"} {severity}/10 · {lang === "de" ? "Körperkarte" : "body map"}
        </div>
      </div>
      {onRoute && (
        <button
          onClick={() => onRoute("skin")}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--sage-d)",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {lang === "de" ? "Ansehen →" : "View →"}
        </button>
      )}
    </div>
  );
}

export function FlareDetectiveArtifact({
  data,
  lang,
  onRoute,
}: {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
}) {
  const worst = [...data.days].sort((a, b) => b.scorad - a.scorad)[0] ?? data.today;
  const previous = data.days[Math.max(0, data.days.indexOf(worst) - 1)] ?? worst;
  const foods = previous.foods.slice(0, 3).map((food) => food[lang]);
  const region =
    data.BODY_REGIONS.find((item) => item.id === worst.regions[0]?.regionId)?.[lang] ??
    (lang === "de" ? "Ellenbeugen" : "elbow flexures");

  const evidence = [
    {
      label: lang === "de" ? "Vorabend-Ernährung" : "Previous evening food",
      value: foods.length ? foods.join(" + ") : lang === "de" ? "Keine Mahlzeit geloggt" : "No meal logged",
      icon: <Icon.bowl size={13} color="var(--clay-d)" />,
    },
    {
      label: lang === "de" ? "Schlafdefizit" : "Sleep deficit",
      value: `${worst.sleepH.toFixed(1)}h · ${lang === "de" ? "Schlafverlust" : "sleep loss"} ${worst.sleepLoss}/10`,
      icon: <Icon.moon size={13} color="var(--sage-d)" />,
    },
    {
      label: lang === "de" ? "Umwelt" : "Environment",
      value: `${lang === "de" ? "Birke" : "Birch"} ${worst.birchPollen}/4 · ${worst.humidity}% ${lang === "de" ? "Feuchte" : "humidity"}`,
      icon: <Icon.leaf size={13} color="var(--sage-d)" />,
    },
    {
      label: lang === "de" ? "Foto + Körperkarte" : "Photo + body map",
      value: `${region} · ${lang === "de" ? "Juckreiz" : "itch"} ${worst.itch}/10`,
      icon: <Icon.camera size={13} color="var(--clay-d)" />,
    },
  ];

  const hypotheses = [
    {
      name: lang === "de" ? "Histamin-Stack" : "Histamine stack",
      score: 84,
      note: lang === "de" ? "Essen + Schlaf passen zeitlich" : "Food + sleep line up in time",
    },
    {
      name: lang === "de" ? "Schlafschuld" : "Sleep debt",
      score: 72,
      note: lang === "de" ? "3 schlechte Nächte vor Peak" : "3 short nights before peak",
    },
    {
      name: lang === "de" ? "Birkenpollen" : "Birch pollen",
      score: 67,
      note: lang === "de" ? "Regionaler Spike am selben Tag" : "Regional spike same day",
    },
  ];

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid var(--line-2)",
          background: "linear-gradient(135deg, color-mix(in oklch, var(--sage) 14%, var(--card)), var(--card))",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: "var(--ink)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon.sparkle size={17} color="var(--bg)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            {lang === "de" ? "Agent-Untersuchung" : "Agent investigation"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 850, marginTop: 2 }}>
            {lang === "de" ? "Flare Detective" : "Flare Detective"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num" style={{ fontSize: 24, fontWeight: 850, color: "var(--clay-d)" }}>
            {worst.scorad.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            {fmtDate(worst.date, lang)}
          </div>
        </div>
      </div>

      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          {evidence.map((item) => (
            <div
              key={item.label}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 10,
                background: "var(--bg-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                {item.icon}
                <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {item.label}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 750, lineHeight: 1.3 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          {hypotheses.map((hypothesis) => (
            <div
              key={hypothesis.name}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 10,
                background: "var(--card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{hypothesis.name}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 850, color: "var(--sage-d)" }}>
                  {hypothesis.score}%
                </div>
              </div>
              <div
                aria-hidden
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "var(--line-2)",
                  overflow: "hidden",
                  margin: "8px 0",
                }}
              >
                <div
                  style={{
                    width: `${hypothesis.score}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg, var(--sage-d), var(--clay))",
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-3)", lineHeight: 1.35 }}>{hypothesis.note}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 10,
            borderTop: "1px solid var(--line-2)",
            paddingTop: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontWeight: 800, marginBottom: 4 }}>
              {lang === "de" ? "Gegenbeweis" : "Counter-evidence"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45 }}>
              {lang === "de"
                ? "Kein Hausstaub-Flag und keine neue Pflege an diesem Tag. Der Agent priorisiert daher Essen, Schlaf und Pollen."
                : "No dust flag and no new skincare that day. The agent is prioritizing food, sleep and pollen."}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontWeight: 800, marginBottom: 4 }}>
              {lang === "de" ? "Nächster Test" : "Next test"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45 }}>
              {lang === "de"
                ? "48h histaminarm bei hohem Pollenrisiko. Wenn SCORAD fällt, sinkt die Pollen-Hypothese."
                : "48h low histamine during high pollen. If SCORAD falls, the pollen hypothesis drops."}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onRoute("triggers")}
            style={{
              border: "1px solid var(--ink)",
              background: "var(--ink)",
              color: "var(--bg)",
              borderRadius: 10,
              padding: "8px 11px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {lang === "de" ? "Trigger öffnen" : "Open triggers"}
          </button>
          <button
            onClick={() => onRoute("entry")}
            style={{
              border: "1px solid var(--line)",
              background: "var(--bg-2)",
              color: "var(--sage-d)",
              borderRadius: 10,
              padding: "8px 11px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {lang === "de" ? "Testplan loggen" : "Log test plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LetterPreviewArtifact: mini A4 inline ──

export interface LetterPreviewArtifactProps {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
}

export function LetterPreviewArtifact({ data, lang, onRoute }: LetterPreviewArtifactProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: 14,
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      {/* Mini A4 page */}
      <button
        onClick={() => onRoute("letter")}
        style={{
          background: "#fff",
          color: "#1a1a1a",
          border: "1px solid var(--line)",
          borderRadius: 10,
          boxShadow: "0 12px 24px -10px rgba(20,28,40,0.18)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          cursor: "pointer",
          textAlign: "left",
          aspectRatio: "1 / 1.41",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "oklch(0.55 0.10 155)" }} />
          <span
            style={{
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#666",
            }}
          >
            DermaTrack · {lang === "de" ? "Bericht" : "Report"}
          </span>
        </div>
        <div
          className="serif"
          style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.15, fontStyle: "normal" }}
        >
          Atopische Dermatitis · 30-Tage-Verlauf
        </div>
        <div
          style={{
            fontSize: 7,
            color: "#888",
            fontFamily: "var(--font-mono)",
          }}
        >
          L.K. · *1994 · 10.04.–09.05.2026 · Dr. Lehmann
        </div>
        <div style={{ height: 1, background: "#222" }} />
        <div
          style={{
            fontSize: 7,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: "#444",
          }}
        >
          {lang === "de" ? "SCORAD-Verlauf" : "SCORAD trend"}
        </div>
        <div style={{ background: "#fafafa", borderRadius: 4, padding: 4 }}>
          <SCORADChart days={data.days} height={70} width={220} highlightToday={false} />
        </div>
        <div style={{ display: "flex", gap: 6, fontSize: 6, color: "#666", fontFamily: "var(--font-mono)" }}>
          <span>⌀ 22.4</span>
          <span>min 14.6</span>
          <span>max 31.2</span>
          <span>Δ −4.1</span>
        </div>
        <div
          style={{
            fontSize: 7,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: "#444",
            marginTop: 2,
          }}
        >
          {lang === "de" ? "Top Trigger" : "Top triggers"}
        </div>
        <div style={{ display: "grid", gap: 2 }}>
          {data.triggers.slice(0, 3).map((tr, i) => (
            <div key={i} style={{ display: "flex", gap: 6, fontSize: 7 }}>
              <span style={{ width: 8, fontFamily: "var(--font-mono)", color: "#888" }}>{i + 1}.</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{tr.label[lang]}</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#666" }}>+{tr.deltaScorad.toFixed(1)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{tr.confidence}%</span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "auto",
            paddingTop: 6,
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 6,
            color: "#999",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>v0.4.2 · 09.05.2026</span>
          <span>SHA 4f8a…d3c1</span>
        </div>
      </button>

      {/* Side panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            fontFamily: "var(--font-mono)",
          }}
        >
          {lang === "de" ? "Inhalt · 5 Sektionen" : "Contents · 5 sections"}
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 12,
            color: "var(--ink-2)",
          }}
        >
          {[
            lang === "de" ? "30-Tage-SCORAD-Verlauf" : "30-day SCORAD trend",
            lang === "de" ? "Top 5 Trigger (mit Konfidenz)" : "Top 5 triggers (with confidence)",
            lang === "de" ? "Foto-Zeitachse · 6 Aufnahmen" : "Photo timeline · 6 photos",
            lang === "de" ? "Behandlungs-Wirksamkeit" : "Treatment effectiveness",
            lang === "de" ? "Lokalisationskarte · 14 Regionen" : "Body distribution · 14 regions",
          ].map((row) => (
            <li
              key={row}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Icon.check size={12} color="var(--sage-d)" />
              <span>{row}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => onRoute("letter")}
          style={{
            marginTop: "auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 10,
            background: "var(--ink)",
            color: "var(--bg)",
            border: "1px solid var(--ink)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Icon.file size={13} color="var(--bg)" />
          {lang === "de" ? "Vollbild öffnen" : "Open fullscreen"}
        </button>
      </div>
    </div>
  );
}

// ── BackfillDraftArtifact ──

export interface BackfillDraftArtifactProps {
  lang: Lang;
  onRoute?: (r: Route) => void;
}

type BackfillChipTone = "sage" | "clay" | "neutral";

function BackfillChip({ children, tone = "neutral" }: { children: ReactNode; tone?: BackfillChipTone }) {
  return (
    <span
      className={"pill " + tone}
      style={{
        height: 22,
        fontSize: 10,
        fontWeight: 800,
        fontFamily: "var(--font-mono)",
        letterSpacing: 0,
      }}
    >
      {children}
    </span>
  );
}

function BackfillRouteButton({
  icon,
  label,
  route,
  onRoute,
  primary,
}: {
  icon: ReactNode;
  label: string;
  route: Route;
  onRoute?: (r: Route) => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={() => onRoute?.(route)}
      disabled={!onRoute}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 34,
        padding: "8px 11px",
        borderRadius: 10,
        border: primary ? "1px solid var(--ink)" : "1px solid var(--line)",
        background: primary ? "var(--ink)" : "var(--card)",
        color: primary ? "var(--bg)" : "var(--sage-d)",
        fontSize: 11,
        fontWeight: 800,
        cursor: onRoute ? "pointer" : "not-allowed",
        opacity: onRoute ? 1 : 0.55,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function BackfillDraftArtifact({ lang, onRoute }: BackfillDraftArtifactProps) {
  const days = [
    {
      day: lang === "de" ? "Mo" : "Mon",
      date: "27.04",
      records: [{ label: lang === "de" ? "Fast Food" : "fast food", tone: "clay" as const }],
    },
    {
      day: lang === "de" ? "Di" : "Tue",
      date: "28.04",
      records: [
        { label: lang === "de" ? "Wenig Schlaf" : "poor sleep", tone: "sage" as const },
        { label: lang === "de" ? "Fast Food" : "fast food", tone: "clay" as const },
      ],
    },
    {
      day: lang === "de" ? "Mi" : "Wed",
      date: "29.04",
      records: [{ label: lang === "de" ? "Wenig Schlaf" : "poor sleep", tone: "sage" as const }],
    },
    {
      day: lang === "de" ? "Do" : "Thu",
      date: "30.04",
      records: [
        { label: lang === "de" ? "Ellenbogen-Flare" : "elbow flare", tone: "clay" as const },
        { label: lang === "de" ? "Wenig Schlaf" : "poor sleep", tone: "sage" as const },
      ],
    },
    {
      day: lang === "de" ? "Fr" : "Fri",
      date: "01.05",
      records: [
        { label: lang === "de" ? "Ellenbogen-Flare" : "elbow flare", tone: "clay" as const },
        { label: "mometasone", tone: "neutral" as const },
      ],
    },
    {
      day: lang === "de" ? "Sa" : "Sat",
      date: "02.05",
      records: [
        { label: "mometasone", tone: "neutral" as const },
        { label: lang === "de" ? "Wenig Schlaf" : "poor sleep", tone: "sage" as const },
      ],
    },
    {
      day: lang === "de" ? "So" : "Sun",
      date: "03.05",
      records: [{ label: lang === "de" ? "Fast Food" : "fast food", tone: "clay" as const }],
    },
  ];

  const extracted = [
    {
      icon: <Icon.bowl size={14} color="var(--clay-d)" />,
      label: lang === "de" ? "Fast Food" : "Fast food",
      value: "3x",
      detail: lang === "de" ? "Mo, Di, So" : "Mon, Tue, Sun",
    },
    {
      icon: <Icon.moon size={14} color="var(--sage-d)" />,
      label: lang === "de" ? "Schlechter Schlaf" : "Poor sleep",
      value: "4x",
      detail: lang === "de" ? "Di, Mi, Do, Sa" : "Tue, Wed, Thu, Sat",
    },
    {
      icon: <Icon.body size={14} color="var(--clay-d)" />,
      label: lang === "de" ? "Ellenbogen-Flare" : "Elbow flare",
      value: lang === "de" ? "Do/Fr" : "Thu/Fri",
      detail: lang === "de" ? "Beuge, Schub aus Erinnerung" : "flexure, flare from memory",
    },
    {
      icon: <Icon.pill size={14} color="var(--ink-3)" />,
      label: "Mometasone",
      value: lang === "de" ? "Fr/Sa" : "Fri/Sat",
      detail: lang === "de" ? "Anwendung geschätzt" : "application estimated",
    },
  ];

  const missing = [
    lang === "de" ? "Uhrzeiten für Essen und Salbe" : "Times for meals and ointment",
    lang === "de" ? "Schlafdauer in Stunden" : "Sleep duration in hours",
    lang === "de" ? "Juckreiz/Schweregrad je Tag" : "Itch/severity per day",
    lang === "de" ? "Foto-Nachweis für Do/Fr" : "Photo evidence for Thu/Fri",
  ];

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid var(--line-2)",
          background: "linear-gradient(135deg, color-mix(in oklch, var(--clay) 12%, var(--card)), var(--card))",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: "var(--ink)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon.rotate size={17} color="var(--bg)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0,
              textTransform: "uppercase",
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {lang === "de" ? "Backfill-Entwurf" : "Backfill draft"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 850, marginTop: 2 }}>
            {lang === "de" ? "Ungefähre Woche rekonstruiert" : "Approximate week reconstructed"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num" style={{ fontSize: 22, fontWeight: 850, color: "var(--clay-d)" }}>
            7d
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            27.04-03.05
          </div>
        </div>
      </div>

      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(86px, 1fr))",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          {days.map((day) => (
            <div
              key={day.day}
              style={{
                minHeight: 116,
                border: "1px solid var(--line)",
                borderRadius: 12,
                background: "var(--bg-2)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 850 }}>{day.day}</span>
                <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                  {day.date}
                </span>
              </div>
              <div style={{ display: "grid", gap: 5 }}>
                {day.records.map((record) => (
                  <span
                    key={record.label}
                    className={"pill " + record.tone}
                    style={{
                      height: "auto",
                      minHeight: 22,
                      justifyContent: "flex-start",
                      fontSize: 10,
                      lineHeight: 1.2,
                      padding: "4px 7px",
                    }}
                  >
                    {record.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--bg-2)",
            padding: 12,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.mic size={13} color="var(--sage-d)" />
            <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
              {lang === "de" ? "Quellzitat" : "Source quote"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
            {lang === "de"
              ? "Letzte Woche war ungefähr drei Mal Fast Food, vier Nächte schlechter Schlaf, Ellenbogen wurden Do/Fr schlimm, und Mometason habe ich Freitag und Samstag benutzt."
              : "Last week was roughly three fast-food meals, four nights of poor sleep, elbows got bad Thu/Fri, and I used mometasone Friday and Saturday."}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <BackfillChip tone="sage">{lang === "de" ? "geschätzt" : "estimated"}</BackfillChip>
            <BackfillChip tone="neutral">{lang === "de" ? "Erinnerung" : "user memory"}</BackfillChip>
            <BackfillChip tone="clay">{lang === "de" ? "prüfen" : "needs review"}</BackfillChip>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          {extracted.map((item) => (
            <div
              key={item.label}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 10,
                background: "var(--card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                {item.icon}
                <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                  {lang === "de" ? "extrahiert" : "extracted"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 850, flex: 1 }}>{item.label}</div>
                <div className="num" style={{ fontSize: 16, fontWeight: 850, color: "var(--sage-d)" }}>
                  {item.value}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 5, lineHeight: 1.35 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 1fr) auto",
            gap: 12,
            alignItems: "end",
            borderTop: "1px solid var(--line-2)",
            paddingTop: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--ink-3)",
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              {lang === "de" ? "Fehlende Felder" : "Missing fields"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {missing.map((item) => (
                <BackfillChip key={item}>{item}</BackfillChip>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <BackfillRouteButton
              icon={<Icon.plus size={12} color={onRoute ? "var(--bg)" : "var(--ink-3)"} />}
              label={lang === "de" ? "Eintrag" : "Entry"}
              route="entry"
              onRoute={onRoute}
              primary
            />
            <BackfillRouteButton
              icon={<Icon.body size={12} color="var(--sage-d)" />}
              label={lang === "de" ? "Haut" : "Skin"}
              route="skin"
              onRoute={onRoute}
            />
            <BackfillRouteButton
              icon={<Icon.file size={12} color="var(--sage-d)" />}
              label={lang === "de" ? "Arztbrief" : "Doctor letter"}
              route="letter"
              onRoute={onRoute}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
