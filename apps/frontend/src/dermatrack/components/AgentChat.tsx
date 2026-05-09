import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DermaTrackData, Lang } from "../data";
import { fmtTime } from "../i18n";
import { Icon } from "../icons";
import type { Route } from "../shell";
import { MiniSpark, RankedBars, RiskGauge, SCORADChart } from "../charts";

export interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text?: string;
  widget?: ReactNode;
  hero?: boolean;
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages(data, lang, onRoute));
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "end" });
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
      label: lang === "de" ? "Plan für die Pollen-Spitze" : "Plan for the pollen peak",
      query: lang === "de" ? "Plan für die Pollen-Spitze" : "Plan for the pollen peak",
    },
    {
      label: lang === "de" ? "Was hat den schlimmsten Tag ausgelöst?" : "What triggered the worst day?",
      query: lang === "de" ? "Was hat den schlimmsten Tag ausgelöst?" : "What triggered the worst day?",
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
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <ScopeStrip data={data} lang={lang} />

      {/* Thread */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginBottom: 24 }}>
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} lang={lang} />
        ))}
        {thinking && <ThinkingRow lang={lang} />}
        <div ref={threadRef} />
      </div>

      {/* Suggested prompts */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            alignSelf: "center",
            marginRight: 6,
          }}
        >
          {lang === "de" ? "Vorschläge" : "Suggested"}
        </span>
        {prompts.map((p) => (
          <button
            key={p.label}
            onClick={() => send(p.query)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink-2)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Icon.sparkle size={11} color="var(--sage-d)" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <Composer
        input={input}
        setInput={setInput}
        onSend={() => send(input)}
        thinking={thinking}
        lang={lang}
      />

      <div
        style={{
          marginTop: 12,
          fontSize: 10,
          color: "var(--ink-3)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.06em",
          textAlign: "center",
        }}
      >
        {lang === "de"
          ? "Antworten basieren auf deinen letzten 30 Tagen · keine medizinische Beratung · DiGA-konform"
          : "Replies are based on your last 30 days · not medical advice · DiGA-ready"}
      </div>
    </div>
  );
}

interface PromptDef {
  label: string;
  query: string;
}

function ScopeStrip({ data, lang }: { data: DermaTrackData; lang: Lang }) {
  const meals = data.days.reduce((s, d) => s + d.foods.length, 0);
  const photos = data.days.filter((d) => d.hasPhoto).length;
  const items: { label: string; value: string }[] = [
    { label: lang === "de" ? "Tage" : "days", value: String(data.days.length) },
    { label: lang === "de" ? "Mahlzeiten" : "meals", value: String(meals) },
    { label: "photos", value: String(photos) },
    { label: lang === "de" ? "Regionen" : "regions", value: String(data.BODY_REGIONS.length) },
    { label: lang === "de" ? "Mittel" : "meds", value: String(data.MEDS.length) },
    { label: lang === "de" ? "Trigger" : "triggers", value: String(data.triggers.length) },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 16px",
        marginBottom: 24,
        background: "color-mix(in oklch, var(--card) 70%, transparent)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        boxShadow: "var(--shadow-sm)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
          fontWeight: 700,
          color: "var(--sage-d)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
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
        {lang === "de" ? "Kontext geladen" : "Context loaded"}
      </span>
      <span style={{ width: 1, height: 14, background: "var(--line)" }} />
      {items.map((it, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
            fontSize: 11,
            color: "var(--ink-2)",
          }}
        >
          <span className="num" style={{ fontWeight: 700, color: "var(--ink)" }}>
            {it.value}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {it.label}
          </span>
        </span>
      ))}
    </div>
  );
}

