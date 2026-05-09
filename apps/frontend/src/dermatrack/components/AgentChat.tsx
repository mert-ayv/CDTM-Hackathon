import { useEffect, useRef, useState, type ReactNode } from "react";
import { transcribeVoiceInput } from "../api";
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

export interface AgentRunStep {
  label: string;
  detail: string;
  icon: keyof typeof Icon;
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
  const { data, lang, messages, send, resetChat, thinking, thinkingSteps } = useAgent();
  const [input, setInput] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
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
      label: lang === "de" ? "Mittagessen loggen" : "Log lunch",
      query: lang === "de" ? "Mittagessen loggen" : "Log lunch",
    },
    {
      label: lang === "de" ? "Letzte Woche nachtragen" : "Backfill last week",
      query:
        lang === "de"
          ? "Ich habe letzte Woche vergessen: ungefähr zweimal Fast Food und schlecht geschlafen. Bitte nachtragen."
          : "I forgot last week: approximately two fast food meals and slept badly. Backfill it.",
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

  const stopVoiceInput = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const handleVoiceInput = async () => {
    if (voiceState === "recording") {
      stopVoiceInput();
      return;
    }

    if (voiceState === "transcribing" || thinking) return;

    setVoiceError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError(lang === "de" ? "Voice wird in diesem Browser nicht unterstützt" : "Voice is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined,
      });

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (!audio.size) {
          setVoiceState("idle");
          setVoiceError(lang === "de" ? "Keine Sprache erkannt" : "No speech captured");
          return;
        }

        setVoiceState("transcribing");
        try {
          const result = await transcribeVoiceInput(audio);
          const text = result.data.text.trim();
          if (!text) throw new Error("empty transcript");
          setInput(text);
          window.setTimeout(() => send(text), 180);
        } catch (error) {
          setVoiceError(error instanceof Error ? error.message : lang === "de" ? "Transkription fehlgeschlagen" : "Transcription failed");
        } finally {
          setVoiceState("idle");
        }
      };

      recorder.start();
      setVoiceState("recording");
    } catch {
      setVoiceState("idle");
      setVoiceError(lang === "de" ? "Mikrofon nicht verfügbar" : "Microphone unavailable");
    }
  };

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: isPalette ? "100%" : 900,
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
          gap: 22,
          marginBottom: 14,
          paddingRight: isPalette ? 4 : 0,
          ...(isPalette ? { flex: 1, minHeight: 0, overflowY: "auto" } : {}),
        }}
      >
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} lang={lang} />
        ))}
        {thinking && <ThinkingRow lang={lang} steps={thinkingSteps} />}
        <div ref={threadRef} />
      </div>

      {showSuggestions && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, flexShrink: 0 }}>
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
          <button
            onClick={resetChat}
            disabled={thinking}
            title={lang === "de" ? "Chat zurücksetzen" : "Reset chat"}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 11px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "var(--bg-2)",
              color: "var(--ink-3)",
              fontSize: 12,
              fontWeight: 700,
              cursor: thinking ? "not-allowed" : "pointer",
              opacity: thinking ? 0.55 : 1,
            }}
          >
            <Icon.rotate size={11} color="var(--ink-3)" />
            {lang === "de" ? "Reset" : "Reset"}
          </button>
        </div>
      )}

      <div style={{ flexShrink: 0 }}>
        <Composer
          input={input}
          setInput={setInput}
          onSend={onSend}
          onVoiceInput={handleVoiceInput}
          voiceState={voiceState}
          voiceError={voiceError}
          thinking={thinking}
          lang={lang}
        />
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
        {lang === "de" ? "Agent Kontext" : "Agent context"}
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
  const [typedText, setTypedText] = useState("");
  const text = message.text ?? "";

  useEffect(() => {
    setTypedText("");
  }, [message.id, text]);

  useEffect(() => {
    if (!text || typedText.length >= text.length) return;
    const timer = window.setTimeout(() => {
      setTypedText(text.slice(0, typedText.length + 1));
    }, 24);
    return () => window.clearTimeout(timer);
  }, [text, typedText]);

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
            fontSize: 25,
              lineHeight: 1.25,
              color: "var(--ink)",
              fontStyle: "normal",
              whiteSpace: "pre-wrap",
              maxWidth: 640,
            }}
          >
            {typedText}
            {typedText.length < text.length && <span className="dt-boot-caret" aria-hidden="true" />}
          </div>
        )}
        {message.widget}
      </div>
    </div>
  );
}

