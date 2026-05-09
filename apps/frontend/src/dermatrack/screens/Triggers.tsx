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
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function flarePatternTone(severity: number) {
  if (severity >= 7) return "oklch(0.62 0.18 25)";
  if (severity > 0) return "oklch(0.78 0.16 68)";
  return "color-mix(in oklch, var(--line) 54%, transparent)";
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

function topTriggerInsights(entries: FlareLogEntry[]) {
  const signals = new Map<
    string,
    { label: string; category: TriggerCategory; count: number; windows: Set<string>; severitySum: number }
  >();

  entries.forEach((entry) => {
    const severity = averageSeverity(entry);
    entry.triggers.forEach((trigger) => {
      const key = `${trigger.category}:${trigger.label.toLowerCase()}`;
      const current = signals.get(key) ?? {
        label: trigger.label,
        category: trigger.category,
        count: 0,
        windows: new Set<string>(),
        severitySum: 0,
      };
      current.count += 1;
      current.severitySum += severity;
      current.windows.add(trigger.window);
      signals.set(key, current);
    });
  });

  const ranked = Array.from(signals.values()).map((signal) => {
    const avgSeverity = signal.count ? signal.severitySum / signal.count : 0;
    return {
      ...signal,
      avgSeverity,
      score: signal.count * Math.max(avgSeverity, 1),
    };
  });
  const maxScore = Math.max(1, ...ranked.map((signal) => signal.score));

  return ranked
    .map((signal) => ({
      ...signal,
      confidence: Math.min(96, Math.max(42, Math.round((signal.score / maxScore) * 92))),
    }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function lagLabel(windows: Set<string>) {
  if (windows.has("12-24h")) return "~24h";
  if (windows.has("6-12h")) return "~12h";
  if (windows.has("0-6h")) return "~6h";
  return "unknown";
}

function groupLogsByDay(entries: FlareLogEntry[]) {
  return entries.reduce<Record<string, FlareLogEntry[]>>((acc, entry) => {
    const key = dayKey(new Date(entry.observedAt));
    acc[key] = [...(acc[key] || []), entry].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
    return acc;
  }, {});
}

function addDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + delta);
  return next;
}

function triggerTone(category: TriggerCategory) {
  if (category === "food") return "oklch(0.78 0.16 68)";
  if (category === "sleep") return "oklch(0.62 0.14 285)";
  if (category === "stress") return "oklch(0.64 0.18 24)";
  if (category === "activity") return "var(--sage-d)";
  if (category === "clothing") return "oklch(0.64 0.13 215)";
  if (category === "care") return "oklch(0.70 0.13 150)";
  return "oklch(0.68 0.08 82)";
}

function windowDays(start: Date, count = 14) {
  return Array.from({ length: count }, (_, index) => {
    return addDays(start, index);
  });
}

function dateFromDayKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function currentWindowStart() {
  return addDays(new Date(), -13);
}

function formatRangeTitle(days: Date[]) {
  const first = days[0] ?? new Date();
  const last = days[days.length - 1] ?? first;
  const firstLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(first);
  const lastLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(last);
  return `${firstLabel} - ${lastLabel}`;
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
  const [windowStart, setWindowStart] = useState(() => currentWindowStart());
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [draft, setDraft] = useState<FlareLogEntry | null>(null);

  useEffect(() => {
    return subscribeFlareLogs(() => {
      const next = loadFlareLogs();
      setLogs(next);
      setDraft((current) => (current ? next.find((entry) => entry.id === current.id) ?? current : null));
    });
  }, []);

  const logsByDay = useMemo(() => groupLogsByDay(logs), [logs]);
  const stripDays = useMemo(() => windowDays(windowStart, 14), [windowStart]);
  const matrixDays = stripDays;
  const windowLogCount = useMemo(() => stripDays.reduce((sum, day) => sum + (logsByDay[dayKey(day)]?.length ?? 0), 0), [logsByDay, stripDays]);
  const counts = useMemo(() => triggerCounts(logs), [logs]);
  const matrixTriggers = counts.slice(0, 4);
  const topTriggers = useMemo(() => topTriggerInsights(logs).slice(0, 5), [logs]);
  const rangeTitle = formatRangeTitle(stripDays);
  const selectedDayLogs = logsByDay[selectedDay] || [];

  const goToWindow = (start: Date, selected = start) => {
    setWindowStart(start);
    setSelectedDay(dayKey(selected));
  };

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
              <h3>{rangeTitle}</h3>
              <span className="head-sub">{windowLogCount} logged flare(s)</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => goToWindow(addDays(windowStart, -14))}>
                <Icon.chev size={15} style={{ transform: "rotate(180deg)" }} />
              </button>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => goToWindow(currentWindowStart(), new Date())}>
                <Icon.pulse size={15} />
              </button>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => goToWindow(addDays(windowStart, 14))}>
                <Icon.chev size={15} />
              </button>
            </div>
          </div>

          <div className="card-pad" style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                order: 3,
                borderRadius: 18,
                border: "1px solid var(--line-2)",
                background: "color-mix(in oklch, var(--ink) 4%, var(--card))",
                padding: 14,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>Trigger pattern · {rangeTitle}</div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--ink-3)", fontWeight: 800, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: "oklch(0.78 0.16 68)" }} />
                    Mild
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: "oklch(0.62 0.18 25)" }} />
                    Heavy
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: "var(--sage-d)" }} />
                    Trigger present
                  </span>
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
                  <div key={`${trigger.category}-${trigger.label}`} style={{ display: "contents" }}>
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
                              background: present ? triggerTone(trigger.category) : "color-mix(in oklch, var(--line) 54%, transparent)",
                              opacity: present ? 1 : 0.42,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
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
                          background: dayLogs.length ? flarePatternTone(severity) : "color-mix(in oklch, var(--line) 54%, transparent)",
                          opacity: dayLogs.length ? 1 : 0.42,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card" style={{ order: 1, padding: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  padding: "0 4px",
                }}
              >
                <div className="stat-label">Flare log · 14 days</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>Tap to open day</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${stripDays.length}, 1fr)`, gap: 6 }}>
                {stripDays.map((day) => {
                  const key = dayKey(day);
                  const dayLogs = logsByDay[key] || [];
                  const isSelected = selectedDay === key;
                  const isToday = key === dayKey(new Date());
                  const maxSeverity = dayLogs.length ? Math.max(...dayLogs.map(averageSeverity)) : 0;
                  const color = severityTone(maxSeverity);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(key)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 4px 8px",
                        borderRadius: 12,
                        border: "1px solid " + (isSelected ? "var(--ink)" : "var(--line)"),
                        background: isSelected ? "var(--ink)" : isToday ? "var(--bg-2)" : "var(--card)",
                        color: isSelected ? "var(--bg)" : "var(--ink-2)",
                        cursor: "pointer",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: isSelected ? "var(--bg-2)" : "var(--ink-3)",
                        }}
                      >
                        {new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(day).slice(0, 2)}
                      </span>
                      <span className="num" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: isSelected ? "var(--bg)" : "var(--ink)" }}>
                        {String(day.getDate()).padStart(2, "0")}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          padding: "2px 6px",
                          borderRadius: 999,
                          background: isSelected ? "rgba(255,255,255,0.12)" : dayLogs.length ? color : "var(--line-2)",
                          color: isSelected ? "var(--bg)" : "var(--ink)",
                          minWidth: 26,
                        }}
                      >
                        {dayLogs.length ? maxSeverity.toFixed(0) : "–"}
                      </span>
                      <div style={{ display: "flex", gap: 3, marginTop: 1, height: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: dayLogs.length ? (isSelected ? "var(--bg)" : "var(--clay-d)") : "transparent" }} />
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: dayLogs.some((log) => log.photos.length > 0) ? (isSelected ? "var(--bg)" : "var(--sage-d)") : "transparent" }} />
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: dayLogs.some((log) => log.triggers.length > 0) ? (isSelected ? "var(--bg)" : "var(--ink-2)") : "transparent" }} />
                      </div>
                      {isToday && (
                        <span
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            fontSize: 8,
                            fontWeight: 700,
                            color: isSelected ? "var(--bg)" : "var(--sage-d)",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          •
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ order: 2 }}>
              <div className="card-head">
                <div>
                  <h3>
                    {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(dateFromDayKey(selectedDay))}
                  </h3>
                  <span className="head-sub">{selectedDayLogs.length} flare(s)</span>
                </div>
              </div>
              <div className="card-pad" style={{ display: "grid", gap: 10 }}>
                {selectedDayLogs.length === 0 ? (
                  <div style={{ padding: 16, borderRadius: 14, background: "var(--bg-2)", color: "var(--ink-3)" }}>No flares logged for this day.</div>
                ) : (
                  selectedDayLogs.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => openLog(log)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "72px 1fr auto",
                        gap: 12,
                        alignItems: "center",
                        padding: 12,
                        border: "1px solid var(--line-2)",
                        borderRadius: 14,
                        background: "var(--card)",
                        color: "var(--ink)",
                        textAlign: "left",
                      }}
                    >
                      <div className="num" style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800 }}>
                        {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(log.observedAt))}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          {log.regions.slice(0, 3).map((region) => (
                            <span key={region.id} className="pill neutral">
                              {region.regionLabel}
                            </span>
                          ))}
                          {log.triggers.slice(0, 3).map((trigger) => (
                            <span key={trigger.id} className="pill sage">
                              {trigger.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="pill clay">Severity {averageSeverity(log)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div
              style={{
                order: 4,
                borderRadius: 18,
                border: "1px solid var(--line-2)",
                background: "color-mix(in oklch, var(--ink) 5%, var(--card))",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>Top triggers</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>local flare logs</div>
              </div>

              {topTriggers.length === 0 ? (
                <div style={{ padding: 14, borderRadius: 14, background: "var(--card)", color: "var(--ink-3)" }}>
                  No triggers logged yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {topTriggers.map((trigger, index) => {
                    const color = triggerTone(trigger.category);
                    return (
                      <div
                        key={`${trigger.category}-${trigger.label}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "44px minmax(0, 1fr) 180px 54px",
                          gap: 14,
                          alignItems: "center",
                        }}
                      >
                        <div className="num" style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 800 }}>
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <strong style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trigger.label}</strong>
                            <span
                              style={{
                                flex: "0 0 auto",
                                borderRadius: 8,
                                padding: "3px 8px",
                                background: "color-mix(in oklch, " + color + " 18%, var(--card))",
                                color,
                                fontWeight: 850,
                                fontSize: 12,
                              }}
                            >
                              {CATEGORY_LABELS[trigger.category]}
                            </span>
                          </div>
                          <div style={{ marginTop: 3, color: "var(--ink-2)", fontSize: 13, fontWeight: 700 }}>
                            Lag {lagLabel(trigger.windows)} +{trigger.avgSeverity.toFixed(1)} severity - {trigger.count} case{trigger.count === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 999,
                            background: "color-mix(in oklch, var(--ink) 14%, transparent)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${trigger.confidence}%`,
                              height: "100%",
                              borderRadius: 999,
                              background: color,
                            }}
                          />
                        </div>
                        <div className="num" style={{ color, fontSize: 17, fontWeight: 850, textAlign: "right" }}>
                          {trigger.confidence}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
