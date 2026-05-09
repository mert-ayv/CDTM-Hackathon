import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApiStatus } from "../api";
import type { DermaTrackData, Lang } from "../data";
import type { Route } from "../shell";
import type { AgentRunStep, ChatMessage } from "./AgentChat";
import { computeReply, seedMessages } from "./agentReplies";

interface AgentContextValue {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
  messages: ChatMessage[];
  send: (text: string) => void;
  resetChat: () => void;
  thinking: boolean;
  thinkingSteps: AgentRunStep[];
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
  const [thinkingSteps, setThinkingSteps] = useState<AgentRunStep[]>([]);
  const [isPaletteOpen, setPaletteOpen] = useState(false);

  // Re-seed when language changes (the briefing copy is language-bound).
  useEffect(() => {
    setMessages(seedMessages(data, lang, onRoute));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || thinking) return;
      setMessages((m) => [...m, { id: newId(), role: "user", text, ts: new Date() }]);
      setThinkingSteps(buildAgentRunSteps(text, lang));
      setThinking(true);
      window.setTimeout(() => {
        const reply = computeReply(text, data, lang, onRoute);
        setMessages((m) => [...m, reply]);
        setThinking(false);
        setThinkingSteps([]);
      }, 3600);
    },
    [data, lang, onRoute, thinking],
  );

  const resetChat = useCallback(() => {
    setThinking(false);
    setThinkingSteps([]);
    setMessages(seedMessages(data, lang, onRoute));
  }, [data, lang, onRoute]);

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
      resetChat,
      thinking,
      thinkingSteps,
      isPaletteOpen,
      openPalette,
      closePalette,
      togglePalette,
      apiStatus,
    }),
    [data, lang, onRoute, messages, send, resetChat, thinking, thinkingSteps, isPaletteOpen, openPalette, closePalette, togglePalette, apiStatus],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function buildAgentRunSteps(query: string, lang: Lang): AgentRunStep[] {
  const q = query.toLowerCase();

  if (
    q.includes("forgot") ||
    q.includes("last week") ||
    q.includes("backfill") ||
    q.includes("approximately") ||
    q.includes("fast food") ||
    q.includes("slept badly") ||
    q.includes("vergessen") ||
    q.includes("letzte woche") ||
    q.includes("nachtragen") ||
    q.includes("ungefähr") ||
    q.includes("schlecht geschlafen")
  ) {
    return [
      {
        icon: "rotate",
        label: lang === "de" ? "Fehlende Woche erkennen" : "Detecting missing week",
        detail: lang === "de" ? "Tagebuch-Lücke und Zeitfenster markieren" : "Flagging diary gap and date window",
      },
      {
        icon: "bowl",
        label: lang === "de" ? "Ungefähres Tagebuch rekonstruieren" : "Reconstructing approximate diary",
        detail:
          lang === "de"
            ? "Fast Food, Schlafschuld und Unsicherheiten taggen"
            : "Tagging fast food, sleep debt and uncertainty",
      },
      {
        icon: "flame",
        label: lang === "de" ? "Schub und Behandlung zuordnen" : "Mapping flare and treatment",
        detail: lang === "de" ? "SCORAD, Körperstellen und Pflege/Meds verbinden" : "Linking SCORAD, body sites and care/meds",
      },
      {
        icon: "check",
        label: lang === "de" ? "Bestätigte Writes vorbereiten" : "Preparing confirmed writes",
        detail: lang === "de" ? "Backfill bleibt bis zur Bestätigung gestaged" : "Backfill stays staged until confirmation",
      },
    ];
  }

  if (
    q.includes("zugriff") ||
    q.includes("access") ||
    q.includes("freigabe") ||
    q.includes("permission") ||
    q.includes("wer sieht") ||
    q.includes("who has access") ||
    q.includes("share data")
  ) {
    return [
      {
        icon: "share",
        label: lang === "de" ? "Verbindungen auditieren" : "Auditing active connections",
        detail: lang === "de" ? "Praxis, ePA und Apple Health" : "Clinic, ePA and Apple Health",
      },
      {
        icon: "file",
        label: lang === "de" ? "Geteilte Kategorien prüfen" : "Checking shared categories",
        detail: lang === "de" ? "Berichtsdaten vs. Rohdaten" : "Report data versus raw data",
      },
      {
        icon: "check",
        label: lang === "de" ? "Private Daten sperren" : "Locking private data",
        detail: lang === "de" ? "Rohfotos und Voice Notes bleiben blockiert" : "Raw photos and voice notes stay blocked",
      },
      {
        icon: "pulse",
        label: lang === "de" ? "Audit-Beleg vorbereiten" : "Preparing audit receipt",
        detail: lang === "de" ? "Schreibaktion für Backend-Receipt" : "Write action for backend receipt",
      },
    ];
  }

  if (
    q.includes("schub") ||
    q.includes("flare") ||
    q.includes("worst") ||
    q.includes("schlimmst") ||
    q.includes("triggered")
  ) {
    return [
      {
        icon: "chart",
        label: lang === "de" ? "30-Tage-Verlauf scannen" : "Scanning 30-day trend",
        detail: lang === "de" ? "SCORAD-Peak und Baseline finden" : "Finding SCORAD peak and baseline",
      },
      {
        icon: "camera",
        label: lang === "de" ? "Foto, Schlaf und Pollen ausrichten" : "Aligning photo, sleep and pollen",
        detail: lang === "de" ? "Lag-Fenster 12-36 Stunden" : "12-36 hour lag window",
      },
      {
        icon: "sparkle",
        label: lang === "de" ? "Hypothesen ranken" : "Ranking hypotheses",
        detail: lang === "de" ? "Histamin, Schlafschuld, Birke" : "Histamine, sleep debt, birch",
      },
      {
        icon: "file",
        label: lang === "de" ? "Flare Detective bauen" : "Preparing Flare Detective",
        detail: lang === "de" ? "Evidenz, Gegenbeweis, nächster Test" : "Evidence, counter-evidence, next test",
      },
    ];
  }

  if (
    (q.includes("pasta") || q.includes("cheese") || q.includes("käse") || q.includes("ate") || q.includes("gegessen")) &&
    (q.includes("elbow") || q.includes("ellen") || q.includes("itch") || q.includes("juck"))
  ) {
    return [
      {
        icon: "bowl",
        label: lang === "de" ? "Mahlzeit parsen" : "Parsing meal",
        detail: lang === "de" ? "Pasta und Käse als Trigger-Kandidaten" : "Pasta and cheese as trigger candidates",
      },
      {
        icon: "body",
        label: lang === "de" ? "Symptom verorten" : "Mapping symptom",
        detail: lang === "de" ? "Linke Ellenbeuge auf Körperkarte" : "Left elbow flexure on body map",
      },
      {
        icon: "chart",
        label: lang === "de" ? "Trigger-Modell aktualisieren" : "Refreshing trigger model",
        detail: lang === "de" ? "Histamin-Lag mit neuem Ereignis" : "Histamine lag with new event",
      },
      {
        icon: "check",
        label: lang === "de" ? "Speicheraktion vorbereiten" : "Preparing save action",
        detail: lang === "de" ? "Diary + flare observation" : "Diary + flare observation",
      },
    ];
  }

  if (
    q.includes("arztbrief") ||
    q.includes("letter") ||
    q.includes("doctor") ||
    q.includes("praxis") ||
    q.includes("draft")
  ) {
    return [
      {
        icon: "chart",
        label: lang === "de" ? "SCORAD-Verlauf kompilieren" : "Compiling SCORAD trend",
        detail: lang === "de" ? "30 Tage mit Peak-Annotationen" : "30 days with peak annotations",
      },
      {
        icon: "sparkle",
        label: lang === "de" ? "Top-Evidenz auswählen" : "Selecting strongest evidence",
        detail: lang === "de" ? "Trigger, Fotos, Behandlungseffekt" : "Triggers, photos, treatment effect",
      },
      {
        icon: "share",
        label: lang === "de" ? "Freigabe prüfen" : "Checking consent",
        detail: lang === "de" ? "Nur Berichtsdaten an Praxis" : "Report data only to clinic",
      },
      {
        icon: "file",
        label: lang === "de" ? "Arztbrief vorbereiten" : "Preparing doctor letter",
        detail: lang === "de" ? "TI-Messenger-Paket wartet auf Bestätigung" : "TI-Messenger packet awaits approval",
      },
    ];
  }

  if (
    q.includes("pollen") ||
    q.includes("birke") ||
    q.includes("birch") ||
    q.includes("plan") ||
    q.includes("antihist") ||
    q.includes("reminder") ||
    q.includes("erinner")
  ) {
    return [
      {
        icon: "leaf",
        label: lang === "de" ? "Vorhersage lesen" : "Reading forecast",
        detail: lang === "de" ? "Birke, Gras, Temperatur" : "Birch, grass, temperature",
      },
      {
        icon: "pill",
        label: lang === "de" ? "Therapiehistorie prüfen" : "Checking treatment history",
        detail: lang === "de" ? "Was bei Peaks geholfen hat" : "What helped during peaks",
      },
      {
        icon: "droplet",
        label: lang === "de" ? "Präventionsplan erstellen" : "Drafting prevention plan",
        detail: lang === "de" ? "Pflege, Antihistamin, Verhalten" : "Emollient, antihistamine, behavior",
      },
      {
        icon: "bell",
        label: lang === "de" ? "Erinnerung vorbereiten" : "Preparing reminder",
        detail: lang === "de" ? "21:00 mit Backend-Receipt" : "21:00 with backend receipt",
      },
    ];
  }

  return [
    {
      icon: "sparkle",
      label: lang === "de" ? "Kontext laden" : "Loading context",
      detail: lang === "de" ? "Logs, Fotos, Trigger und Verbindungen" : "Logs, photos, triggers and connections",
    },
    {
      icon: "chart",
      label: lang === "de" ? "Relevante Signale auswählen" : "Selecting relevant signals",
      detail: lang === "de" ? "Priorisiert nach Konfidenz und Risiko" : "Prioritized by confidence and risk",
    },
    {
      icon: "check",
      label: lang === "de" ? "Nächste Aktion wählen" : "Choosing next action",
      detail: lang === "de" ? "Antwort, Navigation oder Schreibvorschlag" : "Answer, navigation or write proposal",
    },
  ];
}
