import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { MessageRow, ThinkingRow } from "./AgentChat";
import { useAgent } from "./AgentContext";

const isMacLike =
  typeof navigator !== "undefined" &&
  /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent || "");

export function AgentPalette() {
  const { isPaletteOpen, closePalette, lang, messages, send, thinking } = useAgent();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Lock body scroll & focus input when opening.
  useEffect(() => {
    if (!isPaletteOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [isPaletteOpen]);

  // Auto-scroll thread on new messages.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  if (!isPaletteOpen) return null;

  // Hide the morning brief — it lives on the Today page.
  const visibleMessages = messages.filter((m) => !m.hero);
  const hasThread = visibleMessages.length > 0 || thinking;

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    send(text);
    setInput("");
  };

  const prompts = [
    {
      label: lang === "de" ? "Plan für die Pollen-Spitze" : "Plan for the pollen peak",
      query: lang === "de" ? "Plan für die Pollen-Spitze" : "Plan for the pollen peak",
    },
    {
      label: lang === "de" ? "Mittagessen loggen" : "Log my lunch",
      query: lang === "de" ? "Mittagessen loggen" : "Log my lunch",
    },
    {
      label: lang === "de" ? "Schlimmster Tag?" : "Worst day?",
      query: lang === "de" ? "Was hat den schlimmsten Tag ausgelöst?" : "What triggered the worst day?",
    },
    {
      label: lang === "de" ? "Arztbrief" : "Doctor letter",
      query: lang === "de" ? "Arztbrief vorbereiten" : "Draft doctor letter",
    },
    {
      label: lang === "de" ? "Wer hat Zugriff?" : "Who has access?",
      query:
        lang === "de"
          ? "Wer hat Zugriff auf meine Daten?"
          : "Who has access to my data?",
    },
  ];

  return (
    <div
      onClick={closePalette}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        // Subtle scrim only — no blur. Background page stays clearly visible.
        background: "rgba(20, 28, 40, 0.12)",
        display: "grid",
        placeItems: "start center",
        paddingTop: "10vh",
        animation: "dt-fade-in 160ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, calc(100vw - 32px))",
          maxHeight: "min(76vh, 720px)",
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 28px 64px -16px rgba(20,28,40,0.32), 0 4px 12px rgba(20,28,40,0.08)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Input row — Spotlight-style, command on top */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 18px",
            borderBottom: hasThread ? "1px solid var(--line-2)" : "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              boxShadow: "0 4px 10px -4px oklch(0.45 0.05 155 / 0.5)",
            }}
          >
            <Icon.sparkle size={14} color="#fff" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
              if (e.key === "Escape") closePalette();
            }}
            placeholder={
              lang === "de"
                ? "Frag den Derma Agent…"
                : "Ask the Derma Agent…"
            }
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 16,
              fontWeight: 500,
              color: "var(--ink)",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
              padding: "4px 0",
            }}
          />
          <button
            title={lang === "de" ? "Sprache" : "Voice"}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--ink-3)",
              flexShrink: 0,
            }}
          >
            <Icon.mic size={14} />
          </button>
          <button
            onClick={onSend}
            disabled={!input.trim() || thinking}
            title={lang === "de" ? "Senden (Enter)" : "Send (Enter)"}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: input.trim() ? "var(--ink)" : "var(--bg-2)",
              color: input.trim() ? "var(--bg)" : "var(--ink-3)",
              border: "1px solid " + (input.trim() ? "var(--ink)" : "var(--line)"),
              display: "grid",
              placeItems: "center",
              cursor: input.trim() ? "pointer" : "not-allowed",
              flexShrink: 0,
            }}
          >
            <Icon.arrowUp size={14} color={input.trim() ? "var(--bg)" : "var(--ink-3)"} />
          </button>
          <kbd
            style={{
              padding: "3px 7px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--bg-2)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Thread (only if there's a conversation) */}
        {hasThread && (
          <div
            ref={threadRef}
            className="scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            {visibleMessages.map((m) => (
              <MessageRow key={m.id} message={m} lang={lang} />
            ))}
            {thinking && <ThinkingRow lang={lang} />}
          </div>
        )}

        {/* Empty state when no conversation yet */}
        {!hasThread && (
          <div
            style={{
              padding: "20px 22px 14px",
              fontSize: 12,
              color: "var(--ink-3)",
              lineHeight: 1.6,
            }}
          >
            {lang === "de"
              ? "Ich habe Zugriff auf deinen 30-Tage-Verlauf, Mahlzeiten, Trigger, Behandlungen, Foto-KI und Pollen-Vorhersage. Tippe eine Frage oder wähle einen Vorschlag."
              : "I can read your 30-day trend, meals, triggers, treatments, photo AI and pollen forecast. Type a question or pick a suggestion."}
          </div>
        )}

        {/* Suggested chips — pinned at bottom */}
        <div
          style={{
            padding: "10px 18px 14px",
            borderTop: "1px solid var(--line-2)",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              fontFamily: "var(--font-mono)",
              marginRight: 4,
            }}
          >
            {lang === "de" ? "Vorschläge" : "Suggested"}
          </span>
          {prompts.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                send(p.query);
                setInput("");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: "var(--card)",
                color: "var(--ink-2)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Icon.sparkle size={10} color="var(--sage-d)" />
              {p.label}
            </button>
          ))}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-3)",
              letterSpacing: "0.06em",
            }}
          >
            {isMacLike ? "⌘K" : "Ctrl+K"} {lang === "de" ? "öffnet überall" : "opens anywhere"}
          </span>
        </div>
      </div>
    </div>
  );
}
