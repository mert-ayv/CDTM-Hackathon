export type ApiMode = "checking" | "live" | "demo";

export interface ApiStatus {
  mode: ApiMode;
  apiBaseUrl: string;
  checkedAt?: Date;
  services?: Array<{ key: string; label: string; status: "ok" | "degraded"; baseUrl: string }>;
}

export interface SaveResult<T = unknown> {
  source: "backend" | "local";
  data: T;
}

const DEFAULT_API_BASE_URL = "http://localhost:3000";

export const DEMO_USER_ID = "demo-user";

export function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.PUBLIC_API_BASE_URL;
  return (envBase || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1400);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function persistDemoEvent(key: string, value: unknown) {
  const item = {
    id: crypto.randomUUID?.() || `${Date.now()}`,
    createdAt: new Date().toISOString(),
    value,
  };
  const raw = window.localStorage.getItem(key);
  const items = raw ? (JSON.parse(raw) as unknown[]) : [];
  items.unshift(item);
  window.localStorage.setItem(key, JSON.stringify(items.slice(0, 20)));
  return item;
}

export async function getBackendStatus(): Promise<ApiStatus> {
  try {
    const health = await apiFetch<{
      services?: ApiStatus["services"];
      timestamp?: string;
    }>("/api/health");

    const allHealthy = (health.services || []).every((service) => service.status === "ok");

    return {
      mode: allHealthy ? "live" : "demo",
      apiBaseUrl: getApiBaseUrl(),
      checkedAt: health.timestamp ? new Date(health.timestamp) : new Date(),
      services: health.services,
    };
  } catch {
    return {
      mode: "demo",
      apiBaseUrl: getApiBaseUrl(),
      checkedAt: new Date(),
      services: [],
    };
  }
}

export async function createDiaryEntry(payload: unknown): Promise<SaveResult> {
  try {
    const data = await apiFetch("/api/diary/entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { source: "backend", data };
  } catch {
    return { source: "local", data: persistDemoEvent("dermatrack:diary", payload) };
  }
}

export async function createFlareObservation(payload: unknown): Promise<SaveResult> {
  try {
    const data = await apiFetch("/api/skin/flare-observations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { source: "backend", data };
  } catch {
    return { source: "local", data: persistDemoEvent("dermatrack:skin", payload) };
  }
}

export async function createTreatmentApplication(payload: unknown): Promise<SaveResult> {
  try {
    const data = await apiFetch("/api/treatment/applications", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { source: "backend", data };
  } catch {
    return { source: "local", data: persistDemoEvent("dermatrack:treatment", payload) };
  }
}

export async function createAgentReceipt(payload: unknown): Promise<SaveResult> {
  try {
    const data = await apiFetch("/api/agent/action-receipts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { source: "backend", data };
  } catch {
    return { source: "local", data: persistDemoEvent("dermatrack:agent-receipts", payload) };
  }
}

export async function transcribeVoiceInput(audio: Blob): Promise<SaveResult<{ text: string; model?: string }>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/agent/transcribe`, {
      method: "POST",
      body: audio,
      signal: controller.signal,
      headers: {
        "content-type": audio.type || "audio/webm",
      },
    });

    const data = (await response.json().catch(() => ({}))) as { text?: string; model?: string; message?: string };

    if (!response.ok || !data.text) {
      throw new Error(data.message || `Transcription failed (${response.status})`);
    }

    return { source: "backend", data: { text: data.text, model: data.model } };
  } finally {
    window.clearTimeout(timeout);
  }
}