export function ThinkingRow({ lang, steps }: { lang: Lang; steps: AgentRunStep[] }) {
  const [activeStep, setActiveStep] = useState(0);
  const visibleSteps =
    steps.length > 0
      ? steps
      : [
          {
            label: lang === "de" ? "Kontext prüfen" : "Checking context",
            detail: lang === "de" ? "30 Tage Logs, Fotos, Umwelt" : "30 days of logs, photos, environment",
            icon: "sparkle" as const,
          },
          {
            label: lang === "de" ? "Antwort vorbereiten" : "Preparing answer",
            detail: lang === "de" ? "Nächste sichere Aktion wählen" : "Choosing the next safe action",
            icon: "check" as const,
          },
        ];

  useEffect(() => {
    setActiveStep(0);
    const timer = window.setInterval(() => {
      setActiveStep((value) => Math.min(value + 1, visibleSteps.length - 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [visibleSteps.length]);

  return (
    <div className="dt-msg" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <AgentAvatar size={32} />
      <div
        style={{
          width: "min(640px, 100%)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          background: "var(--card)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid var(--line-2)",
            background: "color-mix(in oklch, var(--sage) 9%, var(--card))",
          }}
        >
          <span className="dt-think-dots">
            <span />
            <span />
            <span />
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--sage-d)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {lang === "de" ? "Agent-Run" : "Agent run"}
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" }}>
            {lang === "de" ? "arbeitet jetzt" : "working now"}
          </span>
        </div>
        <div style={{ display: "grid", gap: 0 }}>
          {visibleSteps.map((step, index) => {
            const StepIcon = Icon[step.icon];
            const state = index < activeStep ? "done" : index === activeStep ? "active" : "queued";
            return (
              <div
                key={step.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderBottom: index === visibleSteps.length - 1 ? "none" : "1px solid var(--line-2)",
                  opacity: state === "queued" ? 0.58 : 1,
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid var(--line)",
                    background:
                      state === "active"
                        ? "var(--ink)"
                        : "color-mix(in oklch, var(--sage) 12%, var(--bg-2))",
                    animation: state === "active" ? "dt-agent-pulse 1.2s infinite ease-out" : undefined,
                  }}
                >
                  {state === "done" ? (
                    <Icon.check size={13} color="var(--sage-d)" />
                  ) : (
                    <StepIcon size={13} color={state === "active" ? "var(--bg)" : "var(--sage-d)"} />
                  )}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--ink)" }}>
                    {step.label}
                  </span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>
                    {step.detail}
                  </span>
                </span>
                <span
                  className={"pill " + (state === "active" ? "sage" : "neutral")}
                  style={{ height: 20, fontSize: 9, fontFamily: "var(--font-mono)" }}
                >
                  {state === "done"
                    ? lang === "de"
                      ? "OK"
                      : "OK"
                    : state === "active"
                    ? lang === "de"
                      ? "JETZT"
                      : "NOW"
                    : lang === "de"
                    ? "QUEUE"
                    : "QUEUE"}
                </span>
              </div>
            );
          })}
        </div>
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
  onVoiceInput: () => void;
  voiceState: "idle" | "recording" | "transcribing";
  voiceError: string | null;
  thinking: boolean;
  lang: Lang;
}

function Composer({ input, setInput, onSend, onVoiceInput, voiceState, voiceError, thinking, lang }: ComposerProps) {
  const isRecording = voiceState === "recording";
  const isTranscribing = voiceState === "transcribing";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {(isRecording || isTranscribing || voiceError) && (
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 7,
            padding: "5px 9px",
            border: "1px solid var(--line)",
            borderRadius: 999,
            background: "color-mix(in oklch, var(--card) 82%, transparent)",
            boxShadow: "var(--shadow-sm)",
            color: isRecording ? "var(--clay-d)" : voiceError ? "var(--bad)" : "var(--sage-d)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {isRecording && <span className="dt-record-dot" />}
          {isTranscribing && (
            <span className="dt-think-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
          <span>
            {voiceError ??
              (isRecording
                ? lang === "de"
                  ? "Aufnahme läuft · nochmal tippen zum Senden"
                  : "Recording · tap again to send"
                : lang === "de"
                ? "Whisper transkribiert"
                : "Whisper transcribing")}
          </span>
        </div>
      )}

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
              ? "Frag deinen Derma Agent — tippe oder sprich."
              : "Ask your Derma Agent — type or speak."
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
          type="button"
          onClick={onVoiceInput}
          disabled={thinking || isTranscribing}
          title={
            isRecording
              ? lang === "de"
                ? "Aufnahme stoppen"
                : "Stop recording"
              : lang === "de"
              ? "Sprache aufnehmen"
              : "Record voice"
          }
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: isRecording
              ? "color-mix(in oklch, var(--clay) 24%, var(--card))"
              : isTranscribing
              ? "color-mix(in oklch, var(--sage) 16%, var(--card))"
              : "var(--bg-2)",
            border: `1px solid ${isRecording ? "var(--clay)" : "var(--line)"}`,
            display: "grid",
            placeItems: "center",
            cursor: thinking || isTranscribing ? "not-allowed" : "pointer",
            color: isRecording ? "var(--clay-d)" : "var(--ink-3)",
            flexShrink: 0,
            animation: isRecording ? "dt-agent-pulse 1.1s infinite ease-out" : undefined,
            opacity: thinking || isTranscribing ? 0.65 : 1,
          }}
        >
          {isTranscribing ? <Icon.sparkle size={15} /> : <Icon.mic size={15} />}
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
    </div>
  );
}
