import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type { ContextEvent, EnvironmentSnapshot, EnvironmentTimelinePoint } from "../../shared/types.js";

const contextEvents: ContextEvent[] = [];

type UnknownRecord = Record<string, unknown>;
type PollenRisk = NonNullable<NonNullable<EnvironmentSnapshot["pollen"]>["overallRisk"]>;

const DEFAULT_LATITUDE = Number(process.env.DEFAULT_ENV_LATITUDE ?? 48.1374);
const DEFAULT_LONGITUDE = Number(process.env.DEFAULT_ENV_LONGITUDE ?? 11.5755);

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getCurrentValue(payload: UnknownRecord, key: string) {
  return asNumber(asRecord(payload.current)[key]);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function getHourlyValue(payload: UnknownRecord, key: string, index: number) {
  return asNumber(asArray(asRecord(payload.hourly)[key])[index]);
}

function round(value: number | undefined, digits = 1) {
  if (value === undefined) return undefined;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pollenRisk(values: Array<number | undefined>): PollenRisk {
  const max = Math.max(0, ...values.filter((value): value is number => value !== undefined));
  if (max >= 50) return "high";
  if (max >= 15) return "medium";
  if (max > 0) return "low";
  return "unknown";
}

async function fetchJson(url: URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url.hostname} returned ${response.status}`);
  }
  return (await response.json()) as UnknownRecord;
}

async function fetchOpenMeteoSnapshot(latitude: number, longitude: number, userId?: string): Promise<EnvironmentSnapshot> {
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(latitude));
  weatherUrl.searchParams.set("longitude", String(longitude));
  weatherUrl.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "wind_speed_10m",
      "surface_pressure",
    ].join(","),
  );
  weatherUrl.searchParams.set("timezone", "auto");
  weatherUrl.searchParams.set("forecast_days", "1");

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.searchParams.set("latitude", String(latitude));
  airUrl.searchParams.set("longitude", String(longitude));
  airUrl.searchParams.set(
    "current",
    [
      "uv_index",
      "european_aqi",
      "dust",
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
    ].join(","),
  );
  airUrl.searchParams.set("timezone", "auto");
  airUrl.searchParams.set("forecast_days", "1");

  const [weather, air] = await Promise.all([fetchJson(weatherUrl), fetchJson(airUrl)]);
  const pollen = {
    alder: round(getCurrentValue(air, "alder_pollen")),
    birch: round(getCurrentValue(air, "birch_pollen")),
    grass: round(getCurrentValue(air, "grass_pollen")),
    mugwort: round(getCurrentValue(air, "mugwort_pollen")),
    olive: round(getCurrentValue(air, "olive_pollen")),
    ragweed: round(getCurrentValue(air, "ragweed_pollen")),
    dust: round(getCurrentValue(air, "dust")),
  };

  return {
    id: createId("env"),
    userId,
    capturedAt: new Date().toISOString(),
    location: { latitude, longitude },
    weather: {
      temperatureCelsius: round(getCurrentValue(weather, "temperature_2m")),
      humidityPercent: round(getCurrentValue(weather, "relative_humidity_2m"), 0),
      apparentTemperatureCelsius: round(getCurrentValue(weather, "apparent_temperature")),
      precipitationMm: round(getCurrentValue(weather, "precipitation")),
      windSpeedKmh: round(getCurrentValue(weather, "wind_speed_10m")),
      pressureHpa: round(getCurrentValue(weather, "surface_pressure"), 0),
      uvIndex: round(getCurrentValue(air, "uv_index")),
    },
    pollen: {
      ...pollen,
      overallRisk: pollenRisk([pollen.alder, pollen.birch, pollen.grass, pollen.mugwort, pollen.olive, pollen.ragweed]),
    },
    airQuality: {
      europeanAqi: round(getCurrentValue(air, "european_aqi"), 0),
    },
    source: "provider",
  };
}

function findNearestHourlyIndex(payload: UnknownRecord, targetTime: Date) {
  const times = asArray(asRecord(payload.hourly).time).filter((value): value is string => typeof value === "string");
  if (!times.length) return -1;

  let nearestIndex = 0;
  let nearestDelta = Number.POSITIVE_INFINITY;
  times.forEach((time, index) => {
    const current = new Date(time).getTime();
    const delta = Math.abs(current - targetTime.getTime());
    if (delta < nearestDelta) {
      nearestIndex = index;
      nearestDelta = delta;
    }
  });
  return nearestIndex;
}

function buildTimelinePoint(
  weather: UnknownRecord,
  air: UnknownRecord,
  targetTime: Date,
  lagHours: number,
  latitude: number,
  longitude: number,
  userId?: string,
): EnvironmentTimelinePoint {
  const weatherIndex = findNearestHourlyIndex(weather, targetTime);
  const airIndex = findNearestHourlyIndex(air, targetTime);
  const pollen = {
    alder: round(getHourlyValue(air, "alder_pollen", airIndex)),
    birch: round(getHourlyValue(air, "birch_pollen", airIndex)),
    grass: round(getHourlyValue(air, "grass_pollen", airIndex)),
    mugwort: round(getHourlyValue(air, "mugwort_pollen", airIndex)),
    olive: round(getHourlyValue(air, "olive_pollen", airIndex)),
    ragweed: round(getHourlyValue(air, "ragweed_pollen", airIndex)),
    dust: round(getHourlyValue(air, "dust", airIndex)),
  };

  return {
    id: createId("env"),
    userId,
    lagHours,
    capturedAt: targetTime.toISOString(),
    location: { latitude, longitude },
    weather: {
      temperatureCelsius: round(getHourlyValue(weather, "temperature_2m", weatherIndex)),
      humidityPercent: round(getHourlyValue(weather, "relative_humidity_2m", weatherIndex), 0),
      apparentTemperatureCelsius: round(getHourlyValue(weather, "apparent_temperature", weatherIndex)),
      precipitationMm: round(getHourlyValue(weather, "precipitation", weatherIndex)),
      windSpeedKmh: round(getHourlyValue(weather, "wind_speed_10m", weatherIndex)),
      pressureHpa: round(getHourlyValue(weather, "surface_pressure", weatherIndex), 0),
      uvIndex: round(getHourlyValue(air, "uv_index", airIndex)),
    },
    pollen: {
      ...pollen,
      overallRisk: pollenRisk([pollen.alder, pollen.birch, pollen.grass, pollen.mugwort, pollen.olive, pollen.ragweed]),
    },
    airQuality: {
      europeanAqi: round(getHourlyValue(air, "european_aqi", airIndex), 0),
    },
    source: "provider",
  };
}

async function fetchOpenMeteoTimeline(
  latitude: number,
  longitude: number,
  observedAt: Date,
  lookbackHours: number,
  userId?: string,
): Promise<EnvironmentTimelinePoint[]> {
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(latitude));
  weatherUrl.searchParams.set("longitude", String(longitude));
  weatherUrl.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "wind_speed_10m",
      "surface_pressure",
    ].join(","),
  );
  weatherUrl.searchParams.set("timezone", "auto");
  weatherUrl.searchParams.set("past_hours", String(Math.max(24, lookbackHours)));
  weatherUrl.searchParams.set("forecast_hours", "1");

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.searchParams.set("latitude", String(latitude));
  airUrl.searchParams.set("longitude", String(longitude));
  airUrl.searchParams.set(
    "hourly",
    [
      "uv_index",
      "european_aqi",
      "dust",
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
    ].join(","),
  );
  airUrl.searchParams.set("timezone", "auto");
  airUrl.searchParams.set("past_hours", String(Math.max(24, lookbackHours)));
  airUrl.searchParams.set("forecast_hours", "1");

  const [weather, air] = await Promise.all([fetchJson(weatherUrl), fetchJson(airUrl)]);
  const lags = [0, 6, 12, 24].filter((lag) => lag <= lookbackHours);
  return lags.map((lagHours) =>
    buildTimelinePoint(
      weather,
      air,
      new Date(observedAt.getTime() - lagHours * 60 * 60 * 1000),
      lagHours,
      latitude,
      longitude,
      userId,
    ),
  );
}

function placeholderSnapshot(latitude: number, longitude: number, userId?: string): EnvironmentSnapshot {
  return {
    id: createId("env"),
    userId,
    capturedAt: new Date().toISOString(),
    location: { latitude, longitude },
    weather: {
      temperatureCelsius: undefined,
      humidityPercent: undefined,
      uvIndex: undefined,
    },
    pollen: {
      overallRisk: "unknown",
    },
    source: "placeholder",
  };
}

function placeholderTimeline(latitude: number, longitude: number, observedAt: Date, lookbackHours: number, userId?: string) {
  return [0, 6, 12, 24]
    .filter((lagHours) => lagHours <= lookbackHours)
    .map<EnvironmentTimelinePoint>((lagHours) => ({
      ...placeholderSnapshot(latitude, longitude, userId),
      lagHours,
      capturedAt: new Date(observedAt.getTime() - lagHours * 60 * 60 * 1000).toISOString(),
    }));
}

createService({
  name: "Environment Service",
  port: getNumberEnv("ENVIRONMENT_SERVICE_PORT", 3004),
  registerRoutes(app) {
    app.get("/snapshot", async (request, response) => {
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const resolvedLatitude = Number.isFinite(latitude) ? latitude : DEFAULT_LATITUDE;
      const resolvedLongitude = Number.isFinite(longitude) ? longitude : DEFAULT_LONGITUDE;
      const userId = request.query.userId?.toString();

      try {
        const snapshot = await fetchOpenMeteoSnapshot(resolvedLatitude, resolvedLongitude, userId);
        response.json({
          snapshot,
          integrations: ["open-meteo-weather", "open-meteo-air-quality-pollen"],
        });
      } catch (error) {
        response.status(200).json({
          snapshot: placeholderSnapshot(resolvedLatitude, resolvedLongitude, userId),
          integrations: ["open-meteo-weather", "open-meteo-air-quality-pollen"],
          warning: error instanceof Error ? error.message : "Could not fetch environment data.",
        });
      }
    });

    app.get("/timeline", async (request, response) => {
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const lookbackHours = Number(request.query.lookbackHours);
      const observedAt = request.query.observedAt ? new Date(request.query.observedAt.toString()) : new Date();
      const resolvedLatitude = Number.isFinite(latitude) ? latitude : DEFAULT_LATITUDE;
      const resolvedLongitude = Number.isFinite(longitude) ? longitude : DEFAULT_LONGITUDE;
      const resolvedLookbackHours = Number.isFinite(lookbackHours) ? Math.min(Math.max(lookbackHours, 1), 48) : 24;
      const resolvedObservedAt = Number.isNaN(observedAt.getTime()) ? new Date() : observedAt;
      const userId = request.query.userId?.toString();

      try {
        const timeline = await fetchOpenMeteoTimeline(
          resolvedLatitude,
          resolvedLongitude,
          resolvedObservedAt,
          resolvedLookbackHours,
          userId,
        );
        response.json({
          observedAt: resolvedObservedAt.toISOString(),
          lookbackHours: resolvedLookbackHours,
          timeline,
          integrations: ["open-meteo-weather", "open-meteo-air-quality-pollen"],
        });
      } catch (error) {
        response.status(200).json({
          observedAt: resolvedObservedAt.toISOString(),
          lookbackHours: resolvedLookbackHours,
          timeline: placeholderTimeline(resolvedLatitude, resolvedLongitude, resolvedObservedAt, resolvedLookbackHours, userId),
          integrations: ["open-meteo-weather", "open-meteo-air-quality-pollen"],
          warning: error instanceof Error ? error.message : "Could not fetch environment timeline.",
        });
      }
    });

    app.get("/context-events", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        events: userId ? contextEvents.filter((event) => event.userId === userId) : contextEvents,
      });
    });

    app.post("/context-events", (request, response) => {
      const now = new Date().toISOString();
      const event: ContextEvent = {
        id: createId("context"),
        userId: request.body.userId ?? "demo-user",
        occurredAt: request.body.occurredAt ?? now,
        type: request.body.type ?? "other",
        label: request.body.label,
        notes: request.body.notes,
        createdAt: now,
      };

      contextEvents.push(event);
      response.status(201).json({ event });
    });
  },
});
