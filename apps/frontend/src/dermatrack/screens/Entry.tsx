import { useState } from "react";
import { fmtDate, fmtTime, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

type VoiceState = "idle" | "listening" | "done";

export function Entry({ data, lang, onRoute }: ScreenProps) {
  const t = useT(lang);
  const today = data.today;
  const [voice, setVoice] = useState<VoiceState>("done");
  const [stress, setStress] = useState(today.stress);
  const [sleep, setSleep] = useState(today.sleepH);
  const [activity, setActivity] = useState(today.activity.id);

  const meal = [
    { de: "Pasta", en: "Pasta", tags: ["Gluten"] },
    { de: "Tomatensauce", en: "Tomato sauce", tags: ["Histamin"] },
    { de: "Parmesan", en: "Parmesan", tags: ["Milch", "Histamin"] },
    { de: "Basilikum", en: "Basil", tags: [] },
  ];

  return (
    <div className="main-inner">
      <PageHead
        kicker={fmtDate(today.date, lang) + " · " + fmtTime(new Date(), lang)}
        title={t("app_eintrag")}
        sub={
          lang === "de"
            ? "Sprich es ein, fotografiere deine Mahlzeit, justiere die Tagesform — die KI verknüpft alles im Hintergrund mit deinem Hautbild."
            : "Dictate, snap your meal, adjust your daily state — AI links everything to your skin pattern in the background."
        }
        action={
          <Btn
            kind="primary"
            size="md"
            icon={<Icon.check size={14} color="var(--bg)" />}
            onClick={() => onRoute("today")}
          >
            {t("loggen")}
          </Btn>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="grid" style={{ gap: 16 }}>
          <div
            className="card card-pad"
            style={{
              background:
                voice === "listening"
                  ? "linear-gradient(135deg, color-mix(in oklch, var(--clay) 18%, var(--card)), var(--card))"
                  : "var(--card)",
              transition: "background 200ms",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => {
                  if (voice !== "listening") {
                    setVoice("listening");
                    setTimeout(() => setVoice("done"), 1800);
                  }
                }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: voice === "listening" ? "var(--clay)" : "var(--ink)",
                  color: voice === "listening" ? "#fff" : "var(--bg)",
                  border: "none",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 6px 18px -4px rgba(20,28,40,0.18)",
                  animation: voice === "listening" ? "dt-pulse 1.2s ease-out infinite" : "none",
                }}
              >
                <Icon.mic size={26} color={voice === "listening" ? "#fff" : "var(--bg)"} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t("sprachnotiz")}</div>
                <div className="serif" style={{ fontSize: 14, color: "var(--ink)", marginTop: 4, lineHeight: 1.5 }}>
                  {voice === "idle" && (
                    <span style={{ color: "var(--ink-3)", fontStyle: "normal" }}>{t("voice_hint")}</span>
                  )}
                  {voice === "listening" && <span style={{ color: "var(--clay-d)" }}>{t("voice_aktiv")}</span>}
                  {voice === "done" && "„" + t("voice_transkript") + '"'}
                </div>
              </div>
              {voice === "done" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn kind="sage" size="sm" icon={<Icon.check size={13} />}>
                    {t("verstanden")}
                  </Btn>
                  <Btn kind="ghost" size="sm" onClick={() => setVoice("idle")}>
                    {t("bearbeiten")}
                  </Btn>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{t("mahlzeit_foto")}</h3>
              <span className="head-sub">12:30 · {t("analysiert")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 0 }}>
              <div
                style={{
                  height: 220,
                  background: "radial-gradient(circle at 35% 40%, oklch(0.84 0.10 50), oklch(0.66 0.13 38))",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                }}
              >
                <svg viewBox="0 0 200 100" width="80%">
                  <ellipse cx={100} cy={55} rx={68} ry={22} fill="oklch(0.96 0.02 60)" />
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <path
                      key={i}
                      d={`M ${50 + i * 16} 50 Q ${58 + i * 16} ${44 + (i % 2) * 4} ${66 + i * 16} 50 T ${82 + i * 16} 50`}
                      stroke="oklch(0.85 0.12 55)"
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                    />
                  ))}
                  <circle cx={80} cy={50} r={4} fill="oklch(0.55 0.18 25)" />
                  <circle cx={120} cy={56} r={4} fill="oklch(0.55 0.18 25)" />
                  <circle cx={100} cy={48} r={3} fill="oklch(0.78 0.18 140)" />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 12,
                    color: "#fff",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    background: "rgba(0,0,0,0.4)",
                    padding: "3px 8px",
                    borderRadius: 8,
                  }}
                >
                  {fmtTime(new Date(), lang)} · {t("analysiert")}
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {t("zutaten")}{" "}
                  <span className="pill sage" style={{ height: 18 }}>
                    <Icon.sparkle size={10} /> KI
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {meal.map((ing, i) => (
                    <span key={i} className={"pill " + (ing.tags.length ? "clay" : "neutral")}>
                      {ing[lang]}
                      {ing.tags.length > 0 && (
                        <span style={{ opacity: 0.7, fontSize: 10 }}>· {ing.tags[0]}</span>
                      )}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    background: "var(--bg-2)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--ink-2)",
                    lineHeight: 1.5,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Icon.info size={14} color="var(--clay-d)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    <b>{lang === "de" ? "Histamin-reich" : "Histamine-rich"}</b> —{" "}
                    {lang === "de"
                      ? "überwache Symptome in den nächsten 24 h."
                      : "watch symptoms over the next 24 h."}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Btn kind="sage" size="sm" icon={<Icon.check size={13} />}>
                    {t("stimmt")}
                  </Btn>
                  <Btn kind="ghost" size="sm">
                    {t("bearbeiten")}
                  </Btn>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{lang === "de" ? "Heute · Mahlzeiten" : "Today · meals"}</h3>
              <span className="head-sub">
                {today.foods.length} {today.foods.length === 1 ? t("mahlzeit") : t("mahlzeiten")}
              </span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {[
                {
                  time: "08:15",
                  label: lang === "de" ? "Haferflocken, Banane, Joghurt" : "Oats, banana, yogurt",
                  tag: null,
                },
                {
                  time: "12:30",
                  label:
                    lang === "de" ? "Pasta mit Tomatensauce, Parmesan" : "Pasta with tomato sauce, parmesan",
                  tag: "Histamin",
                },
                { time: "15:50", label: lang === "de" ? "Apfel, grüner Tee" : "Apple, green tea", tag: null },
              ].map((m, i) => (
                <div key={i} className="row" style={{ gridTemplateColumns: "60px 1fr auto" }}>
                  <span className="num" style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
                    {m.time}
                  </span>
                  <span style={{ fontSize: 13 }}>{m.label}</span>
                  {m.tag && <span className="pill clay">{m.tag}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>{lang === "de" ? "Tagesform" : "Daily state"}</h3>
              <span className="head-sub">{lang === "de" ? "manuell" : "manual"}</span>
            </div>
            <div className="card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon.bolt size={18} color="var(--clay-d)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t("stress")}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t("stress_skala")}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStress(n)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      background:
                        n <= stress ? `oklch(${0.86 - n * 0.04} ${0.05 + n * 0.02} ${65 - n * 8})` : "var(--card)",
                      color: n <= stress ? "var(--ink)" : "var(--ink-3)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div style={{ height: 1, background: "var(--line-2)", margin: "18px 0" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon.moon size={18} color="var(--sage-d)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t("schlaf_letzte")}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {lang === "de" ? "Schiebe, um zu setzen" : "Drag to set"}
                  </div>
                </div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>
                  {sleep.toFixed(1)}
                  <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 2 }}>h</span>
                </div>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                step={0.1}
                value={sleep}
                onChange={(e) => setSleep(+e.target.value)}
                style={{ width: "100%", accentColor: "var(--sage-d)", marginTop: 8 }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>3h</span>
                <span>6h</span>
                <span>10h</span>
              </div>

              <div style={{ height: 1, background: "var(--line-2)", margin: "18px 0" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon.run size={18} color="var(--clay-d)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t("bewegung")}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{lang === "de" ? "Heute" : "Today"}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {[
                  { id: "lauf", de: "Laufen", en: "Running" },
                  { id: "yoga", de: "Yoga", en: "Yoga" },
                  { id: "rad", de: "Radfahren", en: "Cycling" },
                  { id: "kraft", de: "Krafttraining", en: "Strength" },
                  { id: "spazier", de: "Spaziergang", en: "Walk" },
                  { id: "keine", de: "Keine", en: "None" },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActivity(a.id)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid " + (a.id === activity ? "var(--ink)" : "var(--line)"),
                      background: a.id === activity ? "var(--ink)" : "var(--card)",
                      color: a.id === activity ? "var(--bg)" : "var(--ink)",
                    }}
                  >
                    {a[lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className="card card-pad"
            style={{ background: "linear-gradient(180deg, color-mix(in oklch, var(--sage) 14%, var(--card)), var(--card))" }}
          >
            <div className="stat-label">
              SCORAD live · {lang === "de" ? "aus aktueller Eingabe" : "from current input"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <div className="stat-num">{today.scorad.toFixed(1)}</div>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("score_skala")}</span>
              <span style={{ marginLeft: "auto" }} className="pill sage">
                ↓ {Math.abs(data.days[28].scorad - today.scorad).toFixed(1)}{" "}
                {lang === "de" ? "vs. gestern" : "vs. yesterday"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
              {[
                { l: lang === "de" ? "Fläche" : "Area", v: "20%" },
                { l: lang === "de" ? "Intensität" : "Intensity", v: "5.4" },
                { l: lang === "de" ? "Subjektiv" : "Subjective", v: today.itch.toFixed(1) },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--card)", borderRadius: 10, padding: "10px 12px" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {s.l}
                  </div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="card card-pad"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 12,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            <Icon.info size={20} color="var(--ink-3)" />
            <span>
              {lang === "de" ? (
                <>
                  Eintrag <span className="num">#{data.days.length}</span> · gespeichert auf deinem Gerät, optional
                  verschlüsselt synchronisiert via DiGA-Schnittstelle.
                </>
              ) : (
                <>
                  Entry <span className="num">#{data.days.length}</span> · stored on-device, optionally encrypted-sync
                  via DiGA interface.
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
