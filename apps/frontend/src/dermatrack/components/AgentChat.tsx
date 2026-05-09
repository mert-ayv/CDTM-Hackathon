import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DermaTrackData, Lang } from "../data";
import { fmtTime, useT } from "../i18n";
import { Icon } from "../icons";
import type { Route } from "../shell";
import { MiniSpark, RankedBars, RiskGauge } from "../charts";

export interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text?: string;
  widget?: ReactNode;
  ts: Date;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface AgentChatProps {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
}

export function AgentChat({ data, lang, onRoute }: AgentChatProps) {
  const t = useT(lang);
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages(data, lang, onRoute));
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: newId(), role: "user", text, ts: new Date() }]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      const reply = computeReply(text, data, lang, onRoute);
      setMessages((m) => [...m, reply]);
      setThinking(false);
    }, 900);
  };

  const prompts: PromptDef[] = [
    {
      label: lang === "de" ? "Plan für Pollen-Spitze" : "Plan for the pollen peak",
      query: lang === "de" ? "Plan für die Pollen-Spitze" : "Plan for the pollen peak",
    },
    {
      label: lang === "de" ? "Was hat letzten Mittwoch ausgelöst?" : "What triggered last Wednesday?",
      query: lang === "de" ? "Was hat letzten Mittwoch ausgelöst?" : "What triggered last Wednesday?",
    },
    {
      label: lang === "de" ? "Welche Behandlung wirkt am besten?" : "Which treatment works best?",
      query: lang === "de" ? "Welche Behandlung wirkt am besten?" : "Which treatment works best?",
    },
    {
      label: lang === "de" ? "Arztbrief vorbereiten" : "Draft doctor letter",
      query: lang === "de" ? "Arztbrief vorbereiten" : "Draft doctor letter",
    },
  ];

  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        overflow: "hidden",
        background:
          "linear-gradient(180deg, color-mix(in oklch, var(--sage) 8%, var(--card)), var(--card) 35%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          borderBottom: "1px solid var(--line-2)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 12px -4px oklch(0.45 0.05 155 / 0.5)",
          }}
        >
          <Icon.sparkle size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {lang === "de" ? "DermaTrack Agent" : "DermaTrack Agent"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--good)",
                boxShadow: "0 0 0 3px color-mix(in oklch, var(--good) 25%, transparent)",
              }}
            />
            {lang === "de"
              ? "VERBUNDEN · 30 TAGE · 14 REGIONEN · 5 MEDIKAMENTE"
              : "CONNECTED · 30 DAYS · 14 REGIONS · 5 MEDICATIONS"}
          </div>
        </div>
        <span
          className="pill neutral"
          style={{ height: 22, fontSize: 10, fontFamily: "var(--font-mono)" }}
        >
          v0.4.2
        </span>
      </div>

      {/* Thread */}
      <div
        ref={threadRef}
        className="scroll"
        style={{
          padding: "18px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          height: 380,
        }}
      >
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} lang={lang} />
        ))}
        {thinking && <ThinkingRow lang={lang} />}
      </div>

      {/* Suggested prompts */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "10px 18px 0",
        }}
      >
        {prompts.map((p) => (
          <button
            key={p.label}
            onClick={() => send(p.query)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 11px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink-2)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icon.sparkle size={11} color="var(--sage-d)" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div
        style={{
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            padding: "10px 14px",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Icon.sparkle size={14} color="var(--sage-d)" />
          <input
            type="text"
            value={input}
            placeholder={
              lang === "de"
                ? "Frag den Agent etwas zu deinen Daten…"
                : "Ask the agent anything about your data…"
            }
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              color: "var(--ink)",
              fontFamily: "inherit",
            }}
          />
          <button
            title={lang === "de" ? "Sprache" : "Voice"}
            style={{
              border: "none",
              background: "transparent",
              padding: 4,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--ink-3)",
            }}
          >
            <Icon.mic size={15} />
          </button>
        </div>
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || thinking}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: input.trim() ? "var(--ink)" : "var(--bg-2)",
            color: input.trim() ? "var(--bg)" : "var(--ink-3)",
            border: "1px solid " + (input.trim() ? "var(--ink)" : "var(--line)"),
            display: "grid",
            placeItems: "center",
            cursor: input.trim() ? "pointer" : "not-allowed",
            transition: "background 120ms ease",
          }}
        >
          <Icon.arrowUp size={16} color={input.trim() ? "var(--bg)" : "var(--ink-3)"} />
        </button>
      </div>
      <div
        style={{
          padding: "0 18px 14px",
          fontSize: 10,
          color: "var(--ink-3)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
        }}
      >
        {lang === "de"
          ? "Antworten basieren auf deinen letzten 30 Tagen · keine medizinische Beratung"
          : "Replies are based on your last 30 days · not medical advice"}
      </div>
      <span style={{ display: "none" }}>{t("ki_einsicht")}</span>
    </div>
  );
}

