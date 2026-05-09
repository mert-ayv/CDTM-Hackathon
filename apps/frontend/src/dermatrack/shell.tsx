import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { ApiStatus } from "./api";
import type { Lang } from "./data";
import { Icon, type IconName } from "./icons";

export type Route =
  | "today"
  | "log"
  | "triggers"
  | "forecast"
  | "treatment"
  | "letter"
  | "connections";

export interface NavItem {
  id: Route;
  icon: IconName;
  de: string;
  en: string;
  tag: string;
}

export const NAV: NavItem[] = [
  { id: "today", icon: "home", de: "Heute", en: "Today", tag: "·" },
  { id: "log", icon: "plus", de: "Flare Log", en: "Flare log", tag: "NEU" },
  { id: "triggers", icon: "sparkle", de: "Analyse", en: "Analysis", tag: "24h" },
  { id: "forecast", icon: "cloud", de: "Vorhersage", en: "Forecast", tag: "7d" },
  { id: "treatment", icon: "pill", de: "Behandlung", en: "Treatment", tag: "5" },
  { id: "letter", icon: "file", de: "Arztbrief", en: "Doctor letter", tag: "PDF" },
  { id: "connections", icon: "share", de: "Datenfreigabe", en: "Connections", tag: "ePA" },
];

const ROUTES = NAV.map((n) => n.id);

export function useHashRoute(initial: Route = "today"): [Route, (r: Route) => void] {
  const parse = (): Route => {
    const m = window.location.hash.match(/^#\/([^/]+)/);
    return m && (ROUTES as string[]).includes(m[1]) ? (m[1] as Route) : initial;
  };
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    window.location.hash = "/" + route;
  }, [route]);
  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [route, setRoute];
}

export interface SidebarProps {
  route: Route;
  onRoute: (r: Route) => void;
  lang: Lang;
}

function NavButton({ item, active, onClick, lang }: { item: NavItem; active: boolean; onClick: () => void; lang: Lang }) {
  const IconCmp = Icon[item.icon];
  return (
    <button className={"nav-item " + (active ? "active" : "")} onClick={onClick}>
      <IconCmp size={17} color={active ? "var(--sage-d)" : "currentColor"} />
      <span>{item[lang]}</span>
      <span className="num-tag">{item.tag}</span>
    </button>
  );
}

export function Sidebar({ route, onRoute, lang }: SidebarProps) {
  const groups: Array<{ label: string; items: NavItem[] }> = [
    { label: lang === "de" ? "Tracking" : "Tracking", items: NAV.slice(0, 1) },
    { label: lang === "de" ? "Analyse" : "Insights", items: NAV.slice(2, 5) },
    { label: lang === "de" ? "Praxis" : "Clinic", items: NAV.slice(5) },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">D</div>
        <div>
          <div className="brand-name">DermaTrack</div>
          <div className="brand-sub">v0.4.2 · DiGA</div>
        </div>
      </div>
      <button
        onClick={() => onRoute("log")}
        style={{
          width: "100%",
          minHeight: 76,
          borderRadius: 16,
          border: route === "log" ? "1px solid var(--sage-d)" : "1px solid color-mix(in oklch, var(--sage-d) 34%, var(--line))",
          background:
            route === "log"
              ? "linear-gradient(180deg, var(--sage-d), color-mix(in oklch, var(--sage-d) 86%, var(--ink)))"
              : "linear-gradient(180deg, color-mix(in oklch, var(--sage) 32%, var(--card)), var(--card))",
          color: route === "log" ? "#fff" : "var(--ink)",
          boxShadow: "0 14px 34px rgba(65, 89, 72, 0.18)",
          padding: 14,
          margin: "4px 0 16px",
          display: "grid",
          gridTemplateColumns: "36px 1fr",
          gap: 10,
          alignItems: "center",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: route === "log" ? "rgba(255,255,255,0.18)" : "var(--sage-d)",
            color: "#fff",
          }}
        >
          <Icon.plus size={18} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 900 }}>{lang === "de" ? "Log starten" : "Start log"}</span>
          <span style={{ display: "block", marginTop: 2, fontSize: 11, opacity: 0.72, lineHeight: 1.3 }}>
            {lang === "de" ? "Ausschlag jetzt erfassen" : "Capture a flare now"}
          </span>
        </span>
      </button>
      {groups.map((g, gi) => (
        <div key={gi}>
          <div className="nav-section-label">{g.label}</div>
          {g.items.map((n) => (
            <NavButton key={n.id} item={n} active={route === n.id} onClick={() => onRoute(n.id)} lang={lang} />
          ))}
        </div>
      ))}
      <div className="sidebar-footer">
        <div className="avatar">LK</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Lena Krüger</div>
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>· verbunden</div>
        </div>
        <Icon.settings size={16} color="var(--ink-3)" style={{ marginLeft: "auto" }} />
      </div>
    </aside>
  );
}

