import type { Response } from "express";
import {
  loadContextEvents,
  loadEnvironmentSnapshots,
  upsertContextEvent,
  upsertEnvironmentSnapshot,
} from "../../repositories/environmentRepository.js";
import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type {
  ActiveRashLog,
  ContextEvent,
  EnvironmentSnapshot,
} from "../../shared/types.js";

type UnknownRecord = Record<string, unknown>;
type PollenRisk = NonNullable<EnvironmentSnapshot["pollen"]>["overallRisk"];

type ProviderFetchResult = {
  snapshot: EnvironmentSnapshot;
  providerUrls: {
    weather: string;
    airQuality: string;
  };
};

let snapshots: EnvironmentSnapshot[] = [];
let contextEvents: ContextEvent[] = [];

const weatherVariables = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "weather_code",
  "pressure_msl",
  "wind_speed_10m",
  "wind_gusts_10m",
  "uv_index",
];

const airQualityVariables = [
  "alder_pollen",
  "birch_pollen",
  "grass_pollen",
  "mugwort_pollen",
  "olive_pollen",
  "ragweed_pollen",
  "pm10",
  "pm2_5",
  "european_aqi",
];

async function initializeEnvironmentStore() {
  try {
    const [loadedSnapshots, loadedEvents] = await Promise.all([
      loadEnvironmentSnapshots({ limit: 500 }),
      loadContextEvents(),
    ]);

    snapshots = loadedSnapshots;
    contextEvents = loadedEvents;
    console.log(
      `Environment Service loaded ${snapshots.length} snapshots and ${contextEvents.length} context events from storage.`,
    );
  } catch (error) {
    console.warn(
      `Environment Service storage load failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

void initializeEnvironmentStore();

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function clampScale(value: unknown, fallback: number, min = 0, max = 10) {
  const numberValue = asNumber(value) ?? fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function asIsoDate(value: unknown, fallback: string) {
  const raw = asString(value);

  if (!raw) {
    return fallback;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function badRequest(response: Response, message: string) {
  response.status(400).json({ error: "bad_request", message });
}

function getRequiredCoordinate(value: unknown, label: string) {
  const coordinate = asNumber(value);

  if (coordinate === undefined) {
    throw new Error(`Provide numeric ${label}.`);
  }

  return coordinate;
}

function getOpenMeteoWeatherBaseUrl() {
  return process.env.OPEN_METEO_WEATHER_BASE_URL ?? "https://api.open-meteo.com";
}

function getOpenMeteoAirQualityBaseUrl() {
  return (
    process.env.OPEN_METEO_AIR_QUALITY_BASE_URL ??
    "https://air-quality-api.open-meteo.com"
  );
}

function getPollenRiskThresholds() {
  return {
    medium: asNumber(process.env.POLLEN_RISK_MEDIUM_THRESHOLD) ?? 10,
    high: asNumber(process.env.POLLEN_RISK_HIGH_THRESHOLD) ?? 50,
  };
}

function buildWeatherUrl(latitude: number, longitude: number) {
  const url = new URL("/v1/forecast", getOpenMeteoWeatherBaseUrl());
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", weatherVariables.join(","));
  url.searchParams.set("past_hours", "1");
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("timezone", "auto");
  return url;
}

function buildAirQualityUrl(latitude: number, longitude: number) {
  const url = new URL("/v1/air-quality", getOpenMeteoAirQualityBaseUrl());
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", airQualityVariables.join(","));
  url.searchParams.set("past_hours", "1");
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("timezone", "auto");
  return url;
}

async function fetchJson(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Provider returned ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function getHourlyValue(data: UnknownRecord, variable: string, targetIso: string) {
  const hourly = asRecord(data.hourly);
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const values = Array.isArray(hourly[variable]) ? hourly[variable] : [];

  if (!times.length || !values.length) {
    return undefined;
  }

  const targetTime = new Date(targetIso).getTime();
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  times.forEach((timeValue, index) => {
    const time = asString(timeValue);

    if (!time) {
      return;
    }

    const distance = Math.abs(new Date(time).getTime() - targetTime);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return asNumber(values[nearestIndex]);
}

function calculatePollenRisk(pollen: NonNullable<EnvironmentSnapshot["pollen"]>): PollenRisk {
  const pollenValues = [
    pollen.alder,
    pollen.birch,
    pollen.grass,
    pollen.mugwort,
    pollen.olive,
    pollen.ragweed,
  ].filter((value): value is number => value !== undefined);

  if (!pollenValues.length) {
    return "unknown";
  }

  const maxPollen = Math.max(...pollenValues);
  const thresholds = getPollenRiskThresholds();

  if (maxPollen >= thresholds.high) {
    return "high";
  }

  if (maxPollen >= thresholds.medium) {
    return "medium";
  }

  return "low";
}

function normalizeSide(value: unknown): ActiveRashLog["side"] {
  return value === "front" || value === "back" ? value : undefined;
}

function normalizeActiveRashes(value: unknown): ActiveRashLog[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rashes = value.map((item) => {
    const raw = asRecord(item);

    return {
      bodyRegionId: asString(raw.bodyRegionId),
      side: normalizeSide(raw.side),
      itchiness: clampScale(raw.itchiness, 0),
      dryness: clampScale(raw.dryness, 0),
      redness: raw.redness === undefined ? undefined : clampScale(raw.redness, 0),
      pain: raw.pain === undefined ? undefined : clampScale(raw.pain, 0),
      swelling: raw.swelling === undefined ? undefined : clampScale(raw.swelling, 0),
      active: asBoolean(raw.active, true),
      notes: asString(raw.notes),
    } satisfies ActiveRashLog;
  });

  return rashes.length ? rashes : undefined;
}

function normalizeSymptomContext(
  value: UnknownRecord,
): EnvironmentSnapshot["symptomContext"] {
  const activeRashes = normalizeActiveRashes(value.activeRashes);
  const symptomObserved =
    asBoolean(value.symptomObserved, false) || Boolean(activeRashes?.length);
  const diaryEntryId = asString(value.diaryEntryId);
  const itchiness =
    value.itchiness === undefined ? undefined : clampScale(value.itchiness, 0);
  const dryness =
    value.dryness === undefined ? undefined : clampScale(value.dryness, 0);
  const notes = asString(value.symptomNotes ?? value.notes);

  if (!symptomObserved && !diaryEntryId && itchiness === undefined && dryness === undefined) {
    return undefined;
  }

  return {
    diaryEntryId,
    symptomObserved,
    activeRashes,
    itchiness,
    dryness,
    notes,
  };
}

function createManualSnapshot(body: UnknownRecord): EnvironmentSnapshot {
  const now = new Date().toISOString();
  const latitude = asNumber(body.latitude);
  const longitude = asNumber(body.longitude);

  return {
    id: createId("env"),
    userId: asString(body.userId),
    capturedAt: asIsoDate(body.capturedAt, now),
    location:
      latitude !== undefined && longitude !== undefined
        ? { latitude, longitude }
        : undefined,
    weather: asRecord(body.weather) as EnvironmentSnapshot["weather"],
    pollen: asRecord(body.pollen) as EnvironmentSnapshot["pollen"],
    symptomContext: normalizeSymptomContext(body),
    provider: "manual",
    notes: asString(body.notes),
    source: "manual",
    createdAt: now,
  };
}

async function createProviderSnapshot(
  body: UnknownRecord,
): Promise<ProviderFetchResult> {
  const now = new Date().toISOString();
  const capturedAt = asIsoDate(body.capturedAt, now);
  const latitude = getRequiredCoordinate(body.latitude, "latitude");
  const longitude = getRequiredCoordinate(body.longitude, "longitude");
  const weatherUrl = buildWeatherUrl(latitude, longitude);
  const airQualityUrl = buildAirQualityUrl(latitude, longitude);

  const [weatherData, airQualityData] = await Promise.all([
    fetchJson(weatherUrl),
    fetchJson(airQualityUrl),
  ]);

  const weatherRecord = asRecord(weatherData);
  const airQualityRecord = asRecord(airQualityData);
  const pollen = {
    alder: getHourlyValue(airQualityRecord, "alder_pollen", capturedAt),
    birch: getHourlyValue(airQualityRecord, "birch_pollen", capturedAt),
    grass: getHourlyValue(airQualityRecord, "grass_pollen", capturedAt),
    mugwort: getHourlyValue(airQualityRecord, "mugwort_pollen", capturedAt),
    olive: getHourlyValue(airQualityRecord, "olive_pollen", capturedAt),
    ragweed: getHourlyValue(airQualityRecord, "ragweed_pollen", capturedAt),
    pm10: getHourlyValue(airQualityRecord, "pm10", capturedAt),
    pm25: getHourlyValue(airQualityRecord, "pm2_5", capturedAt),
    europeanAqi: getHourlyValue(airQualityRecord, "european_aqi", capturedAt),
  };

  return {
    snapshot: {
      id: createId("env"),
      userId: asString(body.userId),
      capturedAt,
      location: { latitude, longitude },
      weather: {
        temperatureCelsius: getHourlyValue(weatherRecord, "temperature_2m", capturedAt),
        apparentTemperatureCelsius: getHourlyValue(
          weatherRecord,
          "apparent_temperature",
          capturedAt,
        ),
        humidityPercent: getHourlyValue(
          weatherRecord,
          "relative_humidity_2m",
          capturedAt,
        ),
        precipitationMm: getHourlyValue(weatherRecord, "precipitation", capturedAt),
        rainMm: getHourlyValue(weatherRecord, "rain", capturedAt),
        weatherCode: getHourlyValue(weatherRecord, "weather_code", capturedAt),
        pressureMslHpa: getHourlyValue(weatherRecord, "pressure_msl", capturedAt),
        windSpeedKmh: getHourlyValue(weatherRecord, "wind_speed_10m", capturedAt),
        windGustsKmh: getHourlyValue(weatherRecord, "wind_gusts_10m", capturedAt),
        uvIndex: getHourlyValue(weatherRecord, "uv_index", capturedAt),
      },
      pollen: {
        ...pollen,
        overallRisk: calculatePollenRisk(pollen),
      },
      symptomContext: normalizeSymptomContext(body),
      provider: "open-meteo",
      sourceUrl: weatherUrl.toString(),
      notes: asString(body.notes),
      source: "provider",
      createdAt: now,
    },
    providerUrls: {
      weather: weatherUrl.toString(),
      airQuality: airQualityUrl.toString(),
    },
  };
}

async function persistSnapshot(snapshot: EnvironmentSnapshot) {
  snapshots = [snapshot, ...snapshots.filter((item) => item.id !== snapshot.id)];

  try {
    await upsertEnvironmentSnapshot(snapshot);
  } catch (error) {
    console.warn(
      `Environment Service snapshot persist failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function persistEvent(event: ContextEvent) {
  contextEvents = [event, ...contextEvents.filter((item) => item.id !== event.id)];

  try {
    await upsertContextEvent(event);
  } catch (error) {
    console.warn(
      `Environment Service context event persist failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

function filterSnapshots(query: UnknownRecord) {
  const userId = asString(query.userId);
  const from = asString(query.from);
  const to = asString(query.to);
  const symptomObserved = asString(query.symptomObserved);

  return snapshots.filter((snapshot) => {
    if (userId && snapshot.userId !== userId) {
      return false;
    }

    if (from && snapshot.capturedAt < asIsoDate(from, from)) {
      return false;
    }

    if (to && snapshot.capturedAt > asIsoDate(to, to)) {
      return false;
    }

    if (
      symptomObserved === "true" &&
      snapshot.symptomContext?.symptomObserved !== true
    ) {
      return false;
    }

    return true;
  });
}

function buildEnvironmentSummary(query: UnknownRecord) {
  const days = Math.min(365, Math.max(1, asNumber(query.days) ?? 14));
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const userId = asString(query.userId);
  const relevantSnapshots = snapshots.filter((snapshot) => {
    if (userId && snapshot.userId !== userId) {
      return false;
    }

    return new Date(snapshot.capturedAt).getTime() >= since;
  });
  const flareSnapshots = relevantSnapshots.filter(
    (snapshot) => snapshot.symptomContext?.symptomObserved,
  );
  const pollenRiskCounts = new Map<PollenRisk, number>();

  for (const snapshot of flareSnapshots) {
    const risk = snapshot.pollen?.overallRisk ?? "unknown";
    pollenRiskCounts.set(risk, (pollenRiskCounts.get(risk) ?? 0) + 1);
  }

  return {
    userId,
    days,
    snapshotCount: relevantSnapshots.length,
    symptomSnapshotCount: flareSnapshots.length,
    pollenRiskCounts: [...pollenRiskCounts.entries()].map(([risk, count]) => ({
      risk,
      count,
    })),
    averagesWhenSymptomatic: {
      humidityPercent: average(
        flareSnapshots.map((snapshot) => snapshot.weather?.humidityPercent),
      ),
      temperatureCelsius: average(
        flareSnapshots.map((snapshot) => snapshot.weather?.temperatureCelsius),
      ),
      uvIndex: average(flareSnapshots.map((snapshot) => snapshot.weather?.uvIndex)),
      grassPollen: average(flareSnapshots.map((snapshot) => snapshot.pollen?.grass)),
      birchPollen: average(flareSnapshots.map((snapshot) => snapshot.pollen?.birch)),
      ragweedPollen: average(
        flareSnapshots.map((snapshot) => snapshot.pollen?.ragweed),
      ),
    },
  };
}

function average(values: Array<number | undefined>) {
  const cleanValues = values.filter((value): value is number => value !== undefined);

  if (!cleanValues.length) {
    return null;
  }

  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

createService({
  name: "Environment Service",
  port: getNumberEnv("ENVIRONMENT_SERVICE_PORT", 3004),
  registerRoutes(app) {
    app.get("/metadata", (_request, response) => {
      response.json({
        provider: "Open-Meteo",
        source: {
          weather: getOpenMeteoWeatherBaseUrl(),
          airQuality: getOpenMeteoAirQualityBaseUrl(),
        },
        weatherVariables,
        pollenVariables: [
          "alder",
          "birch",
          "grass",
          "mugwort",
          "olive",
          "ragweed",
        ],
        scales: {
          pollenRisk: {
            low: `< ${getPollenRiskThresholds().medium} grains/m3 max pollen`,
            medium: `>= ${getPollenRiskThresholds().medium} grains/m3 max pollen`,
            high: `>= ${getPollenRiskThresholds().high} grains/m3 max pollen`,
          },
          symptomScales: { min: 0, max: 10 },
        },
      });
    });

    app.get("/snapshot", async (request, response) => {
      try {
        const result = await createProviderSnapshot(request.query as UnknownRecord);
        const persist = request.query.persist === "true";

        if (persist) {
          await persistSnapshot(result.snapshot);
        }

        response.json({
          snapshot: result.snapshot,
          providerUrls: result.providerUrls,
          persisted: persist,
        });
      } catch (error) {
        response.status(502).json({
          error: "environment_provider_unavailable",
          message:
            error instanceof Error ? error.message : "Environment provider failed.",
        });
      }
    });

    app.get("/snapshots", async (request, response) => {
      const query = request.query as UnknownRecord;
      const userId = asString(query.userId);
      const from = asString(query.from);
      const to = asString(query.to);
      const symptomObserved =
        asString(query.symptomObserved) === "true"
          ? true
          : asString(query.symptomObserved) === "false"
            ? false
            : undefined;
      const limit = Math.min(500, Math.max(1, asNumber(query.limit) ?? 100));

      try {
        const dbSnapshots = await loadEnvironmentSnapshots({
          userId,
          from,
          to,
          symptomObserved,
          limit,
        });

        if (dbSnapshots.length) {
          response.json({ snapshots: dbSnapshots });
          return;
        }
      } catch {
        // Fall back to the local process cache if the database is unavailable.
      }

      response.json({ snapshots: filterSnapshots(query).slice(0, limit) });
    });

    app.post("/snapshots", async (request, response) => {
      const body = asRecord(request.body);
      const snapshot = createManualSnapshot(body);

      await persistSnapshot(snapshot);
      response.status(201).json({ snapshot });
    });

    app.post("/snapshots/capture", async (request, response) => {
      const body = asRecord(request.body);

      try {
        const result = await createProviderSnapshot(body);

        await persistSnapshot(result.snapshot);
        response.status(201).json({
          snapshot: result.snapshot,
          providerUrls: result.providerUrls,
          persisted: true,
        });
      } catch (error) {
        response.status(502).json({
          error: "environment_provider_unavailable",
          message:
            error instanceof Error ? error.message : "Environment provider failed.",
        });
      }
    });

    app.get("/summary", (request, response) => {
      response.json({
        summary: buildEnvironmentSummary(request.query as UnknownRecord),
      });
    });

    app.get("/context-events", async (request, response) => {
      const userId = asString(request.query.userId);

      try {
        const events = await loadContextEvents({ userId });

        if (events.length) {
          response.json({ events });
          return;
        }
      } catch {
        // Fall back to the local process cache if the database is unavailable.
      }

      response.json({
        events: userId
          ? contextEvents.filter((event) => event.userId === userId)
          : contextEvents,
      });
    });

    app.post("/context-events", async (request, response) => {
      const body = asRecord(request.body);
      const now = new Date().toISOString();
      const label = asString(body.label);

      if (!label) {
        badRequest(response, "Provide label.");
        return;
      }

      const event: ContextEvent = {
        id: createId("context"),
        userId: asString(body.userId) ?? "demo-user",
        occurredAt: asIsoDate(body.occurredAt, now),
        type: asString(body.type) as ContextEvent["type"] ?? "other",
        label,
        notes: asString(body.notes),
        createdAt: now,
      };

      await persistEvent(event);
      response.status(201).json({ event });
    });
  },
});