interface PromptDef {
  label: string;
  query: string;
}

function MessageRow({ message, lang }: { message: ChatMessage; lang: Lang }) {
  if (message.role === "user") {
    return (
      <div
        className="dt-msg"
        style={{ display: "flex", justifyContent: "flex-end" }}
      >
        <div
          style={{
            maxWidth: "72%",
            background: "var(--ink)",
            color: "var(--bg)",
            padding: "10px 14px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {message.text}
          <div
            style={{
              fontSize: 9,
              color: "color-mix(in oklch, var(--bg) 60%, transparent)",
              fontFamily: "var(--font-mono)",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {fmtTime(message.ts, lang)}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="dt-msg" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Icon.sparkle size={14} color="#fff" />
      </div>
      <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 8 }}>
        {message.text && (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              padding: "12px 14px",
              borderRadius: "16px 16px 16px 4px",
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--ink)",
              boxShadow: "var(--shadow-sm)",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.text}
            <div
              style={{
                fontSize: 9,
                color: "var(--ink-3)",
                fontFamily: "var(--font-mono)",
                marginTop: 6,
              }}
            >
              {fmtTime(message.ts, lang)}
            </div>
          </div>
        )}
        {message.widget}
      </div>
    </div>
  );
}

function ThinkingRow({ lang }: { lang: Lang }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon.sparkle size={14} color="#fff" />
      </div>
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          padding: "10px 14px",
          borderRadius: "16px 16px 16px 4px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--ink-3)",
        }}
      >
        <span className="dt-think-dots">
          <span />
          <span />
          <span />
        </span>
        <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
          {lang === "de" ? "DENKT NACH" : "THINKING"}
        </span>
      </div>
    </div>
  );
}

// ── seed + reply logic ─────────────────────────────────────

function seedMessages(data: DermaTrackData, lang: Lang, onRoute: (r: Route) => void): ChatMessage[] {
  const recent7 = data.days.slice(-7);
  const lastWeekAvg = data.days.slice(-14, -7).reduce((s, d) => s + d.scorad, 0) / 7;
  const thisWeekAvg = recent7.reduce((s, d) => s + d.scorad, 0) / 7;
  const delta = thisWeekAvg - lastWeekAvg;
  const peak = data.forecast.reduce((a, b) => (a.risk > b.risk ? a : b));
  const peakIdx = data.forecast.indexOf(peak);
  const peakDay = peakIdx === 0 ? (lang === "de" ? "morgen" : "tomorrow") : peakIdx === 1 ? (lang === "de" ? "übermorgen" : "in 2 days") : (lang === "de" ? `in ${peakIdx + 1} Tagen` : `in ${peakIdx + 1} days`);

  const text =
    lang === "de"
      ? `Guten Morgen, Lena. Ich habe deine letzten 30 Tage zusammengeführt — drei Dinge fallen auf:

· SCORAD ${delta < 0 ? "↓" : "↑"} ${Math.abs(delta).toFixed(1)} ggü. Vorwoche — ${delta < 0 ? "klare Verbesserung" : "leicht verschlechtert"}
· Birkenpollen-Spitze ${peakDay} (Risiko ${Math.round(peak.risk * 100)}%)
· Histamin-Muster aktiv — 3× Rotwein-Schübe diesen Monat

Soll ich einen Plan vorschlagen oder die Auslöser zeigen?`
      : `Good morning, Lena. I synthesised your last 30 days — three things stand out:

· SCORAD ${delta < 0 ? "↓" : "↑"} ${Math.abs(delta).toFixed(1)} vs. last week — ${delta < 0 ? "clear improvement" : "slight worsening"}
· Birch pollen peak ${peakDay} (risk ${Math.round(peak.risk * 100)}%)
· Histamine pattern active — 3 red-wine flares this month

Want me to draft an action plan, or pull up the triggers?`;

  return [
    {
      id: newId(),
      role: "agent",
      ts: new Date(),
      text,
      widget: (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span className="pill sage">
            7d ⌀ {thisWeekAvg.toFixed(1)}
          </span>
          <span className="pill neutral">
            {delta < 0 ? "↓" : "↑"} {Math.abs(delta).toFixed(1)}
          </span>
          <span className="pill warn">peak {Math.round(peak.risk * 100)}%</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              border: "1px solid var(--line)",
              borderRadius: 999,
              background: "var(--card)",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {lang === "de" ? "Verlauf 14d" : "trend 14d"}
            </span>
            <MiniSpark
              values={data.days.slice(-14).map((d) => d.scorad)}
              width={60}
              height={18}
            />
          </span>
          <button
            onClick={() => onRoute("triggers")}
            className="pill ink"
            style={{ border: "1px solid var(--line)", cursor: "pointer" }}
          >
            {lang === "de" ? "Auslöser anzeigen →" : "Show triggers →"}
          </button>
        </div>
      ),
    },
  ];
}

