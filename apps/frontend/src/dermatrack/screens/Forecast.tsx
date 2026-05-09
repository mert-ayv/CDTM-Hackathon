import { FlareForecastChart, WeatherStrip } from "../charts";
import { fmtDate, fmtDay, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

export function Forecast({ data, lang }: ScreenProps) {
  const t = useT(lang);
  const peak = data.forecast.reduce((a, b) => (a.risk > b.risk ? a : b));
  const peakIdx = data.forecast.indexOf(peak);

  return (
    <div className="main-inner">
      <PageHead
        kicker={lang === "de" ? "Modell · 7 Tage · Berlin" : "Model · 7 days · Berlin"}
        title={t("vorhersage_titel")}
        sub={t("forecast_intro")}
        action={
          <Btn kind="ghost" size="md" icon={<Icon.bell size={14} />}>
            {lang === "de" ? "Push aktiv" : "Push enabled"}
          </Btn>
        }
      />

      <div
        className="card card-pad"
        style={{
          background: "linear-gradient(135deg, oklch(0.94 0.06 30), var(--card))",
          borderColor: "oklch(0.85 0.10 25)",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "oklch(0.66 0.18 25)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon.flame size={28} color="#fff" />
        </div>
        <div>
          <div className="stat-label" style={{ color: "oklch(0.50 0.16 25)" }}>
            {lang === "de" ? "Risikospitze" : "Peak risk"} · {fmtDate(peak.date, lang)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <div className="stat-num">{Math.round(peak.risk * 100)}%</div>
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
              {lang === "de" ? "Schub-Wahrscheinlichkeit" : "flare probability"}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Btn kind="ghost" size="md">
            {lang === "de" ? "Plan ansehen" : "View plan"}
          </Btn>
          <Btn kind="primary" size="md" icon={<Icon.pill size={14} color="var(--bg)" />}>
            {lang === "de" ? "Antihistamin einnehmen" : "Take antihistamine"}
          </Btn>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>{t("sieben_tage")}</h3>
          <span className="head-sub">DWD · {lang === "de" ? "aktualisiert vor 12 min" : "updated 12 min ago"}</span>
        </div>
        <div className="card-pad">
          <FlareForecastChart forecast={data.forecast} lang={lang} />
          <div style={{ height: 1, background: "var(--line-2)", margin: "18px 0 14px" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "var(--ink-3)",
              marginBottom: 10,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon.cloud size={12} /> {t("wetter")} & {t("pollen")}
            </span>
            <span style={{ fontFamily: "var(--font-mono)" }}>°C · Birke 0–4</span>
          </div>
          <WeatherStrip forecast={data.forecast} lang={lang} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="card-head">
            <h3>{t("nächste_woche")}</h3>
            <span className="head-sub">7 {t("tage")}</span>
          </div>
          <div>
            {data.forecast.map((f, i) => {
              const tone = f.risk > 0.6 ? "red" : f.risk > 0.4 ? "warn" : "sage";
              return (
                <div
                  key={i}
                  className="row"
                  style={{
                    gridTemplateColumns: "46px 1fr 80px 80px 80px",
                    background:
                      i === peakIdx ? "color-mix(in oklch, oklch(0.66 0.18 25) 5%, var(--card))" : "transparent",
                  }}
                >
                  <div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
                      {String(f.date.getDate()).padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {fmtDay(f.date, lang).slice(0, 3)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {i === 0
                        ? lang === "de"
                          ? "Morgen"
                          : "Tomorrow"
                        : i === 1
                        ? lang === "de"
                          ? "Übermorgen"
                          : "In 2 days"
                        : new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { weekday: "long" }).format(
                            f.date,
                          )}
                      {i === peakIdx && <span className="pill red">{lang === "de" ? "Spitze" : "peak"}</span>}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginTop: 2,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {f.tempC}° · {lang === "de" ? "Birke" : "Birch"} {f.birch}/4 ·{" "}
                      {lang === "de" ? "Gräser" : "Grass"} {f.grass}/4
                    </div>
                  </div>
                  <span className="num" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>
                    {f.tempC}°
                  </span>
                  <div style={{ display: "flex", gap: 1 }}>
                    {[1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        style={{
                          width: 4,
                          height: 14,
                          borderRadius: 2,
                          background: n <= f.birch ? "oklch(0.74 0.10 130)" : "var(--line)",
                        }}
                      />
                    ))}
                  </div>
                  <span className={"pill " + tone} style={{ justifySelf: "end" }}>
                    {Math.round(f.risk * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>{t("benachrichtigung")}</h3>
              <span className="head-sub">{lang === "de" ? "proaktiv" : "proactive"}</span>
            </div>
            <div className="card-pad" style={{ background: "oklch(0.96 0.005 80)" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: 12,
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, var(--sage), oklch(0.62 0.07 155))",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon.leaf size={18} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "var(--ink-3)",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>DermaTrack</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{lang === "de" ? "jetzt" : "now"}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                    {lang === "de" ? "Erhöhtes Schub-Risiko übermorgen" : "Elevated flare risk in 2 days"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.4 }}>
                    {t("benachrichtigung_text")}
                  </div>
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  marginTop: 10,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                {lang === "de" ? "Vorschau · personalisiert · proaktiv" : "Preview · personalised · proactive"}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="stat-label">{lang === "de" ? "Modellgüte" : "Model quality"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
              {[
                { l: "AUC", v: "0.81" },
                { l: lang === "de" ? "Treffer" : "Recall", v: "74%" },
                { l: "Brier", v: "0.18" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
                    {s.v}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase" }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-2)",
                lineHeight: 1.5,
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--line-2)",
              }}
            >
              {lang === "de"
                ? "Validiert auf 1.243 Patient:innen · DiGA-Studie 2025 · n=92 Tage Median."
                : "Validated on 1,243 patients · DiGA study 2025 · n=92 days median."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
