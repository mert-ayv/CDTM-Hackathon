import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

type ConnectionId = "lehmann" | "epa" | "applehealth";

interface ConnectionDef {
  id: ConnectionId;
  name: string;
  subtitle: string;
  protocol: string;
  iconName: IconName;
  brand: string;
  status: { label: string; color: string };
  lastSync: string;
}

interface PermissionRow {
  id: string;
  label: string;
  detail: string;
  byConnection: Partial<Record<ConnectionId, "on" | "off" | "na">>;
}

interface ActivityEvent {
  id: string;
  connection: ConnectionId;
  action: string;
  detail: string;
  ts: string;
}

export function Connections({ data, lang, onRoute }: ScreenProps) {
  const connections: ConnectionDef[] = [
    {
      id: "lehmann",
      name: "Dr. Lehmann",
      subtitle: lang === "de" ? "Praxis Mitte · Berlin" : "Praxis Mitte · Berlin",
      protocol: "TI-Messenger · KIM",
      iconName: "file",
      brand: "linear-gradient(135deg, var(--sage-d), oklch(0.62 0.07 155))",
      status: {
        label: lang === "de" ? "Aktiv" : "Active",
        color: "var(--good)",
      },
      lastSync: lang === "de" ? "vor 2 Std" : "2h ago",
    },
    {
      id: "epa",
      name: "ePA",
      subtitle:
        lang === "de"
          ? "Elektronische Patientenakte · gematik"
          : "Electronic patient record · gematik",
      protocol: "FHIR R4 · TI",
      iconName: "settings",
      brand: "linear-gradient(135deg, oklch(0.55 0.12 250), oklch(0.42 0.14 260))",
      status: {
        label: lang === "de" ? "Aktiv" : "Active",
        color: "var(--good)",
      },
      lastSync: lang === "de" ? "heute · 06:00" : "today · 06:00",
    },
    {
      id: "applehealth",
      name: "Apple Health",
      subtitle: lang === "de" ? "Lesezugriff · iPhone" : "Read-only · iPhone",
      protocol: "HealthKit",
      iconName: "pulse",
      brand: "linear-gradient(135deg, oklch(0.66 0.18 25), oklch(0.74 0.15 35))",
      status: {
        label: lang === "de" ? "Verbunden" : "Connected",
        color: "var(--good)",
      },
      lastSync: lang === "de" ? "vor 12 Min" : "12 min ago",
    },
  ];

  const initialPermissions: PermissionRow[] = [
    {
      id: "scorad",
      label: lang === "de" ? "SCORAD-Verlauf" : "SCORAD trend",
      detail: lang === "de" ? "30 Tage · Score, Δ, Bänder" : "30 days · score, Δ, bands",
      byConnection: { lehmann: "on", epa: "on", applehealth: "na" },
    },
    {
      id: "body",
      label: lang === "de" ? "Lokalisationskarte" : "Body distribution",
      detail: lang === "de" ? "14 Regionen · Schweregrad" : "14 regions · severity",
      byConnection: { lehmann: "on", epa: "on", applehealth: "na" },
    },
    {
      id: "photos",
      label: lang === "de" ? "Foto-Zeitachse · Bild-KI" : "Photo timeline · image AI",
      detail: lang === "de" ? "12 Aufnahmen · 30 Tage" : "12 photos · 30 days",
      byConnection: { lehmann: "on", epa: "off", applehealth: "na" },
    },
    {
      id: "food",
      label: lang === "de" ? "Mahlzeiten & Allergene" : "Meals & allergens",
      detail: lang === "de" ? "92 Einträge · Histamin-Flags" : "92 entries · histamine flags",
      byConnection: { lehmann: "off", epa: "off", applehealth: "na" },
    },
    {
      id: "voice",
      label: lang === "de" ? "Sprachnotizen (Roh)" : "Voice notes (raw)",
      detail: lang === "de" ? "Nur On-Device · nicht synchronisiert" : "On-device only · not synced",
      byConnection: { lehmann: "off", epa: "off", applehealth: "na" },
    },
    {
      id: "treatments",
      label: lang === "de" ? "Behandlungen & Wirkung" : "Treatments & effect",
      detail: lang === "de" ? "5 Mittel · Δ-SCORAD" : "5 meds · Δ-SCORAD",
      byConnection: { lehmann: "on", epa: "on", applehealth: "na" },
    },
    {
      id: "sleep",
      label: lang === "de" ? "Schlaf & Aktivität" : "Sleep & activity",
      detail: lang === "de" ? "Aus Wearable" : "From wearable",
      byConnection: { lehmann: "na", epa: "on", applehealth: "on" },
    },
  ];

  const [permissions, setPermissions] = useState(initialPermissions);

  const togglePermission = (rowId: string, connectionId: ConnectionId) => {
    setPermissions((rows) =>
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const current = row.byConnection[connectionId];
        if (current === "na" || current === undefined) return row;
        return {
          ...row,
          byConnection: { ...row.byConnection, [connectionId]: current === "on" ? "off" : "on" },
        };
      }),
    );
  };

  const sharedCounts: Record<ConnectionId, number> = {
    lehmann: permissions.filter((p) => p.byConnection.lehmann === "on").length,
    epa: permissions.filter((p) => p.byConnection.epa === "on").length,
    applehealth: permissions.filter((p) => p.byConnection.applehealth === "on").length,
  };

  const activity: ActivityEvent[] = [
    {
      id: "a1",
      connection: "lehmann",
      action: lang === "de" ? "öffnete Foto-Zeitachse" : "viewed photo timeline",
      detail: lang === "de" ? "12 Aufnahmen, 30 Tage" : "12 photos, 30 days",
      ts: lang === "de" ? "heute · 14:23" : "today · 14:23",
    },
    {
      id: "a2",
      connection: "epa",
      action: lang === "de" ? "Monats-Sync abgeschlossen" : "monthly sync completed",
      detail: lang === "de" ? "12 Felder · FHIR Bundle übertragen" : "12 fields · FHIR bundle transferred",
      ts: lang === "de" ? "heute · 06:00" : "today · 06:00",
    },
    {
      id: "a3",
      connection: "applehealth",
      action: lang === "de" ? "Schlaf & Aktivität gelesen" : "pulled sleep & activity",
      detail: lang === "de" ? "9 Datenpunkte · gestern" : "9 data points · yesterday",
      ts: lang === "de" ? "gestern · 19:30" : "yesterday · 19:30",
    },
    {
      id: "a4",
      connection: "lehmann",
      action: lang === "de" ? "öffnete SCORAD-Verlauf" : "viewed SCORAD trend",
      detail: lang === "de" ? "30 Tage" : "30 days",
      ts: lang === "de" ? "vorgestern · 11:08" : "2 days ago · 11:08",
    },
    {
      id: "a5",
      connection: "lehmann",
      action: lang === "de" ? "Arztbrief empfangen" : "received doctor letter",
      detail: lang === "de" ? "TI-Messenger · 720KB · signiert" : "TI-Messenger · 720KB · signed",
      ts: lang === "de" ? "vor 4 Tagen" : "4 days ago",
    },
  ];

  return (
    <div className="main-inner">
      <PageHead
        kicker={lang === "de" ? "DiGA · ePA · TI-Messenger · KIM" : "DiGA · ePA · TI-Messenger · KIM"}
        title={lang === "de" ? "Datenfreigabe" : "Connections"}
        sub={
          lang === "de"
            ? "Steuere genau, wer welche Daten sieht. Verbindungen laufen über die deutsche Telematikinfrastruktur — verschlüsselt, signiert, jederzeit widerrufbar."
            : "Control exactly who sees what. Connections run through the German Telematik infrastructure — encrypted, signed, revocable at any time."
        }
        action={
          <Btn
            kind="primary"
            size="md"
            icon={<Icon.plus size={14} color="var(--bg)" />}
          >
            {lang === "de" ? "Verbindung hinzufügen" : "Add connection"}
          </Btn>
        }
      />

      {/* Section 1 — Connection cards */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 22 }}>
        {connections.map((c) => (
          <ConnectionCard key={c.id} c={c} sharedCount={sharedCounts[c.id]} totalRows={permissions.length} lang={lang} />
        ))}
      </div>

      {/* Section 2 — Permissions matrix */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-head">
          <h3>{lang === "de" ? "Berechtigungen" : "Permissions"}</h3>
          <span className="head-sub">
            {lang === "de" ? "tippe Zelle zum Umschalten" : "tap a cell to toggle"}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 18px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "var(--bg-2)",
                    borderBottom: "1px solid var(--line-2)",
                    width: "40%",
                  }}
                >
                  {lang === "de" ? "Datenkategorie" : "Data category"}
                </th>
                {connections.map((c) => (
                  <th
                    key={c.id}
                    style={{
                      textAlign: "center",
                      padding: "12px 14px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      background: "var(--bg-2)",
                      borderBottom: "1px solid var(--line-2)",
                    }}
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((row) => (
                <tr key={row.id}>
                  <td
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid var(--line-2)",
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{row.detail}</div>
                  </td>
                  {connections.map((c) => {
                    const state = row.byConnection[c.id] || "na";
                    return (
                      <td
                        key={c.id}
                        style={{
                          padding: "10px 14px",
                          textAlign: "center",
                          borderBottom: "1px solid var(--line-2)",
                        }}
                      >
                        <PermissionCell
                          state={state}
                          onClick={() => togglePermission(row.id, c.id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 18px",
            background: "var(--bg-2)",
            borderTop: "1px solid var(--line-2)",
            fontSize: 11,
            color: "var(--ink-3)",
          }}
        >
          <LegendDot state="on" />
          <span>{lang === "de" ? "geteilt" : "shared"}</span>
          <LegendDot state="off" />
          <span>{lang === "de" ? "aus" : "off"}</span>
          <LegendDot state="na" />
          <span>{lang === "de" ? "nicht verfügbar" : "n/a"}</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
            {lang === "de"
              ? "Änderungen werden sofort über TI synchronisiert"
              : "Changes sync over TI instantly"}
          </span>
        </div>
      </div>

      {/* Section 3 — Activity log + Doctor view */}
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginBottom: 22 }}>
        <div className="card">
          <div className="card-head">
            <h3>{lang === "de" ? "Zugriffsprotokoll" : "Access log"}</h3>
            <span className="head-sub">
              {lang === "de" ? "letzte 14 Tage" : "last 14 days"}
            </span>
          </div>
          <div>
            {activity.map((ev, i) => {
              const conn = connections.find((c) => c.id === ev.connection)!;
              return (
                <div
                  key={ev.id}
                  className="row"
                  style={{
                    gridTemplateColumns: "32px 1fr auto",
                    borderTop: i === 0 ? "none" : undefined,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      background: conn.brand,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {(() => {
                      const Cmp = Icon[conn.iconName];
                      return <Cmp size={13} color="#fff" />;
                    })()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>{conn.name}</span>{" "}
                      <span style={{ color: "var(--ink-2)" }}>{ev.action}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        fontFamily: "var(--font-mono)",
                        marginTop: 2,
                      }}
                    >
                      {ev.detail}
                    </div>
                  </div>
                  <span
                    className="num"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ev.ts}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <DoctorViewPreview data={data} lang={lang} onRoute={onRoute} />
      </div>

      {/* Footer */}
      <div
        className="card card-pad"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 12,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        <Icon.info size={20} color="var(--sage-d)" style={{ flexShrink: 0 }} />
        <span>
          {lang === "de" ? (
            <>
              <b>DiGA-konform · DSGVO-konform.</b> Alle Datenflüsse laufen über die deutsche
              Telematikinfrastruktur (TI). Daten werden auf deinem Gerät verschlüsselt, mit deinem
              eGK-Zertifikat signiert und nur an freigegebene Empfänger über TI-Messenger / KIM
              übertragen. Du kannst jede Berechtigung jederzeit widerrufen — Audit-Log wird 10 Jahre
              vorgehalten (§ 78a SGB V).
            </>
          ) : (
            <>
              <b>DiGA-compliant · GDPR-compliant.</b> All data flows through the German Telematik
              infrastructure (TI). Records are encrypted on-device, signed with your eGK certificate,
              and transferred only to approved recipients via TI-Messenger / KIM. Every permission can
              be revoked at any time — audit log is retained for 10 years (§ 78a SGB V).
            </>
          )}
        </span>
      </div>

      <div
        style={{
          marginTop: 14,
          textAlign: "center",
          fontSize: 11,
          color: "var(--ink-3)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
        }}
      >
        {lang === "de"
          ? '⌘K · "Wer hat Zugriff auf meine Daten?" — der Agent verwaltet Berechtigungen für dich'
          : '⌘K · "Who has access to my data?" — the agent manages permissions for you'}
      </div>
    </div>
  );
}

interface ConnectionCardProps {
  c: ConnectionDef;
  sharedCount: number;
  totalRows: number;
  lang: "de" | "en";
}

function ConnectionCard({ c, sharedCount, totalRows, lang }: ConnectionCardProps) {
  const Icn = Icon[c.iconName];
  return (
    <div
      className="card"
      style={{
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: c.brand,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 6px 16px -6px rgba(20,28,40,0.2)",
          }}
        >
          <Icn size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{c.subtitle}</div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "var(--sage-d)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: c.status.color,
              boxShadow: `0 0 0 3px color-mix(in oklch, ${c.status.color} 25%, transparent)`,
            }}
          />
          {c.status.label}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        <span>
          <span style={{ color: "var(--ink)" }}>{c.protocol}</span>
        </span>
        <span>·</span>
        <span>
          {lang === "de" ? "Sync" : "synced"} {c.lastSync}
        </span>
      </div>

      <div
        style={{
          padding: "10px 12px",
          background: "var(--bg-2)",
          borderRadius: 10,
          fontSize: 12,
          color: "var(--ink-2)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          className="num"
          style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}
        >
          {sharedCount}/{totalRows}
        </span>
        <span>
          {lang === "de" ? "Datenkategorien geteilt" : "data categories shared"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <Btn kind="ghost" size="sm">
          {lang === "de" ? "Verwalten" : "Manage"}
        </Btn>
        <Btn kind="ghost" size="sm" style={{ marginLeft: "auto", color: "var(--bad)", borderColor: "color-mix(in oklch, var(--bad) 30%, var(--line))" }}>
          {lang === "de" ? "Trennen" : "Disconnect"}
        </Btn>
      </div>
    </div>
  );
}

interface PermissionCellProps {
  state: "on" | "off" | "na";
  onClick: () => void;
}

function PermissionCell({ state, onClick }: PermissionCellProps) {
  if (state === "na") {
    return (
      <span
        title="n/a"
        style={{
          display: "inline-block",
          width: 24,
          height: 24,
          borderRadius: 999,
          color: "var(--ink-3)",
          lineHeight: "24px",
          fontSize: 14,
          fontFamily: "var(--font-mono)",
        }}
      >
        —
      </span>
    );
  }
  if (state === "on") {
    return (
      <button
        onClick={onClick}
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: "1px solid color-mix(in oklch, var(--good) 60%, var(--line))",
          background: "color-mix(in oklch, var(--good) 22%, var(--card))",
          color: "var(--sage-d)",
          display: "inline-grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        <Icon.check size={14} color="var(--sage-d)" />
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        border: "1px dashed var(--line)",
        background: "var(--card)",
        color: "var(--ink-3)",
        display: "inline-grid",
        placeItems: "center",
        cursor: "pointer",
      }}
    >
      <Icon.close size={12} color="var(--ink-3)" />
    </button>
  );
}

function LegendDot({ state }: { state: "on" | "off" | "na" }) {
  if (state === "na") {
    return (
      <span
        style={{ width: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)", textAlign: "center" }}
      >
        —
      </span>
    );
  }
  if (state === "on") {
    return (
      <span
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 14,
          height: 14,
          borderRadius: 999,
          background: "color-mix(in oklch, var(--good) 22%, var(--card))",
          border: "1px solid color-mix(in oklch, var(--good) 60%, var(--line))",
        }}
      >
        <Icon.check size={9} color="var(--sage-d)" />
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 14,
        height: 14,
        borderRadius: 999,
        border: "1px dashed var(--line)",
      }}
    >
      <Icon.close size={8} color="var(--ink-3)" />
    </span>
  );
}

interface DoctorViewProps {
  data: ScreenProps["data"];
  lang: "de" | "en";
  onRoute: ScreenProps["onRoute"];
}

function DoctorViewPreview({ data, lang, onRoute }: DoctorViewProps) {
  const today = data.today;
  const recent7 = data.days.slice(-7);
  const thisWeekAvg = recent7.reduce((s, d) => s + d.scorad, 0) / 7;
  const lastWeekAvg = data.days.slice(-14, -7).reduce((s, d) => s + d.scorad, 0) / 7;
  const delta = thisWeekAvg - lastWeekAvg;

  return (
    <div
      className="card"
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line-2)",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            fontWeight: 700,
          }}
        >
          {lang === "de" ? "Arzt-Ansicht · Vorschau" : "Doctor view · preview"}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "var(--ink-3)",
          }}
        >
          PRAXIS-PIM · MED-DEMO
        </span>
      </div>

      {/* Clinical, dense, no warmth */}
      <div
        style={{
          background: "#fafbfc",
          padding: 14,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 11,
          color: "#1a2230",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: 8,
            borderBottom: "1px solid #d6dde6",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#0f1620" }}>
              KRÜGER, Lena · *1994
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5566", marginTop: 2 }}>
              ICD-10 L20.9 · DiGA: DermaTrack v0.4.2
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5566", textAlign: "right" }}>
            BSNR 123456789
            <br />
            LANR 987654321
          </div>
        </div>

        {/* Dense table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#1a2230",
          }}
        >
          <tbody>
            <ClinicalRow label="SCORAD heute" value={today.scorad.toFixed(1) + " · 0–103"} />
            <ClinicalRow label="SCORAD ⌀ 7d" value={thisWeekAvg.toFixed(1)} />
            <ClinicalRow label="Δ ggü. Vorwoche" value={(delta < 0 ? "−" : "+") + Math.abs(delta).toFixed(1)} />
            <ClinicalRow
              label="Top 3 Trigger"
              value={data.triggers
                .slice(0, 3)
                .map((t) => `${t.label.de} ${t.confidence}%`)
                .join("; ")}
            />
            <ClinicalRow
              label="Mittel (30d)"
              value={data.MEDS.slice(0, 3)
                .map((m) => m.de)
                .join("; ")}
            />
            <ClinicalRow label="Foto-Aufnahmen" value={data.days.filter((d) => d.hasPhoto).length + " · 30 Tage"} />
            <ClinicalRow label="Pflege-Adhärenz" value="92% · Δ +6%" />
            <ClinicalRow label="Letzter Sync" value="2026-05-09 14:23 · TI-Messenger · OK" />
          </tbody>
        </table>

        <div
          style={{
            background: "#eef3f8",
            border: "1px solid #d6dde6",
            borderRadius: 4,
            padding: "6px 8px",
            fontSize: 9,
            color: "#4a5566",
            fontFamily: "var(--font-mono)",
            marginTop: "auto",
          }}
        >
          ⓘ FHIR Bundle · 12 Felder · signiert · gematik.de/ePA
        </div>
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line-2)", display: "flex", gap: 6 }}>
        <Btn kind="ghost" size="sm" onClick={() => onRoute("letter")}>
          {lang === "de" ? "Bericht senden" : "Send report"}
        </Btn>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
            alignSelf: "center",
          }}
        >
          {lang === "de" ? "Genau das sieht Dr. Lehmann" : "This is what Dr. Lehmann sees"}
        </span>
      </div>
    </div>
  );
}

function ClinicalRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <tr>
      <td
        style={{
          padding: "5px 8px 5px 0",
          color: "#4a5566",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontSize: 9,
          fontWeight: 700,
          width: "44%",
          borderBottom: "1px dotted #d6dde6",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "5px 0",
          color: "#0f1620",
          fontWeight: 600,
          borderBottom: "1px dotted #d6dde6",
        }}
      >
        {value}
      </td>
    </tr>
  );
}
