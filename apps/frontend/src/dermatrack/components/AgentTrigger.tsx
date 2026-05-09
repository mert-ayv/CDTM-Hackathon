import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { useAgent } from "./AgentContext";

const isMacLike =
  typeof navigator !== "undefined" &&
  /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent || "");

export function AgentTrigger() {
  const { openPalette, isPaletteOpen, lang, messages } = useAgent();
  const [hint, setHint] = useState(true);

  // Auto-dismiss the "Press ⌘K" hint after a few seconds.
  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 5000);
    return () => window.clearTimeout(t);
  }, []);

  if (isPaletteOpen) return null;

  const unreadAgentMsgs = Math.max(0, messages.filter((m) => m.role === "agent").length - 1);

  return (
    <button
      onClick={openPalette}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 50,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px 10px 12px",
        borderRadius: 999,
        border: "1px solid var(--line)",
        background: "var(--card)",
        color: "var(--ink)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 12px 32px -8px rgba(20, 28, 40, 0.25), 0 2px 6px rgba(20,28,40,0.06)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
      title={lang === "de" ? "Agent öffnen (⌘K)" : "Open agent (⌘K)"}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <Icon.sparkle size={15} color="#fff" />
        {unreadAgentMsgs > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "var(--clay)",
              border: "2px solid var(--card)",
              fontSize: 8,
              fontWeight: 700,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            {unreadAgentMsgs}
          </span>
        )}
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, alignItems: "flex-start" }}>
        <span>{lang === "de" ? "Agent fragen" : "Ask agent"}</span>
        {hint && (
          <span
            style={{
              fontSize: 9,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
              marginTop: 2,
            }}
          >
            {isMacLike ? "⌘K" : "Ctrl+K"} {lang === "de" ? "überall" : "anywhere"}
          </span>
        )}
      </span>
      <kbd
        style={{
          padding: "2px 6px",
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--ink-2)",
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        {isMacLike ? "⌘K" : "^K"}
      </kbd>
    </button>
  );
}
