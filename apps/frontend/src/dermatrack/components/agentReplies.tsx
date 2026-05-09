import {
  createAgentReceipt,
  createDiaryEntry,
  createFlareObservation,
  createTreatmentApplication,
  DEMO_USER_ID,
} from "../api";
import { MiniSpark, RankedBars, RiskGauge, SCORADChart } from "../charts";
import type { DermaTrackData, Lang } from "../data";
import { Icon } from "../icons";
import type { Route } from "../shell";
import type { ChatMessage } from "./AgentChat";
import {
  ConfirmCard,
  FlareLoggedArtifact,
  LetterPreviewArtifact,
  MealLoggedArtifact,
  ReminderArtifact,
  SyncReceipt,
} from "./AgentArtifacts";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ── seed (hero briefing) ───────────────────────────────────

export function seedMessages(
  data: DermaTrackData,
  lang: Lang,
  onRoute: (r: Route) => void,
): ChatMessage[] {
  const recent7 = data.days.slice(-7);
  const lastWeekAvg = data.days.slice(-14, -7).reduce((s, d) => s + d.scorad, 0) / 7;
  const thisWeekAvg = recent7.reduce((s, d) => s + d.scorad, 0) / 7;
  const delta = thisWeekAvg - lastWeekAvg;
  const peak = data.forecast.reduce((a, b) => (a.risk > b.risk ? a : b));
  const peakIdx = data.forecast.indexOf(peak);
  const peakDay =
    peakIdx === 0
      ? lang === "de"
        ? "morgen"
        : "tomorrow"
      : peakIdx === 1
      ? lang === "de"
        ? "übermorgen"
        : "in 2 days"
      : lang === "de"
      ? `in ${peakIdx + 1} Tagen`
      : `in ${peakIdx + 1} days`;

  const briefing =
    lang === "de"
      ? `Guten Morgen, Lena.\nDeine Haut erholt sich — und ich habe drei Muster gefunden, die du kennen solltest.`
      : `Good morning, Lena.\nYour skin is recovering — and I've found three patterns you should know about.`;

  return [
    {
      id: newId(),
      role: "agent",
      hero: true,
      ts: new Date(),
      text: briefing,
      widget: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Stat ribbon */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-2)",
              padding: "10px 14px",
              border: "1px solid var(--line)",
              borderRadius: 14,
              background: "var(--card)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Stat label="7d ⌀" value={thisWeekAvg.toFixed(1)} />
            <Stat
              label={lang === "de" ? "Δ Vorwoche" : "Δ prev"}
              value={(delta < 0 ? "↓" : "↑") + " " + Math.abs(delta).toFixed(1)}
              accent={delta < 0 ? "var(--sage-d)" : "var(--clay-d)"}
            />
            <Stat
              label={lang === "de" ? "Spitze" : "Peak"}
              value={Math.round(peak.risk * 100) + "%"}
              accent="var(--clay-d)"
            />
            <Stat label={lang === "de" ? "Streak" : "streak"} value={`${data.streak}d`} />
            <span
              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {lang === "de" ? "Verlauf 14d" : "trend 14d"}
              </span>
              <MiniSpark
                values={data.days.slice(-14).map((d) => d.scorad)}
                width={70}
                height={20}
                color="var(--sage-d)"
              />
            </span>
          </div>

          {/* 3-tile dossier */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr",
              gap: 14,
            }}
          >
            <DossierTile
              eyebrow={lang === "de" ? "01 · Verlauf" : "01 · Trend"}
              title={lang === "de" ? "SCORAD · 30 Tage" : "SCORAD · 30 days"}
              caption={`⌀ 22.4 · min 14.6 · max 31.2 · Δ −4.1`}
            >
              <SCORADChart days={data.days} height={150} width={460} highlightToday />
            </DossierTile>

            <DossierTile
              eyebrow={lang === "de" ? "02 · Auslöser" : "02 · Triggers"}
              title={lang === "de" ? "Top 3 aktiv" : "Top 3 active"}
              caption={lang === "de" ? "tippe für volle Analyse" : "tap for full analysis"}
              onOpen={() => onRoute("triggers")}
            >
              <RankedBars items={data.triggers.slice(0, 3)} lang={lang} />
            </DossierTile>

            <DossierTile
              eyebrow={lang === "de" ? "03 · Erkenntnis" : "03 · Insight"}
              title={data.insights[lang][0].title}
              accent="var(--clay)"
            >
              <div className="serif" style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}>
                „{data.insights[lang][0].body}"
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                <span className="pill clay">Histamin</span>
                <span className="pill neutral">+2.4</span>
                <span className="pill neutral">~24h</span>
                <span className="pill neutral">3×</span>
              </div>
            </DossierTile>
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 4 }}>
            {lang === "de"
              ? `Birkenpollen-Spitze ${peakDay} (${Math.round(peak.risk * 100)}% Risiko). Soll ich einen Plan vorschlagen?`
              : `Birch pollen peaks ${peakDay} (${Math.round(peak.risk * 100)}% risk). Want me to draft a plan?`}
          </div>
        </div>
      ),
    },
  ];
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1 }}>
      <span
        style={{
          fontSize: 9,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span style={{ fontWeight: 700, color: accent || "var(--ink)", fontSize: 13 }}>{value}</span>
    </span>
  );
}