function MessageRow({ message, lang }: { message: ChatMessage; lang: Lang }) {
  if (message.role === "user") {
    return (
      <div className="dt-msg" style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "72%",
            background: "var(--ink)",
            color: "var(--bg)",
            padding: "10px 14px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 13.5,
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

  if (message.hero) {
    return <HeroAgentMessage message={message} lang={lang} />;
  }

  return (
    <div className="dt-msg" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <AgentAvatar size={32} />
      <div style={{ maxWidth: "calc(100% - 44px)", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {message.text && (
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--ink)",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.text}
            <div
              style={{
                fontSize: 9,
                color: "var(--ink-3)",
                fontFamily: "var(--font-mono)",
                marginTop: 4,
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

function HeroAgentMessage({ message, lang }: { message: ChatMessage; lang: Lang }) {
  return (
    <div className="dt-msg" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <AgentAvatar size={40} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--sage-d)" }}>DermaTrack Agent</span>
          <span>·</span>
          <span>{lang === "de" ? "Tagesbriefing" : "Morning brief"}</span>
          <span>·</span>
          <span>{fmtTime(message.ts, lang)}</span>
        </div>
        {message.text && (
          <div
            className="serif"
            style={{
              fontSize: 26,
              lineHeight: 1.25,
              color: "var(--ink)",
              fontStyle: "normal",
              whiteSpace: "pre-wrap",
              maxWidth: 640,
            }}
          >
            {message.text}
          </div>
        )}
        {message.widget}
      </div>
    </div>
  );
}

function ThinkingRow({ lang }: { lang: Lang }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <AgentAvatar size={32} />
      <div
        style={{
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
        <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
          {lang === "de" ? "ANALYSIERT" : "ANALYSING"}
        </span>
      </div>
    </div>
  );
}

function AgentAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 3),
        background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        boxShadow: `0 ${Math.round(size / 8)}px ${Math.round(size / 3)}px -${Math.round(
          size / 6,
        )}px oklch(0.45 0.05 155 / 0.5)`,
      }}
    >
      <Icon.sparkle size={Math.round(size * 0.5)} color="#fff" />
    </div>
  );
}

interface ComposerProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  thinking: boolean;
  lang: Lang;
}

function Composer({ input, setInput, onSend, thinking, lang }: ComposerProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 8,
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "linear-gradient(135deg, color-mix(in oklch, var(--sage) 22%, var(--card)), var(--card))",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon.sparkle size={15} color="var(--sage-d)" />
      </div>
      <input
        type="text"
        value={input}
        placeholder={
          lang === "de"
            ? "Frag deinen Derma Agent — er sieht alle deine Daten."
            : "Ask your Derma Agent — it sees all your data."
        }
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 14,
          color: "var(--ink)",
          fontFamily: "inherit",
          padding: "8px 0",
        }}
      />
      <button
        title={lang === "de" ? "Sprache" : "Voice"}
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          color: "var(--ink-3)",
          flexShrink: 0,
        }}
      >
        <Icon.mic size={15} />
      </button>
      <button
        onClick={onSend}
        disabled={!input.trim() || thinking}
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: input.trim() ? "var(--ink)" : "var(--bg-2)",
          color: input.trim() ? "var(--bg)" : "var(--ink-3)",
          border: "1px solid " + (input.trim() ? "var(--ink)" : "var(--line)"),
          display: "grid",
          placeItems: "center",
          cursor: input.trim() ? "pointer" : "not-allowed",
          transition: "background 120ms ease",
          flexShrink: 0,
        }}
      >
        <Icon.arrowUp size={16} color={input.trim() ? "var(--bg)" : "var(--ink-3)"} />
      </button>
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
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
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

          {/* 3-widget grid: SCORAD chart / triggers / insight */}
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

          {/* Closing line */}
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--ink-2)",
              marginTop: 4,
            }}
          >
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
  children: ReactNode;
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
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em" }}>{title}</div>
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

function computeReply(
  query: string,
  data: DermaTrackData,
  lang: Lang,
  onRoute: (r: Route) => void,
): ChatMessage {
  const q = query.toLowerCase();
  const ts = new Date();

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

Soll ich das in den Tageseintrag übernehmen?`
          : `Plan for the peak (${Math.round(peak.risk * 100)}% risk, birch ${peak.birch}/4):

1. Tonight: cetirizine 10 mg — works overnight
2. Morning: emollient + mometasone on elbow flexures
3. Keep workouts indoors, ventilate after 22:00

Want me to add this to today's entry?`,
      widget: (
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
      ),
    };
  }

  if (q.includes("mittwoch") || q.includes("wednesday") || q.includes("schub") || q.includes("flare") || q.includes("worst") || q.includes("schlimmst")) {
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
            alignSelf: "flex-start",
          }}
        >
          <Icon.pill size={13} color="var(--bg)" />
          {lang === "de" ? "Behandlung öffnen" : "Open treatment"}
          <Icon.arrowRight size={12} color="var(--bg)" />
        </button>
      ),
    };
  }

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
            alignSelf: "flex-start",
          }}
        >
          <Icon.file size={13} color="var(--bg)" />
          {lang === "de" ? "Vorschau ansehen" : "View preview"}
          <Icon.arrowRight size={12} color="var(--bg)" />
        </button>
      ),
    };
  }

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
        ? `Ich habe Zugriff auf deinen SCORAD-Verlauf, Mahlzeiten, Trigger, Behandlungen, Foto-KI und Pollen-Vorhersage — frag mich z. B. nach einem konkreten Tag, einem Trigger oder einer Behandlung.`
        : `I have access to your SCORAD trend, meals, triggers, treatments, photo AI and pollen forecast — try asking about a specific day, trigger, or treatment.`,
  };
}
