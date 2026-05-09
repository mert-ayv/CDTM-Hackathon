import { useState } from "react";
import { BodyMap } from "../body";
import type { BodySide } from "../data";
import { fmtDate, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import { SevDot } from "../ui";
import type { ScreenProps } from "./types";

export function Skin({ data, lang }: ScreenProps) {
  const t = useT(lang);
  const [side, setSide] = useState<BodySide>("front");
  const [selectedRegion, setSelectedRegion] = useState<string>("arm-l-flex");
  const [sev, setSev] = useState({ itch: 6.2, redness: 4.8, dryness: 5.5 });

  const today = data.today;
  const region = data.BODY_REGIONS.find((r) => r.id === selectedRegion);
  const photos = data.days.filter((d) => d.hasPhoto).slice(-9);
  const area = today.regions.length;
  const meanSev = today.regions.reduce((s, r) => s + r.sev, 0) / Math.max(1, area);

  return (
    <div className="main-inner">
      <PageHead
        kicker={t("hauttracking") + " · 14 " + (lang === "de" ? "Regionen" : "regions")}
        title={t("körperkarte")}
        sub={
          lang === "de"
            ? "Tippe Regionen, justiere Schweregrad — die KI vergleicht jedes Foto mit deiner Baseline und meldet sichtbare Veränderungen."
            : "Tap regions, adjust severity — AI compares each photo to your baseline and flags visible changes."
        }
        action={
          <Btn kind="primary" size="md" icon={<Icon.camera size={14} color="var(--bg)" />}>
            {t("foto_aufnehmen")}
          </Btn>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "1.1fr 1fr 1fr", alignItems: "start" }}>
        <div className="card">
          <div className="card-head">
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "front" as BodySide, label: t("vorne") },
                { id: "back" as BodySide, label: t("hinten") },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSide(s.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid " + (side === s.id ? "var(--ink)" : "var(--line)"),
                    background: side === s.id ? "var(--ink)" : "var(--card)",
                    color: side === s.id ? "var(--bg)" : "var(--ink-2)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSide(side === "front" ? "back" : "front")}
              className="icon-btn"
              style={{ width: 30, height: 30 }}
            >
              <Icon.rotate size={14} />
            </button>
          </div>
          <div style={{ padding: 14, position: "relative" }}>
            <div style={{ height: 460 }}>
              <BodyMap
                side={side}
                regions={today.regions}
                selectedId={selectedRegion}
                onRegionTap={setSelectedRegion}
                lang={lang}
              />
            </div>
            <div style={{ position: "absolute", right: 22, top: 22, display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {t("schweregrad")}
              </div>
              {[10, 8, 5, 2].map((v) => (
                <div
                  key={v}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink-3)",
                  }}
                >
                  <SevDot value={v} size={8} /> {v}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--line-2)",
              padding: "10px 18px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--ink-3)",
            }}
          >
            <span>
              <Icon.info size={12} style={{ verticalAlign: "middle" }} /> {t("bereich_tippen")}
            </span>
            <span className="num">
              {area} {lang === "de" ? "Regionen" : "regions"} · ⌀ {meanSev.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>{region ? region[lang] : t("bereich_tippen")}</h3>
              <button className="icon-btn" style={{ width: 30, height: 30 }}>
                <Icon.camera size={14} />
              </button>
            </div>
            <div className="card-pad">
              {(
                [
                  { id: "itch" as const, label: t("juckreiz"), color: "oklch(0.66 0.18 25)", value: sev.itch },
                  { id: "redness" as const, label: t("röte"), color: "oklch(0.74 0.13 30)", value: sev.redness },
                  { id: "dryness" as const, label: t("trockenheit"), color: "oklch(0.78 0.06 80)", value: sev.dryness },
                ]
              ).map((row) => (
                <div key={row.id} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: row.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</span>
                    </div>
                    <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                      {row.value.toFixed(1)}
                      <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>/10</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.1}
                    value={row.value}
                    onChange={(e) => setSev({ ...sev, [row.id]: +e.target.value })}
                    style={{ width: "100%", accentColor: row.color }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div
            className="card card-pad"
            style={{ background: "linear-gradient(180deg, color-mix(in oklch, var(--sage) 14%, var(--card)), var(--card))" }}
          >
            <div className="stat-label">SCORAD live</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <div className="stat-num">{today.scorad.toFixed(1)}</div>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{t("score_skala")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
              {[
                { l: t("area"), v: (area * 4).toFixed(0) + "%" },
                { l: t("intensity"), v: meanSev.toFixed(1) },
                { l: t("subjective"), v: today.itch.toFixed(1) },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--card)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase" }}>{s.l}</div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{t("foto_zeitachse")}</h3>
            <span className="head-sub">{photos.length} · 30d</span>
          </div>
          <div className="card-pad">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {photos.map((p, i) => {
                const sevHere = (p.regions.find((r) => r.regionId === selectedRegion) || { sev: 1 }).sev || 1;
                const hue = 30 + (10 - sevHere) * 4;
                const lightness = 0.78 - sevHere * 0.012;
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      overflow: "hidden",
                      position: "relative",
                      border: "1px solid var(--line)",
                      background: `radial-gradient(circle at 35% 40%, oklch(${lightness} ${
                        0.04 + sevHere * 0.014
                      } ${hue}) 0%, oklch(${lightness - 0.06} ${0.04 + sevHere * 0.012} ${hue + 4}) 100%)`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0.5,
                        background:
                          "repeating-radial-gradient(circle at 30% 40%, transparent 0 4px, rgba(255,255,255,0.05) 4px 5px)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 4,
                        right: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 8,
                          color: "#fff",
                          fontFamily: "var(--font-mono)",
                          background: "rgba(0,0,0,0.4)",
                          padding: "1px 4px",
                          borderRadius: 4,
                        }}
                      >
                        {fmtDate(p.date, lang)}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: "#fff",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {sevHere.toFixed(1)}
                      </span>
                    </div>
                    {i === photos.length - 1 && (
                      <div style={{ position: "absolute", top: 4, right: 4 }}>
                        <span className="pill sage" style={{ height: 18, fontSize: 9 }}>
                          {t("heute")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: "color-mix(in oklch, var(--sage) 12%, var(--card))",
                display: "flex",
                gap: 10,
              }}
            >
              <Icon.sparkle size={18} color="var(--sage-d)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                  {lang === "de" ? "Verbesserung sichtbar" : "Visible improvement"}
                </div>
                <div className="serif" style={{ fontSize: 12, lineHeight: 1.45, color: "var(--ink-2)" }}>
                  {lang === "de"
                    ? "„Linke Ellenbeuge: −38 % Rötung in 12 Tagen (Bild-KI)."
                    : '"Left elbow: −38% redness over 12 days (image AI)."'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
