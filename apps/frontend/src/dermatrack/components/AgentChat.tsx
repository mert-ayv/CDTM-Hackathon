import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DermaTrackData, Lang } from "../data";
import { fmtTime } from "../i18n";
import { Icon } from "../icons";
import { useAgent } from "./AgentContext";

export interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text?: string;
  widget?: ReactNode;
  hero?: boolean;
  ts: Date;
}

interface AgentChatProps {
  variant?: "page" | "palette";
  showScope?: boolean;
  showSuggestions?: boolean;
}

export function AgentChat({
  variant = "page",
  showScope = true,
  showSuggestions = true,
}: AgentChatProps) {
  const { data, lang, messages, send, thinking } = useAgent();
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const isPalette = variant === "palette";

  const prompts: PromptDef[] = [
    {
      label: lang === "de" ? "Plan für die Pollen-Spitze" : "Plan for the pollen peak",
      query: lang === "de" ? "Plan für die Pollen-Spitze" : "Plan for the pollen peak",
    },
    {
      label: lang === "de" ? "Mittagessen loggen" : "Log my lunch",
      query: lang === "de" ? "Mittagessen loggen" : "Log my lunch",
    },
    {
      label: lang === "de" ? "Was hat den schlimmsten Tag ausgelöst?" : "What triggered the worst day?",
      query: lang === "de" ? "Was hat den schlimmsten Tag ausgelöst?" : "What triggered the worst day?",
    },
    {
      label: lang === "de" ? "Arztbrief vorbereiten" : "Draft doctor letter",
      query: lang === "de" ? "Arztbrief vorbereiten" : "Draft doctor letter",
    },
    {
      label: lang === "de" ? "Wer sieht meine Daten?" : "Who has access?",
      query:
        lang === "de"
          ? "Wer hat Zugriff auf meine Daten?"
          : "Who has access to my data?",
    },
  ];

  const onSend = () => {
    send(input);
    setInput("");
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: isPalette ? "100%" : 880,
        margin: "0 auto",
        ...(isPalette
          ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }
          : {}),
      }}
    >
      {showScope && (
        <div style={{ flexShrink: 0 }}>
          <ScopeStrip data={data} lang={lang} />
        </div>
      )}

      <div
        className={isPalette ? "scroll" : undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          marginBottom: 18,
          paddingRight: isPalette ? 4 : 0,
          ...(isPalette ? { flex: 1, minHeight: 0, overflowY: "auto" } : {}),
        }}
      >
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} lang={lang} />
        ))}
        {thinking && <ThinkingRow lang={lang} />}
        <div ref={threadRef} />
      </div>

      {showSuggestions && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, flexShrink: 0 }}>
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
      )}

      <div style={{ flexShrink: 0 }}>
        <Composer input={input} setInput={setInput} onSend={onSend} thinking={thinking} lang={lang} />
      </div>

      {variant === "page" && (
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
      )}
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

export function MessageRow({ message, lang }: { message: ChatMessage; lang: Lang }) {
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

export function ThinkingRow({ lang }: { lang: Lang }) {
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
        autoFocus
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
