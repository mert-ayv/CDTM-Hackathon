import { useState } from "react";
import { EffectivenessChart, MiniSpark } from "../charts";
import { useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

export function Treatment({ data, lang }: ScreenProps) {
  const t = useT(lang);
  const [appliedToday, setAppliedToday] = useState<string[]>(["pflege", "hydro"]);
  const toggle = (id: string) =>
    setAppliedToday((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="main-inner">
      <PageHead
        kicker={lang === "de" ? "Logbuch · 30 Tage" : "Log · 30 days"}
        title={t("behandlung")}
        sub={
          lang === "de"
            ? "Welche Salbe, welches Medikament hat wann gewirkt — und wie konsistent pflegst du? Vergleiche Wirkung anhand deiner eigenen Daten."
            : "Which cream or medication worked when — and how consistent is your routine? Compare effectiveness on your own data."
        }
        action={
          <Btn kind="primary" size="md" icon={<Icon.plus size={14} color="var(--bg)" />}>
            {lang === "de" ? "Mittel hinzufügen" : "Add product"}
          </Btn>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
        <div className="card">
          <div className="card-head">
            <h3>{t("cremes_meds")}</h3>
            <span className="head-sub">
              {appliedToday.length} {lang === "de" ? "heute" : "today"}
            </span>
          </div>
          <div
            className="row"
            style={{
              gridTemplateColumns: "32px 1fr 1fr 80px 80px 60px",
              padding: "10px 18px",
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
              background: "var(--bg-2)",
              borderTop: "none",
              borderBottom: "1px solid var(--line-2)",
            }}
          >
            <span></span>
            <span>{lang === "de" ? "Mittel" : "Product"}</span>
            <span>{lang === "de" ? "Klasse" : "Class"}</span>
            <span>{t("anwendungen")}</span>
            <span>Δ SCORAD</span>
            <span style={{ textAlign: "right" }}>{t("onset_short")}</span>
          </div>
          {data.MEDS.map((m) => {
            const active = appliedToday.includes(m.id);
            const tre = data.treatments.find((x) => x.medId === m.id);
            if (!tre) return null;
            return (
              <div
                key={m.id}
                className="row"
                onClick={() => toggle(m.id)}
                style={{ gridTemplateColumns: "32px 1fr 1fr 80px 80px 60px", cursor: "pointer" }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: active ? "var(--ink)" : "transparent",
                    border: "1.5px solid " + (active ? "var(--ink)" : "var(--line)"),
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {active && <Icon.check size={12} color="var(--bg)" />}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background:
                        m.kind === "kortison"
                          ? "color-mix(in oklch, var(--clay) 22%, var(--card))"
                          : m.kind === "pflege"
                          ? "color-mix(in oklch, var(--sage) 22%, var(--card))"
                          : m.kind === "oral"
                          ? "color-mix(in oklch, oklch(0.78 0.06 280) 22%, var(--card))"
                          : "var(--bg-2)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.pill size={16} color="var(--ink-2)" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m[lang]}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                      {m.strength}
                    </div>
                  </div>
                </div>
                <span
                  className={
                    "pill " +
                    (m.kind === "kortison" ? "clay" : m.kind === "pflege" ? "sage" : "neutral")
                  }
                  style={{ justifySelf: "start" }}
                >
                  {
                    {
                      kortison: t("kortison"),
                      calcineurin: t("calcineurin"),
                      pflege: t("pflege"),
                      oral: t("oral"),
                    }[m.kind]
                  }
                </span>
                <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>
                  {tre.applications}
                </span>
                <span
                  className="num"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: tre.deltaScorad < -1.5 ? "var(--sage-d)" : "var(--ink-2)",
                  }}
                >
                  {tre.deltaScorad.toFixed(1)}
                </span>
                <span className="num" style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "right" }}>
                  {tre.daysToOnset}d
                </span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{t("effekt_vergleich")}</h3>
            <span className="head-sub">Δ SCORAD / 24h</span>
          </div>
          <div className="card-pad">
            <EffectivenessChart treatments={data.treatments} meds={data.MEDS} lang={lang} />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr", marginTop: 16 }}>
        <div
          className="card"
          style={{
            borderTop: "3px solid var(--sage)",
            background:
              "linear-gradient(180deg, color-mix(in oklch, var(--sage) 12%, var(--card)), var(--card))",
          }}
        >
          <div className="card-pad" style={{ display: "flex", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: "color-mix(in oklch, var(--sage) 22%, var(--card))",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon.sparkle size={20} color="var(--sage-d)" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {data.insights[lang][3].title}
              </div>
              <div className="serif" style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>
                „{data.insights[lang][3].body}"
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-label">{lang === "de" ? "Pflege-Adhärenz" : "Care adherence"}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span className="stat-num">92</span>
                <span style={{ fontSize: 14, color: "var(--ink-3)" }}>%</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--sage-d)", marginTop: 4, fontWeight: 600 }}>
                ↑ 6% {lang === "de" ? "vs. Vorwoche" : "vs. last week"}
              </div>
            </div>
            <MiniSpark
              values={data.days.slice(-14).map((_, i) => 0.85 + Math.sin(i / 2) * 0.08 + i * 0.005)}
              width={120}
              height={48}
            />
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "var(--bg-2)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            {lang === "de" ? (
              <>
                Du hast in den letzten 14 Tagen <b>13× pflegende Lotion</b> aufgetragen — das ist dein bisher
                konsistentester Streak.
              </>
            ) : (
              <>
                You applied emollient lotion <b>13× in the last 14 days</b> — your most consistent streak yet.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
