import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "../data";
import { Icon } from "../icons";

interface AgentBootIntroProps {
  lang: Lang;
  onComplete?: () => void;
  onSkip?: () => void;
}

const STEP_MS = 1800;
const TYPE_MS = 34;
const REVEAL_AFTER_READY_MS = 1600;

const copy = {
  en: {
    eyebrow: "DermaTrack Agent",
    title: "Good morning, Lena.",
    stream:
      "I reviewed your diary, skin photos, treatments and pollen context. Your briefing is almost ready.",
    skip: "Skip",
    continue: "Continue",
    ready: "Ready",
    active: "Working",
    steps: [
      "Loading diary",
      "Checking flares",
      "Reading pollen forecast",
      "Preparing next actions",
    ],
  },
  de: {
    eyebrow: "DermaTrack Agent",
    title: "Guten Morgen, Lena.",
    stream:
      "Ich habe Tagebuch, Hautfotos, Behandlungen und Pollenlage geprüft. Dein Briefing ist gleich bereit.",
    skip: "Überspringen",
    continue: "Weiter",
    ready: "Bereit",
    active: "Aktiv",
    steps: [
      "Tagebuch laden",
      "Schübe prüfen",
      "Pollenforecast lesen",
      "Nächste Schritte vorbereiten",
    ],
  },
} satisfies Record<Lang, {
  eyebrow: string;
  title: string;
  stream: string;
  skip: string;
  continue: string;
  ready: string;
  active: string;
  steps: string[];
}>;

