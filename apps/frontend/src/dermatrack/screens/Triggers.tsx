import { useEffect, useMemo, useState } from "react";
import {
  loadFlareLogs,
  subscribeFlareLogs,
  updateFlareLog,
  type FlareLogEntry,
  type TriggerCategory,
  type TriggerSignal,
} from "../flareLog";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

type View = "calendar" | "detail";

const CATEGORY_LABELS: Record<TriggerCategory, string> = {
  food: "Food",
  stress: "Stress",
  activity: "Activity",
  sleep: "Sleep",
  clothing: "Clothing",
  care: "Care",
  notes: "Other",
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function localDateTimeValue(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoFromLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function averageSeverity(entry: FlareLogEntry) {
  if (!entry.regions.length) return 0;
  return +(entry.regions.reduce((sum, region) => sum + region.severity, 0) / entry.regions.length).toFixed(1);
}

function severityTone(severity: number) {
  if (severity >= 7) return "oklch(0.62 0.18 25)";
  if (severity >= 4) return "oklch(0.78 0.12 70)";
  if (severity > 0) return "var(--sage-d)";
  return "var(--line)";
}

function triggerMetricLabel(trigger: TriggerSignal) {
  if (trigger.category === "sleep") {
    const quality = trigger.label.match(/quality\s+([\d.]+)\/5/i)?.[1];
    return quality ? `Quality ${quality}/5` : trigger.notes || "";
  }
  if (trigger.intensity === undefined) return "";
  if (trigger.category === "stress") return `Stress level ${trigger.intensity}/10`;
  if (trigger.category === "activity") return `Sweat/heat ${trigger.intensity}/10`;
  if (trigger.category === "clothing") return `Irritation ${trigger.intensity}/10`;
  if (trigger.category === "care") return `Reaction ${trigger.intensity}/10`;
  return `Level ${trigger.intensity}/10`;
}

function triggerCounts(entries: FlareLogEntry[]) {
  const counts = new Map<string, { label: string; category: TriggerCategory; count: number; windows: Set<string> }>();
  entries.forEach((entry) => {
    entry.triggers.forEach((trigger) => {
      const key = `${trigger.category}:${trigger.label.toLowerCase()}`;
      const current = counts.get(key) ?? {
        label: trigger.label,
        category: trigger.category,
        count: 0,
        windows: new Set<string>(),
      };
      current.count += 1;
      current.windows.add(trigger.window);
      counts.set(key, current);
    });
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function groupLogsByDay(entries: FlareLogEntry[]) {
  return entries.reduce<Record<string, FlareLogEntry[]>>((acc, entry) => {
    const key = dayKey(new Date(entry.observedAt));
    acc[key] = [...(acc[key] || []), entry].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
    return acc;
  }, {});
}

function monthDays(reference: Date) {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function daysInMonth(reference: Date) {
  const last = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  return Array.from({ length: last }, (_, index) => new Date(reference.getFullYear(), reference.getMonth(), index + 1));
}

function triggerPresentOnDay(logs: FlareLogEntry[], label: string) {
  return logs.some((log) => log.triggers.some((trigger) => trigger.label.toLowerCase() === label.toLowerCase()));
}

function metricInputStyle() {
  return {
    width: "100%",
    accentColor: "var(--sage-d)",
  };
}

export function Triggers({ onRoute }: ScreenProps) {
  const [logs, setLogs] = useState<FlareLogEntry[]>(() => loadFlareLogs());
  const [view, setView] = useState<View>("calendar");
  const [month, setMonth] = useState(() => new Date());
  const [draft, setDraft] = useState<FlareLogEntry | null>(null);

  useEffect(() => {
    return subscribeFlareLogs(() => {
      const next = loadFlareLogs();
      setLogs(next);
      setDraft((current) => (current ? next.find((entry) => entry.id === current.id) ?? current : null));
    });
  }, []);

  const logsByDay = useMemo(() => groupLogsByDay(logs), [logs]);
  const days = useMemo(() => monthDays(month), [month]);
  const matrixDays = useMemo(() => daysInMonth(month), [month]);
  const counts = useMemo(() => triggerCounts(logs), [logs]);
  const matrixTriggers = counts.slice(0, 4);
  const monthTitle = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(month);

  const openLog = (log: FlareLogEntry) => {
    setDraft(log);
    setView("detail");
  };

  const saveDraft = () => {
    if (!draft) return;
    const next = updateFlareLog(draft);
    setLogs(next);
    setDraft(next.find((entry) => entry.id === draft.id) ?? draft);
  };

  const updateRegion = (regionId: string, field: "severity" | "itch" | "redness" | "dryness", value: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      regions: draft.regions.map((region) => (region.id === regionId ? { ...region, [field]: value } : region)),
    });
  };

  const updateTrigger = (triggerId: string, field: "label" | "intensity" | "notes", value: string | number | undefined) => {
    if (!draft) return;
    setDraft({
      ...draft,
      triggers: draft.triggers.map((trigger) => (trigger.id === triggerId ? { ...trigger, [field]: value } : trigger)),
    });
  };

  const removeTrigger = (triggerId: string) => {
    if (!draft) return;
    setDraft({ ...draft, triggers: draft.triggers.filter((trigger) => trigger.id !== triggerId) });
  };

  if (view === "detail" && draft) {
    return (
      <div className="main-inner">
        <PageHead
          kicker="Flare detail"
          title={formatDateTime(draft.observedAt)}
          sub="Adjust the flare after logging. Changes are saved locally for the prototype."
          action={
            <div style={{ display: "flex", gap: 8 }}>
              <Btn kind="ghost" size="md" icon={<Icon.chev size={14} style={{ transform: "rotate(180deg)" }} />} onClick={() => setView("calendar")}>
                Calendar
              </Btn>
              <Btn kind="sage" size="md" icon={<Icon.check size={14} />} onClick={saveDraft}>
                Save edits
              </Btn>
            </div>
          }
        />

        <div className="grid" style={{ gridTemplateColumns: "1.05fr 0.95fr", alignItems: "start" }}>
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Flare data</h3>
                <span className="head-sub">timestamp and affected regions</span>
              </div>
              <span className="pill clay">Severity {averageSeverity(draft)}</span>
            </div>
            <div className="card-pad" style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="stat-label">Observed at</span>
                <input
                  type="datetime-local"
                  value={localDateTimeValue(draft.observedAt)}
                  onChange={(event) => setDraft({ ...draft, observedAt: isoFromLocal(event.target.value) })}
                  style={{
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "var(--card)",
                    color: "var(--ink)",
                    padding: "0 10px",
                    fontWeight: 700,
                  }}
                />
              </label>

              <div style={{ display: "grid", gap: 12 }}>
                {draft.regions.map((region) => (
                  <div key={region.id} style={{ padding: 14, borderRadius: 16, border: "1px solid var(--line-2)", background: "var(--bg-2)", display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900 }}>{region.regionLabel}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{region.side}</div>
                      </div>
                      <span className="pill clay">Severity {region.severity.toFixed(1)}</span>
                    </div>
                    {(["severity", "itch", "redness", "dryness"] as const).map((field) => (
                      <label key={field} style={{ display: "grid", gridTemplateColumns: "82px 1fr 42px", alignItems: "center", gap: 9 }}>
                        <span style={{ fontSize: 12, fontWeight: 850, textTransform: "capitalize" }}>{field}</span>
                        <input type="range" min={0} max={10} step={0.1} value={region[field]} onChange={(event) => updateRegion(region.id, field, +event.target.value)} style={metricInputStyle()} />
                        <span className="num" style={{ fontSize: 12, textAlign: "right" }}>{region[field].toFixed(1)}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Triggers</h3>
                <span className="head-sub">{draft.triggers.length} entries from the 24 h lookback</span>
              </div>
            </div>
            <div className="card-pad" style={{ display: "grid", gap: 12 }}>
              {draft.triggers.length === 0 ? (
                <div style={{ padding: 16, borderRadius: 14, background: "var(--bg-2)", color: "var(--ink-3)" }}>No triggers on this flare.</div>
              ) : (
                draft.triggers.map((trigger) => (
                  <div key={trigger.id} style={{ padding: 12, borderRadius: 16, border: "1px solid var(--line-2)", display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 34px", gap: 8, alignItems: "center" }}>
                      <span className="pill neutral">{trigger.window}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 800 }}>{CATEGORY_LABELS[trigger.category]}</div>
                        <input
                          value={trigger.label}
                          onChange={(event) => updateTrigger(trigger.id, "label", event.target.value)}
                          style={{
                            width: "100%",
                            height: 36,
                            borderRadius: 10,
                            border: "1px solid var(--line)",
                            background: "var(--card)",
                            color: "var(--ink)",
                            padding: "0 10px",
                            fontWeight: 750,
                          }}
                        />
                      </div>
                      <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => removeTrigger(trigger.id)}>
                        <Icon.close size={14} />
                      </button>
                    </div>
                    {trigger.category !== "food" && trigger.category !== "notes" && trigger.category !== "sleep" && (
                      <label style={{ display: "grid", gridTemplateColumns: "116px 1fr 42px", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 850 }}>{triggerMetricLabel(trigger).split(" ")[0]}</span>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={trigger.intensity ?? 0}
                          onChange={(event) => updateTrigger(trigger.id, "intensity", +event.target.value)}
                          style={metricInputStyle()}
                        />
                        <span className="num" style={{ fontSize: 12, textAlign: "right" }}>{trigger.intensity ?? 0}/10</span>
                      </label>
                    )}
                    {trigger.category === "sleep" && (
                      <input
                        value={trigger.notes ?? triggerMetricLabel(trigger)}
                        onChange={(event) => updateTrigger(trigger.id, "notes", event.target.value)}
                        placeholder="Quality 3/5"
                        style={{
                          height: 36,
                          borderRadius: 10,
                          border: "1px solid var(--line)",
                          background: "var(--card)",
                          color: "var(--ink)",
                          padding: "0 10px",
                        }}
                      />
                    )}
                  </div>
                ))
              )}

              <label style={{ display: "grid", gap: 6 }}>
                <span className="stat-label">Notes</span>
                <textarea
                  value={draft.notes ?? ""}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                  rows={4}
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--line)",
                    background: "var(--card)",
                    color: "var(--ink)",
                    padding: 12,
                    resize: "vertical",
                  }}
                />
              </label>

              {draft.photos.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="stat-label">Photos</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {draft.photos.map((photo) => (
                      <img key={photo.id} src={photo.dataUrl} alt={photo.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {draft.environmentTimeline.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-head">
              <h3>Environment lookback</h3>
              <span className="head-sub">attached to this flare</span>
            </div>
            <div className="card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {draft.environmentTimeline.map((item) => (
                <div key={item.lagHours} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--line-2)", background: "var(--card)" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>{item.lagHours === 0 ? "0 h" : `-${item.lagHours} h`}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span className="pill neutral">{item.weather?.temperatureCelsius?.toFixed(1) ?? "-"} C</span>
                    <span className="pill neutral">{item.weather?.humidityPercent?.toFixed(0) ?? "-"}% RH</span>
                    <span className="pill sage">Birch {item.pollen?.birch?.toFixed(1) ?? "-"}</span>
                    <span className="pill sage">Grass {item.pollen?.grass?.toFixed(1) ?? "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="main-inner">
      <PageHead
        kicker="Flare calendar"
        title="Analysis"
        sub="All flare logs live in this calendar. Open a flare to review and edit the full entry."
        action={
          <Btn kind="sage" size="md" icon={<Icon.plus size={14} />} onClick={() => onRoute("log")}>
            Start log
          </Btn>
        }
      />

      {logs.length === 0 ? (
        <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 850 }}>No flare logs yet</div>
          <div style={{ color: "var(--ink-2)", lineHeight: 1.55 }}>Start a log when a flare appears. It will show up here by timestamp.</div>
          <Btn kind="sage" onClick={() => onRoute("log")} icon={<Icon.plus size={14} />}>
            Start first log
          </Btn>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-head">
            <div>
              <h3>{monthTitle}</h3>
              <span className="head-sub">{logs.length} logged flare(s)</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setMonth(addMonths(month, -1))}>
                <Icon.chev size={15} style={{ transform: "rotate(180deg)" }} />
              </button>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setMonth(new Date())}>
                <Icon.pulse size={15} />
              </button>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setMonth(addMonths(month, 1))}>
                <Icon.chev size={15} />
              </button>
            </div>
          </div>

          <div className="card-pad" style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                borderRadius: 18,
                border: "1px solid var(--line-2)",
                background: "color-mix(in oklch, var(--ink) 4%, var(--card))",
                padding: 14,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>Trigger pattern · {monthTitle}</div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--ink-3)", fontWeight: 800 }}>
                  <span>Mild</span>
                  <span>Heavy</span>
                  <span>Trigger present</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "104px 1fr", gap: 10 }}>
                <div />
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${matrixDays.length}, minmax(18px, 1fr))`, gap: 4 }}>
                  {matrixDays.map((day) => (
                    <div key={dayKey(day)} className="num" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center" }}>
                      {[1, 5, 10, 15, 20, 25, 30].includes(day.getDate()) ? day.getDate() : ""}
                    </div>
                  ))}
                </div>
                {matrixTriggers.map((trigger) => (
                  <>
                    <div key={`${trigger.label}-label`} style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {trigger.label}
                    </div>
                    <div key={`${trigger.label}-row`} style={{ display: "grid", gridTemplateColumns: `repeat(${matrixDays.length}, minmax(18px, 1fr))`, gap: 4 }}>
                      {matrixDays.map((day) => {
                        const dayLogs = logsByDay[dayKey(day)] || [];
                        const present = triggerPresentOnDay(dayLogs, trigger.label);
                        return (
                          <div
                            key={dayKey(day)}
                            style={{
                              height: 18,
                              borderRadius: 4,
                              background: present ? "var(--sage-d)" : "color-mix(in oklch, var(--line) 54%, transparent)",
                              opacity: present ? 1 : 0.42,
                            }}
                          />
                        );
                      })}
                    </div>
                  </>
                ))}
                <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 850 }}>Flare</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${matrixDays.length}, minmax(18px, 1fr))`, gap: 4 }}>
                  {matrixDays.map((day) => {
                    const dayLogs = logsByDay[dayKey(day)] || [];
                    const severity = dayLogs.length ? Math.max(...dayLogs.map(averageSeverity)) : 0;
                    return (
                      <div
                        key={dayKey(day)}
                        style={{
                          height: 18,
                          borderRadius: 4,
                          background: dayLogs.length ? severityTone(severity) : "color-mix(in oklch, var(--line) 54%, transparent)",
                          opacity: dayLogs.length ? 1 : 0.42,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 900, textAlign: "center", textTransform: "uppercase" }}>
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
                {days.map((day) => {
                  const key = dayKey(day);
                  const dayLogs = logsByDay[key] || [];
                  const inMonth = day.getMonth() === month.getMonth();
                  const maxSeverity = dayLogs.length ? Math.max(...dayLogs.map(averageSeverity)) : 0;
                  const activeColor = severityTone(maxSeverity);

                  return (
                    <div
                      key={key}
                      style={{
                        minHeight: 104,
                        borderRadius: 16,
                        border: "1px solid " + (dayLogs.length ? activeColor : "var(--line-2)"),
                        background: dayLogs.length
                          ? `linear-gradient(180deg, color-mix(in oklch, ${activeColor} 18%, var(--card)), var(--card))`
                          : inMonth
                          ? "var(--card)"
                          : "color-mix(in oklch, var(--bg-2) 70%, var(--card))",
                        padding: 10,
                        color: inMonth ? "var(--ink)" : "var(--ink-3)",
                        display: "grid",
                        alignContent: "start",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span className="num" style={{ fontSize: 13, fontWeight: 900 }}>{day.getDate()}</span>
                        {dayLogs.length > 0 && (
                          <span className="pill clay" style={{ padding: "3px 7px" }}>
                            {dayLogs.length}
                          </span>
                        )}
                      </div>

                      {dayLogs.slice(0, 3).map((log) => (
                        <button
                          key={log.id}
                          onClick={() => openLog(log)}
                          style={{
                            border: 0,
                            borderRadius: 999,
                            background: severityTone(averageSeverity(log)),
                            color: "var(--ink)",
                            minHeight: 24,
                            padding: "3px 7px",
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          <span className="num">{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(log.observedAt))}</span>
                          <span>{averageSeverity(log)}</span>
                        </button>
                      ))}
                      {dayLogs.length > 3 && <span className="pill neutral" style={{ justifySelf: "start", fontSize: 10 }}>+{dayLogs.length - 3}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginTop: 18 }}>
        Correlation is not diagnosis · confidence grows with each flare log.
      </div>
    </div>
  );
}
