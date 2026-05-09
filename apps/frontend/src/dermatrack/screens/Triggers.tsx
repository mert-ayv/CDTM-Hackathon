import { useState } from "react";
import { HeatmapCalendar, RankedBars } from "../charts";
import { useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

type Filter = "all" | "food" | "env" | "lifestyle";

export function Triggers({ data, lang }: ScreenProps) {
  const t = useT(lang);
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = data.triggers.filter((tr) => (filter === "all" ? true : tr.kind === filter));

  return (
    <div className="main-inner">
      <PageHead
        kicker={lang === "de" ? "KI-Analyse · 30 Tage" : "AI analysis · 30 days"}
        title={t("trigger_analyse")}
        sub={
          lang === "de"
            ? "Mustererkennung über deine Mahlzeiten, Umweltdaten und Lebensstil. Konfidenz wächst, je länger du loggst."
            : "Pattern detection across your meals, environment and lifestyle. Confidence grows the longer you log."
        }
        action={
          <Btn kind="ghost" size="md" icon={<Icon.download size={14} />}>
            {lang === "de" ? "Datensatz" : "Dataset"} ↓
          </Btn>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginBottom: 16 }}>
        <div
          className="card"
          style={{
            borderTop: "3px solid var(--clay)",
            background:
              "linear-gradient(180deg, color-mix(in oklch, var(--clay) 12%, var(--card)), var(--card))",
          }}
        >
          <div className="card-pad" style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: "color-mix(in oklch, var(--clay) 22%, var(--card))",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon.sparkle size={22} color="var(--clay-d)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="pill clay">{lang === "de" ? "stark" : "strong"}</span>
                <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>conf 92%</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{data.insights[lang][0].title}</div>
              <div className="serif" style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>
                „{data.insights[lang][0].body}"
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                <span className="pill clay">Histamin</span>
                <span className="pill neutral">+2.4 SCORAD</span>
                <span className="pill neutral">~24h {t("lag")}</span>
                <span className="pill neutral">3× {lang === "de" ? "belegt" : "observed"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">{lang === "de" ? "Filter" : "Filter"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {(
              [
                { id: "all", label: lang === "de" ? "Alle" : "All", n: data.triggers.length },
                {
                  id: "food",
                  label: t("legend_food"),
                  n: data.triggers.filter((x) => x.kind === "food").length,
                },
                {
                  id: "env",
                  label: lang === "de" ? "Umwelt" : "Env",
                  n: data.triggers.filter((x) => x.kind === "env").length,
                },
                {
                  id: "lifestyle",
                  label: t("legend_lifestyle"),
                  n: data.triggers.filter((x) => x.kind === "lifestyle").length,
                },
              ] as Array<{ id: Filter; label: string; n: number }>
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid " + (filter === f.id ? "var(--ink)" : "var(--line)"),
                  background: filter === f.id ? "var(--ink)" : "var(--card)",
                  color: filter === f.id ? "var(--bg)" : "var(--ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {f.label}{" "}
                <span className="num" style={{ opacity: 0.7, fontSize: 10 }}>
                  {f.n}
                </span>
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 10,
              background: "var(--bg-2)",
              borderRadius: 10,
              fontSize: 11,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            <b>{lang === "de" ? "Methodik" : "Method"}:</b>{" "}
            {lang === "de"
              ? "Bayessche Korrelation mit Lag-Modellierung (6/24h). Konfidenz aus Effektstärke + Anzahl Belege."
              : "Bayesian correlation with lag modelling (6/24h). Confidence from effect size + evidence count."}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.1fr 1.3fr", marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>{t("top_trigger")}</h3>
            <span className="head-sub">n=30 {lang === "de" ? "Tage" : "days"}</span>
          </div>
          <div style={{ padding: 18 }}>
            <RankedBars items={filtered.slice(0, 6)} lang={lang} />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>{t("heatmap")}</h3>
            <span className="head-sub">{lang === "de" ? "Trigger ↔ Schub" : "trigger ↔ flare"}</span>
          </div>
          <div className="card-pad">
            <HeatmapCalendar days={data.days} lang={lang} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 14,
                fontSize: 11,
                color: "var(--ink-3)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--line-2)" }} />{" "}
                {t("kein_flare")}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "oklch(0.78 0.10 60)" }} />{" "}
                {t("leicht")}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "oklch(0.66 0.18 25)" }} />{" "}
                {t("heftig")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>{t("insight")}</h3>
          <span className="head-sub">
            {data.insights[lang].length - 1} {lang === "de" ? "weitere" : "more"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {data.insights[lang].slice(1).map((ins, i) => (
            <div key={i} style={{ padding: 18, borderLeft: i === 0 ? "none" : "1px solid var(--line-2)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  className={
                    "pill " +
                    (ins.kind === "positive" ? "sage" : ins.kind === "lifestyle" ? "neutral" : "clay")
                  }
                >
                  {ins.kind === "positive"
                    ? lang === "de"
                      ? "Positiv"
                      : "Positive"
                    : ins.kind === "lifestyle"
                    ? lang === "de"
                      ? "Lebensstil"
                      : "Lifestyle"
                    : lang === "de"
                    ? "Umwelt"
                    : "Env"}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {ins.strength}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{ins.title}</div>
              <div className="serif" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>
                „{ins.body}"
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "var(--ink-3)",
          fontFamily: "var(--font-mono)",
          marginTop: 18,
        }}
      >
        {lang === "de"
          ? "Korrelation ≠ Kausalität · Konfidenz nimmt mit weiteren Einträgen zu"
          : "Correlation ≠ causation · confidence grows with more entries"}
      </div>
    </div>
  );
}