export interface TopbarProps {
  route: Route;
  lang: Lang;
  onLang: (lang: Lang) => void;
  onRoute?: (route: Route) => void;
  apiStatus?: ApiStatus;
}

export function Topbar({ route, lang, onLang, onRoute, apiStatus }: TopbarProps) {
  const item = NAV.find((n) => n.id === route);
  const mode = apiStatus?.mode || "checking";
  const statusLabel =
    mode === "live"
      ? lang === "de"
        ? "Live Backend"
        : "Live backend"
      : mode === "demo"
      ? lang === "de"
        ? "Demo Fallback"
        : "Demo fallback"
      : lang === "de"
      ? "Verbinde"
      : "Connecting";
  return (
    <div className="topbar">
      <div>
        <div className="crumbs">DermaTrack › {item ? item[lang] : ""}</div>
        <h1>{item ? item[lang] : ""}</h1>
      </div>
      <button className="topbar-search" onClick={() => onRoute?.("today")}>
        <Icon.sparkle size={14} color="var(--ink-3)" />
        <span>{lang === "de" ? "Frag dein Hautmuster…" : "Ask your skin pattern…"}</span>
        <span
          className="num"
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--ink-3)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: "1px 5px",
          }}
        >
          ⌘K
        </span>
      </button>
      <div className="topbar-actions">
        <div
          title={apiStatus?.apiBaseUrl}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 34,
            padding: "0 10px",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: mode === "live" ? "color-mix(in oklch, var(--sage) 16%, var(--card))" : "var(--card)",
            color: mode === "live" ? "var(--sage-d)" : "var(--ink-3)",
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.03em",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: mode === "live" ? "var(--good)" : mode === "demo" ? "var(--warn)" : "var(--ink-3)",
              boxShadow:
                mode === "live" ? "0 0 0 3px color-mix(in oklch, var(--good) 20%, transparent)" : undefined,
            }}
          />
          {statusLabel}
        </div>
        <div className="lang-pill">
          <button className={lang === "de" ? "on" : ""} onClick={() => onLang("de")}>
            DE
          </button>
          <button className={lang === "en" ? "on" : ""} onClick={() => onLang("en")}>
            EN
          </button>
        </div>
        <button className="icon-btn" onClick={() => onRoute?.("forecast")} title={lang === "de" ? "Risiko-Warnungen" : "Risk alerts"}>
          <Icon.bell size={16} />
        </button>
        <button className="icon-btn" onClick={() => onRoute?.("treatment")} title={lang === "de" ? "Behandlung" : "Treatment"}>
          <Icon.settings size={16} />
        </button>
      </div>
    </div>
  );
}

export interface PageHeadProps {
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}

export function PageHead({ kicker, title, sub, action }: PageHeadProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
      <div style={{ minWidth: 0 }}>
        {kicker && (
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
            }}
          >
            {kicker}
          </div>
        )}
        <div className="page-title">{title}</div>
        {sub && <div className="page-sub serif">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export type BtnKind = "primary" | "sage" | "ghost" | "soft";
export type BtnSize = "sm" | "md" | "lg";

export interface BtnProps {
  children?: ReactNode;
  kind?: BtnKind;
  size?: BtnSize;
  onClick?: () => void;
  icon?: ReactNode;
  style?: CSSProperties;
}

export function Btn({ children, kind = "primary", size = "md", onClick, icon, style }: BtnProps) {
  const sizes: Record<BtnSize, CSSProperties> = {
    sm: { padding: "6px 10px", fontSize: 12, height: 30, borderRadius: 9, gap: 6 },
    md: { padding: "8px 14px", fontSize: 13, height: 36, borderRadius: 10, gap: 8 },
    lg: { padding: "10px 18px", fontSize: 14, height: 44, borderRadius: 12, gap: 8 },
  };
  const kinds: Record<BtnKind, CSSProperties> = {
    primary: { background: "var(--ink)", color: "var(--bg)", border: "1px solid var(--ink)" },
    sage: { background: "var(--sage-d)", color: "#fff", border: "1px solid var(--sage-d)" },
    ghost: { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" },
    soft: { background: "var(--bg-2)", color: "var(--ink)", border: "1px solid var(--line)" },
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        ...sizes[size],
        ...kinds[kind],
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
