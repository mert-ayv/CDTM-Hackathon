import { useState } from "react";
import { MiniBody } from "../body";
import { SCORADChart } from "../charts";
import { fmtDate, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

export function Letter({ data, lang }: ScreenProps) {
  const t = useT(lang);
  const [sent, setSent] = useState(false);

  const includes = [
    {
      Icon: Icon.chart,
      label: lang === "de" ? "SCORAD-Verlauf · 30 Tage" : "30-day SCORAD trend",
      detail: "30 " + t("tage"),
    },
    { Icon: Icon.sparkle, label: t("top_trigger"), detail: "5" },
    { Icon: Icon.camera, label: t("foto_zeitachse"), detail: "6" },
    { Icon: Icon.pill, label: t("effektivität"), detail: "5" },
    {
      Icon: Icon.body,
      label: lang === "de" ? "Lokalisationskarte" : "Body distribution map",
      detail: "14",
    },
  ];

  return (
    <div className="main-inner">
      <PageHead
        kicker={lang === "de" ? "Export · DiGA-konform · TI-Messenger" : "Export · DiGA-ready · TI-Messenger"}
        title={t("arztbrief")}
        sub={
          lang === "de"
            ? "Strukturierter 30-Tage-Bericht für deine Praxis: SCORAD-Verlauf, Top-Trigger, Foto-Zeitachse und Behandlungswirkung — digital signiert."
            : "Structured 30-day report for your clinic: SCORAD trend, top triggers, photo timeline and treatment effect — digitally signed."
        }
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" size="md" icon={<Icon.download size={14} />}>
              PDF
            </Btn>
            <Btn
              kind="primary"
              size="md"
              icon={<Icon.share size={14} color="var(--bg)" />}
              onClick={() => {
                setSent(true);
                setTimeout(() => setSent(false), 2400);
              }}
            >
              {t("teilen")}
            </Btn>
          </div>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div>
          <div
            className="card-head"
            style={{ background: "transparent", border: "none", padding: "0 4px 10px" }}
          >
            <h3>{t("pdf_vorschau")}</h3>
            <span className="head-sub">A4 · 1 / 3</span>
          </div>
          <div
            style={{
              background: "#fff",
              color: "#1a1a1a",
              border: "1px solid var(--line)",
              borderRadius: 12,
              boxShadow: "0 24px 48px -16px rgba(20,28,40,0.18)",
              padding: 36,
              position: "relative",
              fontFamily: "var(--font-sans)",
              maxWidth: 720,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "oklch(0.55 0.10 155)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#666",
                    }}
                  >
                    DermaTrack · {t("bericht")}
                  </span>
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1, fontStyle: "normal" }}
                >
                  Atopische Dermatitis · 30-Tage-Verlauf
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 8, fontFamily: "var(--font-mono)" }}>
                  {lang === "de" ? "Patient" : "Patient"}: L.K. · *1994 · {t("arzt_zeitraum")} 10.04. – 09.05.2026 ·{" "}
                  {lang === "de" ? "an" : "to"}: Dr. Lehmann, Praxis Mitte
                </div>
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  border: "1.5px solid #ddd",
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 9,
                  color: "#aaa",
                  fontFamily: "var(--font-mono)",
                }}
              >
                QR
              </div>
            </div>
            <div style={{ height: 1, background: "#222", marginBottom: 18 }} />

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  color: "#444",
                  marginBottom: 8,
                }}
              >
                {t("score_fortschritt")}
              </div>
              <div style={{ background: "#fafafa", borderRadius: 8, padding: 10 }}>
                <SCORADChart days={data.days} height={150} width={620} highlightToday={false} />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "#666",
                  marginTop: 6,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>⌀ 22.4</span>
                <span>min 14.6</span>
                <span>max 31.2</span>
                <span>Δ −4.1</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 180px",
                gap: 24,
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                    color: "#444",
                    marginBottom: 8,
                  }}
                >
                  {t("top_trigger")}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {data.triggers.slice(0, 5).map((tr, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span style={{ width: 14, fontFamily: "var(--font-mono)", fontSize: 10, color: "#888" }}>
                        {i + 1}.
                      </span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{tr.label[lang]}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#666", fontSize: 11 }}>
                        ~{tr.lag}h
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#666", fontSize: 11 }}>
                        +{tr.deltaScorad.toFixed(1)}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11 }}>
                        {tr.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                    color: "#444",
                    marginBottom: 8,
                  }}
                >
                  {lang === "de" ? "Lokalisation" : "Body"}
                </div>
                <div
                  style={{
                    background: "#fafafa",
                    borderRadius: 8,
                    height: 180,
                    padding: 4,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <MiniBody side="front" regions={data.today.regions} size={100} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  color: "#444",
                  marginBottom: 8,
                }}
              >
                {t("foto_zeitachse")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                {data.days
                  .filter((d) => d.hasPhoto)
                  .slice(-6)
                  .map((p, i) => {
                    const sevHere = (p.regions[0] || { sev: 1 }).sev || 1;
                    const hue = 30 + (10 - sevHere) * 4;
                    return (
                      <div
                        key={i}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 6,
                          position: "relative",
                          background: `radial-gradient(circle at 35% 40%, oklch(${
                            0.78 - sevHere * 0.012
                          } ${0.06 + sevHere * 0.014} ${hue}), oklch(${0.66 - sevHere * 0.012} ${
                            0.06 + sevHere * 0.014
                          } ${hue + 4}))`,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            bottom: 3,
                            left: 3,
                            fontSize: 8,
                            color: "#fff",
                            fontFamily: "var(--font-mono)",
                            background: "rgba(0,0,0,0.4)",
                            padding: "1px 4px",
                            borderRadius: 3,
                          }}
                        >
                          {fmtDate(p.date, lang)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  color: "#444",
                  marginBottom: 8,
                }}
              >
                {t("effektivität")}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {data.treatments.slice(0, 4).map((tre, i) => {
                  const med = data.MEDS.find((m) => m.id === tre.medId);
                  if (!med) return null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span style={{ flex: 1, fontWeight: 600 }}>{med[lang]}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#666", fontSize: 11 }}>
                        n={tre.applications}
                      </span>
                      <div
                        style={{
                          width: 100,
                          height: 6,
                          background: "#eee",
                          borderRadius: 3,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            right: "50%",
                            top: 0,
                            bottom: 0,
                            width: `${Math.min(50, (Math.abs(tre.deltaScorad / 4) * 100) / 2)}%`,
                            background: "#2c5d52",
                            borderRadius: 3,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: -1,
                            bottom: -1,
                            width: 1,
                            background: "#999",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          fontSize: 11,
                          width: 40,
                          textAlign: "right",
                        }}
                      >
                        {tre.deltaScorad.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                paddingTop: 12,
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#999",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>
                DermaTrack v0.4.2 · {lang === "de" ? "erstellt" : "generated"} 09.05.2026
              </span>
              <span>SHA-256: 4f8a…d3c1</span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--bg-2)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ink-2)",
              }}
            >
              DL
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Dr. Lehmann</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Praxis Mitte · Berlin</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                {lang === "de" ? "Termin" : "Appt"} 14.05.
              </div>
            </div>
            <span className="pill sage">
              <Icon.check size={11} /> {t("diga")}
            </span>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{t("enthält")}</h3>
              <span className="head-sub">5</span>
            </div>
            {includes.map((row, i) => (
              <div
                key={i}
                className="row"
                style={{ gridTemplateColumns: "20px 1fr 50px 18px", padding: "10px 14px" }}
              >
                <row.Icon size={16} color="var(--ink-2)" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{row.label}</span>
                <span className="num" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>
                  {row.detail}
                </span>
                <Icon.check size={14} color="var(--sage-d)" />
              </div>
            ))}
          </div>

          {sent && (
            <div
              className="card card-pad"
              style={{
                background: "color-mix(in oklch, var(--sage) 18%, var(--card))",
                color: "var(--sage-d)",
                textAlign: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {t("versendet")}
            </div>
          )}

          <div
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {t("digital_signiert")}
            <br />
            {t("sicher_übertragen")}
          </div>
        </div>
      </div>
    </div>
  );
}