function computeReply(
  query: string,
  data: DermaTrackData,
  lang: Lang,
  onRoute: (r: Route) => void,
): ChatMessage {
  const q = query.toLowerCase();
  const ts = new Date();

  // Pollen / plan
  if (
    q.includes("pollen") ||
    q.includes("birke") ||
    q.includes("birch") ||
    q.includes("plan") ||
    q.includes("antihist")
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

Möchtest du, dass ich das in den Tageseintrag übernehme?`
          : `Plan for the peak (${Math.round(peak.risk * 100)}% risk, birch ${peak.birch}/4):

1. Tonight: cetirizine 10 mg — works overnight
2. Morning: emollient + mometasone on elbow flexures
3. Keep workouts indoors, ventilate after 22:00

Want me to add this to today's entry?`,
      widget: (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: 12,
            border: "1px solid var(--line)",
            borderRadius: 14,
            background: "var(--card)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ width: 100, flexShrink: 0 }}>
            <RiskGauge value={peak.risk} label={lang === "de" ? "Spitze" : "Peak"} size={100} />
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
      ),
    };
  }

  // Wednesday / past flare
  if (q.includes("mittwoch") || q.includes("wednesday") || q.includes("schub") || q.includes("flare")) {
    const worst = data.days.slice().sort((a, b) => b.scorad - a.scorad)[0];
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Den schwersten Tag (SCORAD ${worst.scorad.toFixed(1)}) habe ich auf drei Signale zurückgeführt, die sich gestapelt haben:

· Vorabend: Rotwein + reifer Käse (Histamin)
· Schlaf nur ${worst.sleepH}h
· Birkenpollen ${worst.birchPollen}/4

Effektgröße zusammen: ~+5.8 SCORAD ggü. Baseline.`
          : `I traced the worst day (SCORAD ${worst.scorad.toFixed(1)}) to three signals that stacked:

· Night before: red wine + aged cheese (histamine)
· Sleep only ${worst.sleepH}h
· Birch pollen ${worst.birchPollen}/4

Combined effect size: ~+5.8 SCORAD vs. baseline.`,
      widget: (
        <div
          style={{
            padding: 12,
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

  // Treatment
  if (
    q.includes("behandlung") ||
    q.includes("treatment") ||
    q.includes("medikament") ||
    q.includes("salbe") ||
    q.includes("pflege") ||
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
        <button
          onClick={() => onRoute("treatment")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 12,
            background: "var(--ink)",
            color: "var(--bg)",
            border: "1px solid var(--ink)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Icon.pill size={13} color="var(--bg)" />
          {lang === "de" ? "Behandlung öffnen" : "Open treatment"}
          <Icon.arrowRight size={12} color="var(--bg)" />
        </button>
      ),
    };
  }

  // Doctor letter
  if (q.includes("arztbrief") || q.includes("letter") || q.includes("doctor") || q.includes("praxis")) {
    return {
      id: newId(),
      role: "agent",
      ts,
      text:
        lang === "de"
          ? `Arztbrief vorbereitet — enthält 30-Tage-SCORAD-Verlauf, Top-5-Trigger, Foto-Zeitachse, Behandlungswirkung und Lokalisationskarte. Empfänger: Dr. Lehmann.`
          : `Doctor letter ready — includes 30-day SCORAD trend, top-5 triggers, photo timeline, treatment effect and body map. Recipient: Dr. Lehmann.`,
      widget: (
        <button
          onClick={() => onRoute("letter")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 12,
            background: "var(--ink)",
            color: "var(--bg)",
            border: "1px solid var(--ink)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Icon.file size={13} color="var(--bg)" />
          {lang === "de" ? "Vorschau ansehen" : "View preview"}
          <Icon.arrowRight size={12} color="var(--bg)" />
        </button>
      ),
    };
  }

  // Triggers / food / wine
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
            padding: 12,
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

  // Default
  return {
    id: newId(),
    role: "agent",
    ts,
    text:
      lang === "de"
        ? `Ich habe deine Frage gesehen. Ich kann auf SCORAD-Verlauf, Mahlzeiten, Trigger, Behandlungen, Foto-KI und Pollen-Vorhersage zugreifen — frag mich z. B. nach einem konkreten Tag, einem Trigger oder einer Behandlung.`
        : `Got your question. I can read your SCORAD trend, meals, triggers, treatments, photo AI and pollen forecast — try asking about a specific day, trigger, or treatment.`,
  };
}
