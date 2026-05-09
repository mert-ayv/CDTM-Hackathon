import { AgentChat } from "../components/AgentChat";
import { RankedBars, SCORADChart } from "../charts";
import { fmtDate, fmtDay, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

export function Today({ data, lang, onRoute }: ScreenProps) {
  const t = useT(lang);
  const today = data.today;

  return (
    <div className="main-inner">
      <PageHead
        kicker={fmtDate(today.date, lang) + " · " + fmtDay(today.date, lang)}
        title={lang === "de" ? "Hallo Lena." : "Hi Lena."}
        sub={
          lang === "de"
            ? "Dein Agent hat 30 Tage Logs, Foto-KI und die Pollenvorhersage zusammengezogen. Frag direkt — oder scrolle für den Verlauf und die aktiven Auslöser."
            : "Your agent has joined 30 days of logs, photo AI and the pollen forecast. Ask directly — or scroll for the trend and active triggers."
        }
        action={
          <Btn
            kind="primary"
            size="md"
            icon={<Icon.plus size={14} color="var(--bg)" />}
            onClick={() => onRoute("entry")}
          >
            {t("jetzt_loggen")}
          </Btn>
        }
      />

      {/* AI Agent — hero */}
      <AgentChat data={data} lang={lang} onRoute={onRoute} />

      {/* Supporting cards */}
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr" }}>
        <div className="card">
          <div className="card-head">
            <h3>{t("mini_chart_30")}</h3>
            <span className="head-sub">⌀ 22.4 · min 14.6 · max 31.2 · Δ −4.1</span>
          </div>
          <div style={{ padding: "16px 18px 14px" }}>
            <SCORADChart days={data.days} height={220} width={620} highlightToday={true} />
            <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "var(--ink-3)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 3, background: "var(--sage-d)" }} /> SCORAD
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 8, background: "oklch(0.93 0.04 80)", borderRadius: 2 }} />{" "}
                {lang === "de" ? "Mittel-Bereich" : "Moderate band"}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{t("heutige_trigger")}</h3>
            <button
              onClick={() => onRoute("triggers")}
              style={{
                background: "none",
                border: "none",
                color: "var(--sage-d)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {lang === "de" ? "Alle" : "All"} →
            </button>
          </div>
          <div style={{ padding: 18 }}>
            <RankedBars items={data.triggers.slice(0, 3)} lang={lang} />
          </div>
        </div>

        <div
          className="card"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklch, var(--clay) 12%, var(--card)), var(--card))",
            borderTop: "3px solid var(--clay)",
          }}
        >
          <div className="card-head" style={{ background: "transparent", borderBottom: "1px solid var(--line-2)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon.sparkle size={14} color="var(--clay-d)" />
              {t("ki_einsicht")}
            </h3>
            <span className="pill clay">{lang === "de" ? "stark" : "strong"}</span>
          </div>
          <div className="card-pad">
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 8 }}>
              {data.insights[lang][0].title}
            </div>
            <div className="serif" style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}>
              „{data.insights[lang][0].body}"
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <span className="pill clay">Histamin</span>
              <span className="pill neutral">+2.4 SCORAD</span>
              <span className="pill neutral">~24h {t("lag")}</span>
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px dashed var(--line)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Btn kind="ghost" size="sm" onClick={() => onRoute("triggers")}>
                {lang === "de" ? "Mehr" : "More"} →
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