export function AgentBootIntro({ lang, onComplete, onSkip }: AgentBootIntroProps) {
  const t = copy[lang];
  const [typed, setTyped] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [finished, setFinished] = useState(false);

  const steps = useMemo(
    () =>
      t.steps.map((label, index) => ({
        label,
        icon: [Icon.file, Icon.flame, Icon.leaf, Icon.sparkle][index],
      })),
    [t.steps],
  );

  useEffect(() => {
    setTyped("");
    setActiveStep(0);
    setFinished(false);
  }, [lang]);

  useEffect(() => {
    if (typed.length >= t.stream.length) return;
    const timer = window.setTimeout(() => {
      setTyped(t.stream.slice(0, typed.length + 1));
    }, TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [t.stream, typed]);

  useEffect(() => {
    if (activeStep >= steps.length) {
      setFinished(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setActiveStep((value) => value + 1);
    }, STEP_MS + activeStep * 120);
    return () => window.clearTimeout(timer);
  }, [activeStep, steps.length]);

  useEffect(() => {
    if (!finished || !onComplete) return;
    const timer = window.setTimeout(onComplete, REVEAL_AFTER_READY_MS);
    return () => window.clearTimeout(timer);
  }, [finished, onComplete]);

  return (
    <section
      aria-label={t.eyebrow}
      style={{
        minHeight: "calc(100svh - 88px)",
        width: "100%",
        display: "grid",
        placeItems: "center",
        padding: "clamp(20px, 5vw, 48px)",
        background: "transparent",
        color: "var(--ink, #172033)",
        boxSizing: "border-box",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 18,
          textAlign: "center",
        }}
      >
        <div style={{ display: "grid", justifyItems: "center", gap: 14 }}>
          <div
            className="dt-boot-orb"
            style={{
              width: 70,
              height: 70,
              display: "grid",
              placeItems: "center",
              ["--dt-boot-orb-size" as string]: "70px",
              overflow: "hidden",
            }}
          >
            <Icon.sparkle size={28} color="#fff" strokeWidth={1.55} />
          </div>

          <div style={{ display: "grid", gap: 8, maxWidth: 620 }}>
            <div
              style={{
                color: "var(--sage-d)",
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontFamily: "var(--font-mono)",
              }}
            >
              {t.eyebrow}
            </div>
            <h1
              className="serif"
              style={{
                margin: 0,
                fontSize: "clamp(34px, 5vw, 48px)",
                lineHeight: 1.08,
                letterSpacing: 0,
                fontWeight: 500,
                fontStyle: "normal",
                color: "var(--ink, #172033)",
              }}
            >
              {t.title}
            </h1>
          </div>
        </div>

        <div
          style={{
            width: "min(680px, 100%)",
            justifySelf: "center",
            border: "1px solid var(--line)",
            borderRadius: 16,
            background: "var(--card)",
            boxShadow: "var(--shadow)",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          <div
            style={{
              minHeight: 86,
              padding: "18px 20px 16px",
              borderBottom: "1px solid var(--line-2)",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              background: "color-mix(in oklch, var(--sage) 7%, var(--card))",
            }}
          >
            <div style={miniOrbStyle}>
              <Icon.sparkle size={15} color="#fff" />
            </div>
            <p
              style={{
                margin: 0,
                color: "var(--ink-2, #344154)",
                fontSize: 14,
                lineHeight: 1.65,
              }}
            >
              {typed}
              {!finished && (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 18,
                    marginLeft: 3,
                    borderRadius: 6,
                    background: "var(--sage-d)",
                    transform: "translateY(3px)",
                    opacity: 0.72,
                  }}
                />
              )}
            </p>
          </div>

          <div style={{ padding: "8px 10px" }}>
            {steps.map((step, index) => {
              const IconCmp = step.icon;
              const done = index < activeStep;
              const current = index === activeStep && !finished;
              return (
                <div
                  key={step.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 12px",
                    borderRadius: 12,
                    color: done || current ? "var(--ink, #172033)" : "var(--ink-3, #6f7b8b)",
                    background: current ? "color-mix(in oklch, var(--sage) 11%, var(--card))" : "transparent",
                    transition: "background 180ms ease, color 180ms ease",
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      color: done ? "#fff" : current ? "var(--sage-d)" : "var(--ink-3, #6f7b8b)",
                      background: done
                        ? "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))"
                        : "color-mix(in oklch, var(--sage) 16%, var(--card))",
                    }}
                  >
                    {done ? <Icon.check size={16} /> : <IconCmp size={16} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>
                    {step.label}
                  </span>
                  <span
                    style={{
                      minWidth: 58,
                      textAlign: "right",
                      fontSize: 11,
                      fontWeight: 800,
                      color: done ? "var(--sage-d)" : "var(--ink-3, #6f7b8b)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {done ? t.ready : current ? <LoadingDots /> : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {onSkip && (
            <button type="button" onClick={onSkip} style={buttonStyle("ghost")}>
              {t.skip}
            </button>
          )}
          {onComplete && (
            <button
              type="button"
              onClick={onComplete}
              style={{
                ...buttonStyle("primary"),
              }}
            >
              <span>{finished ? t.continue : t.active}</span>
              <Icon.arrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function LoadingDots() {
  return (
    <span aria-label="Loading" style={{ display: "inline-flex", gap: 3, justifyContent: "flex-end" }}>
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          style={{
            width: 4,
            height: 4,
            borderRadius: 999,
            background: "var(--sage-d)",
            animation: "dt-think 900ms ease-in-out infinite",
            animationDelay: `${dot * 120}ms`,
          }}
        />
      ))}
    </span>
  );
}

const miniOrbStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
  boxShadow: "0 10px 22px -12px color-mix(in oklch, var(--sage-d) 70%, transparent)",
};

function buttonStyle(kind: "ghost" | "primary"): CSSProperties {
  const primary = kind === "primary";
  return {
    height: 42,
    borderRadius: 12,
    border: primary ? "1px solid var(--sage-d)" : "1px solid var(--line)",
    background: primary ? "var(--ink)" : "var(--card)",
    color: primary ? "#fff" : "var(--ink-2, #344154)",
    padding: "0 16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: primary ? "var(--shadow-sm)" : "none",
  };
}
