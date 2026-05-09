import type { BodySide } from "./data";

export type LagWindow = "0-6h" | "6-12h" | "12-24h";
export type TriggerCategory = "food" | "stress" | "activity" | "sleep" | "clothing" | "care" | "notes";
export type PollenRisk = "low" | "medium" | "high" | "unknown";

export interface FlareLogRegion {
  id: string;
  regionId: string;
  regionLabel: string;
  side: BodySide;
  itch: number;
  redness: number;
  dryness: number;
  severity: number;
  notes?: string;
}

export interface FlareLogPhoto {
  id: string;
  backendPhotoId?: string;
  regionId?: string;
  name: string;
  dataUrl: string;
  createdAt: string;
  uploadStatus?: "local_only" | "uploaded" | "failed";
}

export interface TriggerSignal {
  id: string;
  window: LagWindow;
  category: TriggerCategory;
  label: string;
  intensity?: number;
  notes?: string;
}

export interface EnvironmentLagSnapshot {
  lagHours: number;
  capturedAt: string;
  source: "manual" | "provider" | "placeholder";
  weather?: {
    temperatureCelsius?: number;
    humidityPercent?: number;
    uvIndex?: number;
    apparentTemperatureCelsius?: number;
    precipitationMm?: number;
    windSpeedKmh?: number;
    pressureHpa?: number;
  };
  pollen?: {
    alder?: number;
    birch?: number;
    grass?: number;
    mugwort?: number;
    olive?: number;
    ragweed?: number;
    dust?: number;
    overallRisk?: PollenRisk;
  };
  airQuality?: {
    europeanAqi?: number;
  };
}

export interface FlareLogEntry {
  id: string;
  observedAt: string;
  createdAt: string;
  regions: FlareLogRegion[];
  triggers: TriggerSignal[];
  photos: FlareLogPhoto[];
  environmentTimeline: EnvironmentLagSnapshot[];
  notes?: string;
}

export const FLARE_LOG_STORAGE_KEY = "dermatrack.flareLogs.v1";

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function loadFlareLogs(): FlareLogEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(FLARE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FlareLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFlareLogs(entries: FlareLogEntry[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(FLARE_LOG_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent("dermatrack:flare-logs-updated"));
}

export function addFlareLog(entry: FlareLogEntry) {
  const entries = [entry, ...loadFlareLogs()].slice(0, 100);
  saveFlareLogs(entries);
  return entries;
}

export function updateFlareLog(entry: FlareLogEntry) {
  const entries = loadFlareLogs().map((item) => (item.id === entry.id ? entry : item));
  saveFlareLogs(entries);
  return entries;
}

export function subscribeFlareLogs(callback: () => void) {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener("dermatrack:flare-logs-updated", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("dermatrack:flare-logs-updated", listener);
  };
}
