import { useEffect, useState } from "react";
import {
  createAgentReceipt,
  createDiaryEntry,
  createFlareObservation,
  createTreatmentApplication,
  DEMO_USER_ID,
} from "../api";
import { RankedBars, RiskGauge, SCORADChart } from "../charts";
import type { DermaTrackData, Lang } from "../data";
import { Icon } from "../icons";
import type { Route } from "../shell";
import type { ChatMessage } from "./AgentChat";
import {
  BackfillDraftArtifact,
  ConfirmCard,
  FlareDetectiveArtifact,
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
      ? `Deine Haut erholt sich — und ich habe drei Muster gefunden, die du kennen solltest.`
      : `Your skin is recovering — and I've found three patterns you should know about.`;

  return [
    {
      id: newId(),
      role: "agent",
      hero: true,
      ts: new Date(),
      text: briefing,
      widget: (
        <HeroBriefingWidget data={data} lang={lang} peak={peak} peakDay={peakDay} onRoute={onRoute} />
      ),
    },
  ];
}

function HeroBriefingWidget({
  data,
  lang,
  peak,
  peakDay,
  onRoute,
}: {
  data: DermaTrackData;
  lang: Lang;
  peak: DermaTrackData["forecast"][number];
  peakDay: string;
  onRoute: (r: Route) => void;
}) {
  const [stage, setStage] = useState(0);
  const draftingLabels =
    lang === "de"
      ? [
          "Verlauf wird als Trend-Insight formuliert",
          "Auslöser werden nach Signalstärke sortiert",
          "Muster wird als Nutzer-Insight geschrieben",
          "Nächste Aktion wird vorgeschlagen",
        ]
      : [
          "Drafting trend insight from 30 days",
          "Ranking triggers by signal strength",
          "Writing the individual pattern insight",
          "Preparing the next recommended action",
        ];

  useEffect(() => {
    setStage(0);
    const timers = [1850, 2800, 3800, 4800, 5650].map((delay, index) =>
      window.setTimeout(() => setStage(index + 1), delay),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [data.today.date, lang]);

  const activeLabel = draftingLabels[Math.min(stage, draftingLabels.length - 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {stage < 5 && (
        <div
          className="dt-briefing-draft"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            color: "var(--sage-d)",
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span className="dt-think-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>{activeLabel}</span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.45fr 0.95fr 0.95fr",
          gap: 12,
          alignItems: "stretch",
          gridAutoRows: "1fr",
        }}
      >
        {stage >= 1 && (
          <div className="dt-stream-card">
            <DossierTile
              eyebrow={lang === "de" ? "01 · Verlauf" : "01 · Trend"}
              title={lang === "de" ? "SCORAD · 30 Tage" : "SCORAD · 30 days"}
              caption={`ø 22.4 · min 14.6 · max 31.2 · Δ -4.1`}
            >
              <SCORADChart days={data.days} height={150} width={460} highlightToday />
            </DossierTile>
          </div>
        )}

        {stage >= 2 && (
          <div className="dt-stream-card">
            <DossierTile
              eyebrow={lang === "de" ? "02 · Auslöser" : "02 · Triggers"}
              title={lang === "de" ? "Top 3 aktiv" : "Top 3 active"}
              caption={lang === "de" ? "tippe für volle Analyse" : "tap for full analysis"}
              onOpen={() => onRoute("triggers")}
            >
              <RankedBars items={data.triggers.slice(0, 3)} lang={lang} />
            </DossierTile>
          </div>
        )}

        {stage >= 3 && (
          <div className="dt-stream-card">
            <DossierTile
              eyebrow={lang === "de" ? "03 · Erkenntnis" : "03 · Insight"}
              title={data.insights[lang][0].title}
              accent="var(--clay)"
            >
              <div className="serif" style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}>
                "{data.insights[lang][0].body}"
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                <span className="pill clay">Histamin</span>
                <span className="pill neutral">+2.4</span>
                <span className="pill neutral">~24h</span>
                <span className="pill neutral">3x</span>
              </div>
            </DossierTile>
          </div>
        )}
      </div>

      {stage >= 4 && (
        <div className="dt-stream-card" style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}>
          {lang === "de"
            ? `Birkenpollen-Spitze ${peakDay} (${Math.round(peak.risk * 100)}% Risiko). Soll ich einen Plan vorschlagen?`
            : `Birch pollen peaks ${peakDay} (${Math.round(peak.risk * 100)}% risk). Want me to draft a plan?`}
        </div>
      )}
    </div>
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
        height: "100%",
        minHeight: 224,
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
    q.includes("backfill") ||
    q.includes("forgot") ||
    q.includes("last week") ||
    q.includes("approximately") ||
    q.includes("approximate") ||
    q.includes("fast food") ||
    q.includes("slept badly") ||
    q.includes("vergessen") ||
    q.includes("letzte woche") ||
    q.includes("ungefähr")
  ) {
    const monday = new Date(data.today.date);
    monday.setDate(monday.getDate() - 12);
    monday.setHours(12, 0, 0, 0);
    const weekDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
    const diaryPayloads = weekDates.map((date, index) => ({
      userId: DEMO_USER_ID,
      occurredAt: date.toISOString(),
      food:
        index === 1 || index === 3 || index === 4
          ? [
              {
                name: index === 3 ? "Pizza" : "Fast food",
                mealType: index === 1 ? "dinner" : "lunch",
                triggerCategories: ["dairy", "gluten", "histamine"],
                notes: "Estimated from natural-language backfill.",
              },
            ]
          : [],
      stress: { level: index >= 3 ? 7 : 5, source: "agent-estimated-backfill" },
      sleep: { hours: index >= 2 && index <= 5 ? 5.6 : 6.8, quality: index >= 2 && index <= 5 ? 2 : 3 },
      activeRashes:
        index === 3 || index === 4
          ? [
              {
                bodyRegionId: "arm-l-flex",
                side: "front",
                itchiness: index === 4 ? 8 : 6.5,
                dryness: 6.2,
                redness: 6.8,
                active: true,
                notes: "Estimated elbow flare from user memory.",
              },
              {
                bodyRegionId: "arm-r-flex",
                side: "front",
                itchiness: index === 4 ? 8 : 6.5,
                dryness: 6.2,
                redness: 6.8,
                active: true,
                notes: "Estimated elbow flare from user memory.",
              },
            ]
          : [],
      notes: "Estimated backfill from Derma Agent. Source: user memory, not exact daily log.",
    }));
    const flareDate = weekDates[4] ?? data.today.date;
    const treatmentDates = [weekDates[4], weekDates[5]].filter(Boolean);

    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Ich kann die Lücke rekonstruieren, ohne so zu tun, als wären es exakte Messwerte. Ich markiere alles als geschätzt, speichere die Quelle als Nutzer-Erinnerung und halte offene Details sichtbar.`
          : `I can reconstruct the gap without pretending it is exact. I’ll mark the records as estimated, preserve the source as user memory, and keep the missing details visible.`,
      widget: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <BackfillDraftArtifact lang={lang} onRoute={onRoute} />
          <ConfirmCard
            lang={lang}
            onConfirm={() =>
              Promise.all([
                ...diaryPayloads.map((payload) => createDiaryEntry(payload)),
                createFlareObservation({
                  userId: DEMO_USER_ID,
                  observedAt: flareDate.toISOString(),
                  bodyRegionId: "arm-l-flex",
                  side: "front",
                  intensity: 4,
                  itchiness: 8,
                  dryness: 6.2,
                  redness: 6.8,
                  scorradTotal: data.today.scorad + 3.8,
                  notes: "Estimated from natural-language backfill: elbows itchy around Thursday/Friday.",
                }),
                ...treatmentDates.map((date) =>
                  createTreatmentApplication({
                    userId: DEMO_USER_ID,
                    medicationId: "mometason",
                    appliedAt: date.toISOString(),
                    bodyRegionId: "arm-l-flex",
                    amount: "thin layer",
                    notes: "Estimated treatment application from natural-language backfill.",
                  }),
                ),
                createAgentReceipt({
                  userId: DEMO_USER_ID,
                  kind: "backfill.applied",
                  payload: {
                    range: "last-week",
                    estimated: true,
                    source: "natural-language-user-memory",
                    records: {
                      diaryEntries: 7,
                      foodEvents: 3,
                      poorSleepNights: 4,
                      flareObservations: 1,
                      treatmentApplications: 2,
                    },
                    missingFields: ["exact meals", "exact severity per day", "photo evidence"],
                  },
                }),
              ])
            }
            proposal={{
              title: lang === "de" ? "Geschätzte Woche anwenden" : "Apply approximate week",
              summary:
                lang === "de"
                  ? "7 Tage · 3 Fast-Food-Ereignisse · 4 schlechte Nächte · Ellenbogen-Flare · 2× Mometason · alles als geschätzt markiert"
                  : "7 days · 3 fast-food events · 4 poor-sleep nights · elbow flare · 2x mometasone · all marked estimated",
              confirmLabel: lang === "de" ? "Backfill anwenden" : "Apply backfill",
              declineLabel: lang === "de" ? "Nicht speichern" : "Don’t save",
              icon: <Icon.sparkle size={16} color="var(--sage-d)" />,
              accent: "var(--sage)",
            }}
            success={{
              title: lang === "de" ? "Geschätzte Woche gespeichert" : "Approximate week saved",
              artifact: (
                <div style={{ display: "grid", gap: 10 }}>
                  <SyncReceipt
                    label={lang === "de" ? "7 Tage rekonstruiert" : "7 days reconstructed"}
                    detail={lang === "de" ? "Geschätzt · Nutzer bestätigt · Quelle: Erinnerung" : "Estimated · user-confirmed · source: memory"}
                    lang={lang}
                    onRoute={onRoute}
                    route="entry"
                  />
                  <SyncReceipt
                    label={lang === "de" ? "Haut- und Therapie-Zeitachse ergänzt" : "Skin and treatment timeline updated"}
                    detail={lang === "de" ? "Ellenbogen-Flare · 2× Mometason · Arztbrief-Kontext aktualisiert" : "Elbow flare · 2x mometasone · doctor-letter context updated"}
                    lang={lang}
                    onRoute={onRoute}
                    route="skin"
                  />
                  <SyncReceipt
                    label={lang === "de" ? "Provenienz gespeichert" : "Provenance saved"}
                    detail={lang === "de" ? "Backfill-Receipt · geschätzt · keine Foto-Evidenz" : "Backfill receipt · estimated · no photo evidence"}
                    lang={lang}
                    onRoute={onRoute}
                    route="letter"
                  />
                </div>
              ),
            }}
          />
        </div>
      ),
    };
  }

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
    (q.includes("teilen") && (q.includes("daten") || q.includes("data"))) ||
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          <ConfirmCard
            lang={lang}
            onConfirm={() =>
              createAgentReceipt({
                userId: DEMO_USER_ID,
                kind: "privacy.audit.saved",
                payload: {
                  windowDays: 14,
                  connections: ["Dr. Lehmann", "ePA", "Apple Health"],
                  blockedCategories: ["raw-photos", "voice-notes"],
                  unusualAccess: false,
                },
              })
            }
            proposal={{
              title: lang === "de" ? "Privacy-Review speichern" : "Save privacy review",
              summary:
                lang === "de"
                  ? "Agent speichert einen Audit-Beleg: Rohfotos und Voice Notes bleiben gesperrt, Praxis sieht nur Berichtsdaten."
                  : "Agent saves an audit receipt: raw photos and voice notes stay blocked, clinic sees report data only.",
              confirmLabel: lang === "de" ? "Audit speichern" : "Save audit",
              icon: <Icon.check size={16} color="var(--sage-d)" />,
              accent: "var(--sage)",
            }}
            success={{
              title: lang === "de" ? "Audit-Beleg gespeichert" : "Audit receipt saved",
              artifact: (
                <SyncReceipt
                  label={lang === "de" ? "Privacy-Agent hat Freigaben geprüft" : "Privacy agent reviewed access"}
                  detail={
                    lang === "de"
                      ? "14 Tage · 3 Verbindungen · 0 ungewöhnliche Zugriffe"
                      : "14 days · 3 connections · 0 unusual accesses"
                  }
                  lang={lang}
                  onRoute={onRoute}
                  route="connections"
                />
              ),
            }}
          />
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
          ? `Ich habe den schwersten Tag (SCORAD ${worst.scorad.toFixed(1)}) als Untersuchung geöffnet. Die wahrscheinlichste Erklärung ist kein einzelner Auslöser, sondern ein Stack: Histamin am Vorabend, Schlafdefizit und Birkenpollen am Peak-Tag.

Ich habe Gegenbeweise markiert und daraus einen 48h-Testplan abgeleitet.`
          : `I opened the worst day (SCORAD ${worst.scorad.toFixed(1)}) as an investigation. The likely explanation is not one trigger, but a stack: histamine the evening before, sleep debt and birch pollen on the peak day.

I marked counter-evidence and turned it into a 48h test plan.`,
      widget: <FlareDetectiveArtifact data={data} lang={lang} onRoute={onRoute} />,
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
