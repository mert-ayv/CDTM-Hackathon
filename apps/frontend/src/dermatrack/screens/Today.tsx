import { FlareForecastChart, RankedBars, RiskGauge, SCORADChart } from "../charts";
import { fmtDate, fmtDay, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import { ProgressRing } from "../ui";
import type { ScreenProps } from "./types";

export function Today({ data, lang, onRoute }: ScreenProps) {
  const t = useT(lang);
  const today = data.today;
  const recent7 = data.days.slice(-7);
  const lastWeekAvg = data.days.slice(-14, -7).reduce((s, d) => s + d.scorad, 0) / 7;
  const thisWeekAvg = recent7.reduce((s, d) => s + d.scorad, 0) / 7;
  const delta = thisWeekAvg - lastWeekAvg;
  const better = delta < 0;

  const flareForecast = data.forecast[0];
  const peakForecast = data.forecast.reduce((a, b) => (a.risk > b.risk ? a : b));

  const scoradBand =
    today.scorad < 18
      ? { de: "leicht", en: "mild", color: "sage" as const }
      : today.scorad < 28
      ? { de: "mittel", en: "moderate", color: "warn" as const }
      : { de: "stark", en: "severe", color: "red" as const };

  return (
    <div className="main-inner">
      <PageHead
        kicker={fmtDate(today.date, lang) + " · " + fmtDay(today.date, lang)}
        title={lang === "de" ? "Hallo Lena." : "Hi Lena."}
        sub={
          lang === "de"
            ? "Deine Haut zeigt diese Woche Verbesserung. Drei aktive Trigger sollten wir im Auge behalten — und übermorgen kommt Birkenpollen-Spitze."
            : "Your skin is improving this week. Three triggers to watch — and a birch pollen peak is coming in 2 days."
        }
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" size="md" icon={<Icon.mic size={14} />} onClick={() => onRoute("entry")}>
              {t("sprachnotiz")}
            </Btn>
            <Btn
              kind="primary"
              size="md"
              icon={<Icon.plus size={14} color="var(--bg)" />}
              onClick={() => onRoute("entry")}
            >
              {t("jetzt_loggen")}
            </Btn>
          </div>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1.2fr 1fr 1fr", marginBottom: 16 }}>
        <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ProgressRing size={108} value={today.scorad} max={50} stroke={10} color="var(--sage-d)" track="var(--line)">
            <div>
              <div className="num" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em" }}>
                {today.scorad.toFixed(0)}
              </div>
              <div style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                0–103
              </div>
            </div>
          </ProgressRing>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label">{t("heute_score")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span className={"pill " + scoradBand.color}>{lang === "de" ? scoradBand.de : scoradBand.en}</span>
              <span
                className="num"
                style={{ fontSize: 12, color: better ? "var(--sage-d)" : "var(--clay-d)", fontWeight: 700 }}
              >
                {better ? "↓" : "↑"} {Math.abs(delta).toFixed(1)}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.4 }}>
              {t("seit_letzter_woche")}
              <br />
              <span style={{ color: "var(--ink-2)" }}>
                ⌀ 7d {thisWeekAvg.toFixed(1)} · ⌀ 30d 22.4
              </span>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="stat-label">{t("flare_risiko_24")}</div>
          <RiskGauge
            value={flareForecast.risk}
            label={
              lang === "de"
                ? flareForecast.label
                : flareForecast.risk > 0.6
                ? "high"
                : flareForecast.risk > 0.4
                ? "medium"
                : "low"
            }
            size={150}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--ink-2)",
              marginTop: -2,
            }}
          >
            <Icon.cloud size={13} color="var(--ink-3)" />
            <span className="num">{flareForecast.tempC}°</span>
            <span>·</span>
            <span>
              {lang === "de" ? "Birke" : "Birch"} {flareForecast.birch}/4
            </span>
            <span style={{ marginLeft: "auto", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>Berlin</span>
          </div>
        </div>

        <div className="card card-pad">
          <div className="stat-label">{lang === "de" ? "Eintragsserie" : "Logging streak"}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
            <Icon.flame size={22} color="var(--clay-d)" />
            <div className="stat-num">{data.streak}</div>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{lang === "de" ? "Tage" : "days"}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.4 }}>
            {lang === "de" ? "Längste Serie · 14 Tage" : "Longest streak · 14 days"}
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
            {data.days.slice(-14).map((d, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 24,
                  borderRadius: 4,
                  background:
                    d.foods.length > 0
                      ? `oklch(${0.86 - i * 0.005} ${0.04 + (d.scorad / 40) * 0.10} ${65 - d.scorad})`
                      : "var(--line-2)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="stat-label">{lang === "de" ? "Foto-Serie" : "Photo series"}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
            <Icon.camera size={20} color="var(--ink-2)" />
            <div className="stat-num">{data.days.filter((d) => d.hasPhoto).length}</div>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{lang === "de" ? "Aufnahmen" : "photos"}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.4 }}>
            −38% {lang === "de" ? "Rötung links Ellenbeuge" : "redness, left elbow"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, marginTop: 12 }}>
            {data.days
              .filter((d) => d.hasPhoto)
              .slice(-5)
              .map((p, i) => {
                const sevHere = (p.regions[0] || { sev: 1 }).sev || 1;
                const hue = 30 + (10 - sevHere) * 4;
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 4,
                      background: `radial-gradient(circle at 35% 40%, oklch(${0.78 - sevHere * 0.012} ${
                        0.06 + sevHere * 0.014
                      } ${hue}), oklch(${0.66 - sevHere * 0.012} ${0.06 + sevHere * 0.014} ${hue + 4}))`,
                    }}
                  />
                );
              })}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginBottom: 16 }}>
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
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 8 }}>
              {data.insights[lang][0].title}
            </div>
            <div className="serif" style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>
              „{data.insights[lang][0].body}"
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
              <span className="pill clay">Histamin</span>
              <span className="pill neutral">+2.4 SCORAD</span>
              <span className="pill neutral">3× {lang === "de" ? "belegt" : "observed"}</span>
              <span className="pill neutral">~24h {t("lag")}</span>
            </div>
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px dashed var(--line)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Btn kind="ghost" size="sm" onClick={() => onRoute("triggers")}>
                {lang === "de" ? "Mehr Erkenntnisse" : "More insights"} →
              </Btn>
              <Btn kind="sage" size="sm">
                {lang === "de" ? "Plan anpassen" : "Adjust plan"}
              </Btn>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr", marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>{t("heutige_trigger")}</h3>
            <button
              onClick={() => onRoute("triggers")}
              style={{ background: "none", border: "none", color: "var(--sage-d)", fontWeight: 700, fontSize: 12 }}
            >
              {lang === "de" ? "Alle" : "All"} →
            </button>
          </div>
          <div style={{ padding: 18 }}>
            <RankedBars items={data.triggers.slice(0, 4)} lang={lang} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{t("vorhersage")} · 7d</h3>
            <span className="head-sub">
              {lang === "de" ? "Spitze" : "Peak"} {fmtDate(peakForecast.date, lang)}
            </span>
          </div>
          <div style={{ padding: 18 }}>
            <FlareForecastChart forecast={data.forecast} lang={lang} />
            <div
              style={{
                borderTop: "1px solid var(--line-2)",
                marginTop: 14,
                paddingTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="pill red">
                {lang === "de" ? "Spitze" : "Peak"} {Math.round(peakForecast.risk * 100)}%
              </span>
              <span style={{ fontSize: 11, color: "var(--ink-2)" }}>
                {lang === "de" ? "Birkenpollen ≥ 3 erwartet" : "Birch pollen ≥ 3 expected"}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{lang === "de" ? "Letzte Einträge" : "Recent log"}</h3>
            <span className="head-sub">{data.days.length} · 30d</span>
          </div>
          <div style={{ padding: "6px 0" }}>
            {data.days
              .slice(-5)
              .reverse()
              .map((d, i) => {
                const tone = d.scorad < 18 ? "sage" : d.scorad < 28 ? "warn" : "red";
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 18px",
                      borderTop: i === 0 ? "none" : "1px solid var(--line-2)",
                    }}
                  >
                    <div>
                      <div className="num" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                        {String(d.date.getDate()).padStart(2, "0")}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--ink-3)",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {fmtDay(d.date, lang).slice(0, 2)}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.foods
                          .slice(0, 2)
                          .map((f) => f[lang])
                          .join(", ")}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                        {d.sleepH}h · S{d.stress}/5
                      </div>
                    </div>
                    <span className={"pill " + tone}>{d.scorad.toFixed(0)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div
        className="card card-pad"
        style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginRight: 6,
          }}
        >
          {t("eintrag_label")}
        </div>
        {[
          { Icon: Icon.bowl, label: t("essen"), screen: "entry" as const },
          { Icon: Icon.run, label: t("sport"), screen: "entry" as const },
          { Icon: Icon.bolt, label: t("stress"), screen: "entry" as const },
          { Icon: Icon.moon, label: t("schlaf"), screen: "entry" as const },
          { Icon: Icon.camera, label: t("foto"), screen: "skin" as const },
          { Icon: Icon.mic, label: t("sprache"), screen: "entry" as const },
        ].map((q, i) => (
          <button
            key={i}
            onClick={() => onRoute(q.screen)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <q.Icon size={15} color="var(--sage-d)" />
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
