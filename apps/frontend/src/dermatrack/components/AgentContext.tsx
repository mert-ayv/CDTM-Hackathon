import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApiStatus } from "../api";
import type { DermaTrackData, Lang } from "../data";
import type { Route } from "../shell";
import type { ChatMessage } from "./AgentChat";
import { computeReply, seedMessages } from "./agentReplies";

interface AgentContextValue {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
  messages: ChatMessage[];
  send: (text: string) => void;
  thinking: boolean;
  isPaletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  apiStatus: ApiStatus;
}

const Ctx = createContext<AgentContextValue | null>(null);

export function useAgent() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAgent must be used inside <AgentProvider>");
  return v;
}

interface AgentProviderProps {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
  apiStatus: ApiStatus;
  children: ReactNode;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function AgentProvider({ data, lang, onRoute, apiStatus, children }: AgentProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages(data, lang, onRoute));
  const [thinking, setThinking] = useState(false);
  const [isPaletteOpen, setPaletteOpen] = useState(false);

  // Re-seed when language changes (the briefing copy is language-bound).
  useEffect(() => {
    setMessages(seedMessages(data, lang, onRoute));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setMessages((m) => [...m, { id: newId(), role: "user", text, ts: new Date() }]);
      setThinking(true);
      window.setTimeout(() => {
        const reply = computeReply(text, data, lang, onRoute);
        setMessages((m) => [...m, reply]);
        setThinking(false);
      }, 900);
    },
    [data, lang, onRoute],
  );

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);

  // ⌘K / Ctrl-K + ESC handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<AgentContextValue>(
    () => ({
      data,
      lang,
      onRoute,
      messages,
      send,
      thinking,
      isPaletteOpen,
      openPalette,
      closePalette,
      togglePalette,
      apiStatus,
    }),
    [data, lang, onRoute, messages, send, thinking, isPaletteOpen, openPalette, closePalette, togglePalette, apiStatus],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