interface DossierTileProps {
  eyebrow: string;
  title: string;
  caption?: string;
  accent?: string;
  onOpen?: () => void;
  children: React.ReactNode;
}

function DossierTile({ eyebrow, title, caption, accent, onOpen, children }: DossierTileProps) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 14,
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: onOpen ? "pointer" : "default",
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </span>
        {onOpen && <Icon.arrowRight size={12} color="var(--ink-3)" />}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {caption && (
        <div
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
            marginTop: 4,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

// ── reply router ───────────────────────────────────────────

export function computeReply(
  query: string,
  data: DermaTrackData,
  lang: Lang,
  onRoute: (r: Route) => void,
): ChatMessage {
  const q = query.toLowerCase();
  const ts = new Date();

  if (
    (q.includes("pasta") || q.includes("cheese") || q.includes("käse") || q.includes("ate") || q.includes("gegessen")) &&
    (q.includes("elbow") || q.includes("ellen") || q.includes("itch") || q.includes("juck"))
  ) {
    const foods = ["Pasta", "Aged cheese"];
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Ich erkenne zwei Signale: Mahlzeit mit möglichen Triggern und akuter Juckreiz an der linken Ellenbeuge. Ich kann beides als zusammenhängendes Ereignis speichern und danach die Trigger-Analyse aktualisieren.`
          : `I see two signals: a meal with likely triggers and acute itch on the left elbow flexure. I can save both as one linked event and refresh the trigger analysis.`,
      widget: (
        <ConfirmCard
          lang={lang}
          onConfirm={() =>
            Promise.all([
              createDiaryEntry({
                userId: DEMO_USER_ID,
                occurredAt: new Date().toISOString(),
                food: [
                  { name: "Pasta", mealType: "lunch", triggerCategories: ["gluten"] },
                  { name: "Aged cheese", mealType: "lunch", triggerCategories: ["dairy", "histamine"] },
                ],
                stress: { level: 4, source: "agent-note" },
                activeRashes: [
                  {
                    bodyRegionId: "arm-l-flex",
                    side: "front",
                    itchiness: 6.5,
                    dryness: 5.2,
                    redness: 5.8,
                    active: true,
                    notes: "Linked by Derma Agent: lunch + itch event.",
                  },
                ],
                notes: "Agent-linked food and flare event.",
              }),
              createFlareObservation({
                userId: DEMO_USER_ID,
                observedAt: new Date().toISOString(),
                bodyRegionId: "arm-l-flex",
                side: "front",
                intensity: 3,
                itchiness: 6.5,
                dryness: 5.2,
                redness: 5.8,
                scorradTotal: data.today.scorad,
                notes: "Linked by Derma Agent to pasta + aged cheese lunch.",
              }),
            ])
          }
          proposal={{
            title: lang === "de" ? "2 Signale speichern" : "Save 2 linked signals",
            summary:
              lang === "de"
                ? "Mittagessen + linker Ellenbogen · Gluten, Milch, Histamin · Trigger-Modell aktualisieren"
                : "Lunch + left elbow · gluten, dairy, histamine · refresh trigger model",
            confirmLabel: lang === "de" ? "Speichern & analysieren" : "Save & analyze",
            icon: <Icon.sparkle size={16} color="var(--sage-d)" />,
            accent: "var(--sage)",
          }}
          success={{
            title: lang === "de" ? "Ereignis gespeichert" : "Linked event saved",
            artifact: (
              <div style={{ display: "grid", gap: 10 }}>
                <MealLoggedArtifact
                  mealLabel={lang === "de" ? "Mittagessen · jetzt" : "Lunch · now"}
                  foods={foods}
                  flagged={["Aged cheese"]}
                  lang={lang}
                  onRoute={onRoute}
                />
                <FlareLoggedArtifact
                  region={lang === "de" ? "Ellenbeuge links" : "Left elbow flexure"}
                  severity={6.5}
                  lang={lang}
                  onRoute={onRoute}
                />
                <SyncReceipt
                  label={lang === "de" ? "Trigger-Analyse aktualisiert" : "Trigger analysis refreshed"}
                  detail={lang === "de" ? "Lag-Fenster 12-36h · Histamin-Konfidenz +4%" : "12-36h lag window · histamine confidence +4%"}
                  lang={lang}
                  onRoute={onRoute}
                  route="triggers"
                />
              </div>
            ),
          }}
        />
      ),
    };
  }

  // Pollen / plan / antihistamine → ConfirmCard for setReminder
  if (
    q.includes("pollen") ||
    q.includes("birke") ||
    q.includes("birch") ||
    q.includes("plan") ||
    q.includes("antihist") ||
    q.includes("reminder") ||
    q.includes("erinner")
  ) {
    const peak = data.forecast.reduce((a, b) => (a.risk > b.risk ? a : b));
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Plan für die Spitze (${Math.round(peak.risk * 100)}% Risiko, Birke ${peak.birch}/4):

1. Heute Abend Cetirizin 10 mg — wirkt über Nacht
2. Morgen früh Pflegelotion + Mometason an Ellenbeugen
3. Sport drinnen halten, Lüften erst nach 22 Uhr

Ich kann eine Erinnerung für 21:00 setzen.`
          : `Plan for the peak (${Math.round(peak.risk * 100)}% risk, birch ${peak.birch}/4):

1. Tonight: cetirizine 10 mg — works overnight
2. Morning: emollient + mometasone on elbow flexures
3. Keep workouts indoors, ventilate after 22:00

I can set a reminder for 21:00.`,
      widget: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              padding: 14,
              border: "1px solid var(--line)",
              borderRadius: 14,
              background: "var(--card)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ width: 110, flexShrink: 0 }}>
              <RiskGauge value={peak.risk} label={lang === "de" ? "Spitze" : "Peak"} size={110} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="pill clay" style={{ alignSelf: "flex-start" }}>
                <Icon.pill size={11} /> Cetirizin · 10 mg
              </span>
              <span className="pill sage" style={{ alignSelf: "flex-start" }}>
                <Icon.droplet size={11} /> {lang === "de" ? "Pflege 2×" : "Emollient 2×"}
              </span>
              <button
                onClick={() => onRoute("forecast")}
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--sage-d)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                }}
              >
                {lang === "de" ? "Vorhersage öffnen →" : "Open forecast →"}
              </button>
            </div>
          </div>
          <ConfirmCard
            lang={lang}
            onConfirm={() =>
              Promise.all([
                createTreatmentApplication({
                  userId: DEMO_USER_ID,
                  medicationId: "antihist",
                  appliedAt: new Date(new Date().setHours(21, 0, 0, 0)).toISOString(),
                  amount: "10 mg",
                  notes: "Agent-created pollen peak reminder.",
                }),
                createAgentReceipt({
                  userId: DEMO_USER_ID,
                  kind: "reminder.created",
                  payload: { medication: "Cetirizine 10 mg", time: "21:00", reason: "pollen peak" },
                }),
              ])
            }
            proposal={{
              title:
                lang === "de"
                  ? "Erinnerung: Cetirizin 21:00"
                  : "Reminder: cetirizine at 21:00",
              summary:
                lang === "de"
                  ? "Heute Abend 21:00 · Cetirizin 10 mg · Push-Benachrichtigung"
                  : "Tonight 21:00 · Cetirizine 10 mg · push notification",
              confirmLabel: lang === "de" ? "Erinnerung setzen" : "Set reminder",
              icon: <Icon.bell size={16} color="var(--sage-d)" />,
              accent: "var(--sage)",
            }}
            success={{
              title: lang === "de" ? "Erinnerung aktiv" : "Reminder active",
              artifact: (
                <ReminderArtifact
                  time="21:00"
                  label={lang === "de" ? "Cetirizin 10 mg" : "Cetirizine 10 mg"}
                  detail={lang === "de" ? "vor Pollenspitze" : "before pollen peak"}
                  lang={lang}
                />
              ),
            }}
          />
        </div>
      ),
    };
  }

  // Log meal → ConfirmCard for logMeal
  if (
    q.includes("log meal") ||
    q.includes("mahlzeit log") ||
    q.includes("logge") ||
    q.includes("eintragen") ||
    q.includes("log lunch") ||
    q.includes("log dinner") ||
    q.includes("ate") ||
    q.includes("gegessen")
  ) {
    const foods = ["Pasta", "Tomato sauce", "Parmesan", "Basil"];
    const flagged = ["Tomato sauce", "Parmesan"];
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Aus deiner letzten Foto-Aufnahme erkannt: Pasta, Tomatensauce, Parmesan, Basilikum. Histamin-Risiko: mittel.

Soll ich es als Mittagessen 12:30 in den Tageseintrag übernehmen?`
          : `From your latest photo: pasta, tomato sauce, parmesan, basil. Histamine risk: medium.

Want me to log it as lunch at 12:30?`,
      widget: (
        <ConfirmCard
          lang={lang}
          onConfirm={() =>
            createDiaryEntry({
              userId: DEMO_USER_ID,
              occurredAt: new Date().toISOString(),
              food: [
                { name: "Pasta", mealType: "lunch", triggerCategories: ["gluten"] },
                { name: "Tomato sauce", mealType: "lunch", triggerCategories: ["histamine", "nightshades"] },
                { name: "Parmesan", mealType: "lunch", triggerCategories: ["dairy", "histamine"] },
                { name: "Basil", mealType: "lunch", triggerCategories: [] },
              ],
              notes: "Agent-confirmed lunch from photo.",
            })
          }
          proposal={{
            title:
              lang === "de"
                ? "Mittagessen 12:30 loggen"
                : "Log lunch 12:30",
            summary:
              lang === "de"
                ? "4 Zutaten · 2 Histamin-Flags · in Ernährung speichern"
                : "4 ingredients · 2 histamine flags · save to nutrition",
            confirmLabel: lang === "de" ? "Mahlzeit loggen" : "Log meal",
            icon: <Icon.bowl size={16} color="var(--clay-d)" />,
            accent: "var(--clay)",
          }}
          success={{
            title: lang === "de" ? "Mahlzeit geloggt" : "Meal logged",
            artifact: (
              <MealLoggedArtifact
                mealLabel={lang === "de" ? "Mittagessen · 12:30" : "Lunch · 12:30"}
                foods={foods}
                flagged={flagged}
                lang={lang}
                onRoute={onRoute}
              />
            ),
          }}
        />
      ),
    };
  }

  // Connections / data access / "who has access"
  if (
    q.includes("zugriff") ||
    q.includes("access") ||
    q.includes("freigabe") ||
    q.includes("permission") ||
    q.includes("praxis sehen") ||
    q.includes("epa") ||
    q.includes("teilen") && (q.includes("daten") || q.includes("data")) ||
    q.includes("wer sieht") ||
    q.includes("who sees") ||
    q.includes("share data")
  ) {
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Aktuell sind drei Verbindungen aktiv: Dr. Lehmann (TI-Messenger · 4 Kategorien), ePA (gematik · 5 Kategorien), Apple Health (Lesezugriff · 1 Kategorie). Voll-Audit der letzten 14 Tage liegt vor — keine ungewöhnlichen Zugriffe.`
          : `Three active connections right now: Dr. Lehmann (TI-Messenger · 4 categories), ePA (gematik · 5 categories), Apple Health (read-only · 1 category). Full audit for the last 14 days is on file — no unusual access.`,
      widget: (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: 14,
            border: "1px solid var(--line)",
            borderRadius: 14,
            background: "var(--card)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {[
            {
              name: "Dr. Lehmann",
              detail: lang === "de" ? "Praxis Mitte · TI-Messenger" : "Praxis Mitte · TI-Messenger",
              brand: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
              shared: 4,
            },
            {
              name: "ePA",
              detail: lang === "de" ? "Patientenakte · gematik" : "Patient record · gematik",
              brand: "linear-gradient(135deg, oklch(0.55 0.12 250), oklch(0.42 0.14 260))",
              shared: 5,
            },
            {
              name: "Apple Health",
              detail: lang === "de" ? "Lesezugriff · iPhone" : "Read-only · iPhone",
              brand: "linear-gradient(135deg, oklch(0.66 0.18 25), oklch(0.74 0.15 35))",
              shared: 1,
            },
          ].map((c) => (
            <div
              key={c.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: c.brand,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon.share size={12} color="#fff" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                  {c.detail}
                </div>
              </div>
              <span className="num" style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-d)" }}>
                {c.shared}{" "}
                <span style={{ fontSize: 9, color: "var(--ink-3)" }}>
                  {lang === "de" ? "geteilt" : "shared"}
                </span>
              </span>
            </div>
          ))}
          <button
            onClick={() => onRoute("connections")}
            style={{
              alignSelf: "flex-start",
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
              marginTop: 4,
            }}
          >
            {lang === "de" ? "Datenfreigabe verwalten" : "Manage connections"}
            <Icon.arrowRight size={11} color="var(--sage-d)" />
          </button>
        </div>
      ),
    };
  }

  // Doctor letter → inline LetterPreviewArtifact
  if (
    q.includes("arztbrief") ||
    q.includes("letter") ||
    q.includes("doctor") ||
    q.includes("praxis") ||
    q.includes("draft")
  ) {
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Arztbrief vorbereitet — 30-Tage-SCORAD-Verlauf, Top-5-Trigger, Foto-Zeitachse, Behandlungswirkung und Lokalisationskarte. Empfänger: Dr. Lehmann.`
          : `Doctor letter ready — 30-day SCORAD trend, top-5 triggers, photo timeline, treatment effect and body map. Recipient: Dr. Lehmann.`,
      widget: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <LetterPreviewArtifact data={data} lang={lang} onRoute={onRoute} />
          <ConfirmCard
            lang={lang}
            onConfirm={() =>
              createAgentReceipt({
                userId: DEMO_USER_ID,
                kind: "doctor-letter.sent",
                payload: {
                  recipient: "Dr. Lehmann · Praxis Mitte",
                  transport: "TI-Messenger",
                  sections: ["scorad", "triggers", "photos", "treatment", "body-map"],
                },
              })
            }
            proposal={{
              title: lang === "de" ? "Brief an Praxis senden" : "Send letter to clinic",
              summary:
                lang === "de"
                  ? "Über TI-Messenger · digital signiert · Dr. Lehmann"
                  : "Via TI-Messenger · digitally signed · Dr. Lehmann",
              confirmLabel: lang === "de" ? "Senden" : "Send",
              icon: <Icon.share size={16} color="var(--sage-d)" />,
              accent: "var(--sage)",
            }}
            success={{
              title: lang === "de" ? "Sicher übertragen" : "Securely sent",
              artifact: (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--ink-2)",
                  }}
                >
                  <Icon.check size={16} color="var(--sage-d)" />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>
                      Dr. Lehmann · Praxis Mitte
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--ink-3)",
                        marginTop: 2,
                      }}
                    >
                      TI-Messenger · 09.05.2026 · SHA 4f8a…d3c1
                    </div>
                  </div>
                </div>
              ),
            }}
          />
        </div>
      ),
    };
  }

  // Worst day / past flare
  if (
    q.includes("mittwoch") ||
    q.includes("wednesday") ||
    q.includes("schub") ||
    q.includes("flare") ||
    q.includes("worst") ||
    q.includes("schlimmst")
  ) {
    const worst = data.days.slice().sort((a, b) => b.scorad - a.scorad)[0];
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Den schwersten Tag (SCORAD ${worst.scorad.toFixed(1)}) habe ich auf drei gestapelte Signale zurückgeführt:

· Vorabend: Rotwein + reifer Käse (Histamin)
· Schlaf nur ${worst.sleepH}h
· Birkenpollen ${worst.birchPollen}/4

Effektgröße zusammen: ~+5.8 SCORAD ggü. Baseline.`
          : `I traced the worst day (SCORAD ${worst.scorad.toFixed(1)}) to three signals that stacked:

· Night before: red wine + aged cheese (histamine)
· Sleep only ${worst.sleepH}h
· Birch pollen ${worst.birchPollen}/4

Combined effect: ~+5.8 SCORAD vs. baseline.`,
      widget: (
        <div
          style={{
            padding: 14,
            border: "1px solid var(--line)",
            borderRadius: 14,
            background: "var(--card)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <RankedBars items={data.triggers.slice(0, 3)} lang={lang} />
        </div>
      ),
    };
  }

  // Treatment compare
  if (
    q.includes("behandlung") ||
    q.includes("treatment") ||
    q.includes("medikament") ||
    q.includes("salbe") ||
    q.includes("creme")
  ) {
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Aus deinen 30 Tagen: Mometason wirkt am schnellsten — −3.4 SCORAD in 24 h, 6 Anwendungen. Hydrocortison ist langsamer (−2.1) aber gut für leichtere Tage. Pflegelotion allein hält die Baseline.

Soll ich einen Vergleich öffnen?`
          : `From your 30 days: mometasone works fastest — −3.4 SCORAD in 24 h across 6 applications. Hydrocortisone is slower (−2.1) but good for milder days. Emollient alone holds baseline.

Want me to open a side-by-side?`,
      widget: (
        <ConfirmCard
          lang={lang}
          onConfirm={() =>
            createTreatmentApplication({
              userId: DEMO_USER_ID,
              medicationId: "mometason",
              appliedAt: new Date().toISOString(),
              bodyRegionId: "arm-l-flex",
              amount: "thin layer",
              notes: "Agent-confirmed treatment action from efficacy comparison.",
            })
          }
          proposal={{
            title: lang === "de" ? "Mometason-Anwendung speichern" : "Save mometasone application",
            summary:
              lang === "de"
                ? "Ellenbeuge links · dünne Schicht · Wirkung wird in 24h verglichen"
                : "Left elbow flexure · thin layer · effect will be compared in 24h",
            confirmLabel: lang === "de" ? "Behandlung speichern" : "Save treatment",
            icon: <Icon.pill size={16} color="var(--sage-d)" />,
            accent: "var(--sage)",
          }}
          success={{
            title: lang === "de" ? "Behandlung gespeichert" : "Treatment saved",
            artifact: (
              <SyncReceipt
                label={lang === "de" ? "Mometason · Ellenbeuge links" : "Mometasone · left elbow"}
                detail={lang === "de" ? "Wirkfenster 24h · Vergleich aktiviert" : "24h effect window · comparison active"}
                lang={lang}
                onRoute={onRoute}
                route="treatment"
              />
            ),
          }}
        />
      ),
    };
  }

  // Triggers
  if (
    q.includes("trigger") ||
    q.includes("auslös") ||
    q.includes("wein") ||
    q.includes("wine") ||
    q.includes("histam") ||
    q.includes("essen") ||
    q.includes("food")
  ) {
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Top-Trigger nach Effektstärke und Konfidenz, sortiert über deine 30 Tage:`
          : `Top triggers by effect size and confidence over your 30 days:`,
      widget: (
        <div
          style={{
            padding: 14,
            border: "1px solid var(--line)",
            borderRadius: 14,
            background: "var(--card)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <RankedBars items={data.triggers.slice(0, 4)} lang={lang} />
          <button
            onClick={() => onRoute("triggers")}
            style={{
              marginTop: 10,
              fontSize: 11,
              fontWeight: 700,
              color: "var(--sage-d)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {lang === "de" ? "Volle Analyse →" : "Full analysis →"}
          </button>
        </div>
      ),
    };
  }

  return {
    id: newId(),
    role: "agent",
    ts,
    text:
      lang === "de"
        ? `Ich habe Zugriff auf deinen SCORAD-Verlauf, Mahlzeiten, Trigger, Behandlungen, Foto-KI und Pollen-Vorhersage. Probier z. B. "Plan für die Pollen-Spitze" oder "Mittagessen loggen".`
        : `I can see your SCORAD trend, meals, triggers, treatments, photo AI and pollen forecast. Try "plan for the pollen peak" or "log my lunch".`,
  };
}
