import type { Response } from "express";
import { loadDiaryStore } from "../../repositories/diaryRepository.js";
import {
  loadInsightContextEvents,
  loadInsightEnvironmentSnapshots,
  loadSkinObservations,
  persistFlareForecast,
  persistTriggerCandidates,
  type PersistedFlareForecast,
  type PersistedTriggerCandidate,
} from "../../repositories/insightsRepository.js";
import { loadRashPhotos } from "../../repositories/rashPhotoRepository.js";
import { loadTreatmentStore } from "../../repositories/treatmentRepository.js";
import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type {
  ActiveRashLog,
  ContextEvent,
  DiaryEntry,
  EnvironmentSnapshot,
  FlareForecast,
  FlareObservation,
  FoodLogItem,
  RashPhoto,
  TreatmentApplication,
  TriggerCandidate,
} from "../../shared/types.js";

type UnknownRecord = Record<string, unknown>;
type TriggerCategory = TriggerCandidate["category"];
type FlareRisk = FlareForecast["risk"];

type ExposureEvent = {
  id: string;
  userId: string;
  occurredAt: string;
  factor: string;
  label: string;
  category: TriggerCategory;
  source: "diary" | "environment" | "context" | "treatment";
  strength: number;
  details?: Record<string, unknown>;
};

type FlareEvent = {
  id: string;
  userId: string;
  occurredAt: string;
  severity: number;
  source: "diary" | "skin" | "photo";
  reasons: string[];
};

type AnalysisDataset = {
  userId: string;
  from: string;
  to: string;
  diaryEntries: DiaryEntry[];
  photos: Array<RashPhoto & Record<string, unknown>>;
  skinObservations: FlareObservation[];
  environmentSnapshots: EnvironmentSnapshot[];
  contextEvents: ContextEvent[];
  treatmentApplications: TreatmentApplication[];
};

type DailyFeature = {
  date: string;
  flareSeverity: number;
  flareCount: number;
  exposureFactors: string[];
  exposureCount: number;
};

type TriggerEvidence = {
  exposureCount: number;
  flareMatches: number;
  postExposureRate: number;
  baselineFlareRate: number;
  lift: number;
  lagHours: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  examples: string[];
};

type InsightCandidate = PersistedTriggerCandidate & {
  label: string;
  evidence: TriggerEvidence;
};

type ForecastResult = PersistedFlareForecast & {
  score: number;
  recentSignals: Array<{
    factor: string;
    label: string;
    confidence: number;
    occurredAt: string;
  }>;
  modelStatus: "insufficient_data" | "heuristic";
};

const modelVersion = "heuristic-trigger-v1";

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

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function hoursBetween(left: string, right: string) {
  return (toTimestamp(right) - toTimestamp(left)) / (60 * 60 * 1000);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeFactor(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function getMaxSeverity(values: Array<number | undefined>) {
  return Math.max(0, ...values.filter((value): value is number => value !== undefined));
}

function getRashSeverity(rash: ActiveRashLog) {
  return getMaxSeverity([
    rash.itchiness,
    rash.dryness,
    rash.redness,
    rash.pain,
    rash.swelling,
  ]);
}

function getPhotoSeverity(photo: RashPhoto & Record<string, unknown>) {
  const aiSeverity = asNumber(photo.aiSeverityScore);
  const userSeverity = asNumber(photo.userSeverityScore);
  const intensity = asNumber(photo.userIntensity);
  return getMaxSeverity([aiSeverity, userSeverity, intensity ? intensity * 2 : undefined]);
}

function buildFlareEvents(dataset: AnalysisDataset, threshold: number): FlareEvent[] {
  const diaryFlares = dataset.diaryEntries.flatMap((entry) => {
    const rashSeverities = (entry.activeRashes ?? [])
      .filter((rash) => rash.active)
      .map(getRashSeverity);
    const severity = getMaxSeverity(rashSeverities);

    return severity >= threshold
      ? [
          {
            id: `flare_diary_${entry.id}`,
            userId: entry.userId,
            occurredAt: entry.occurredAt,
            severity,
            source: "diary" as const,
            reasons: ["active rash scales in diary"],
          },
        ]
      : [];
  });
  const skinFlares = dataset.skinObservations
    .map((observation) => {
      const severity = getMaxSeverity([
        observation.intensity * 2,
        observation.itchiness,
        observation.dryness,
        observation.redness,
        observation.scorradTotal ? observation.scorradTotal / 10 : undefined,
      ]);

      return {
        observation,
        severity,
      };
    })
    .filter(({ severity }) => severity >= threshold)
    .map(({ observation, severity }) => ({
      id: `flare_skin_${observation.id}`,
      userId: observation.userId,
      occurredAt: observation.observedAt,
      severity,
      source: "skin" as const,
      reasons: ["skin observation severity threshold reached"],
    }));
  const photoFlares = dataset.photos
    .map((photo) => ({ photo, severity: getPhotoSeverity(photo) }))
    .filter(({ severity }) => severity >= threshold)
    .map(({ photo, severity }) => ({
      id: `flare_photo_${photo.id}`,
      userId: photo.userId,
      occurredAt: photo.takenAt,
      severity,
      source: "photo" as const,
      reasons: ["rash photo severity threshold reached"],
    }));

  return [...diaryFlares, ...skinFlares, ...photoFlares].sort(
    (left, right) => toTimestamp(left.occurredAt) - toTimestamp(right.occurredAt),
  );
}

function addFoodExposures(entry: DiaryEntry, exposures: ExposureEvent[]) {
  for (const item of entry.food ?? []) {
    const food = item as FoodLogItem;
    const foodLabel = food.name.trim();

    if (foodLabel) {
      exposures.push({
        id: `exposure_food_item_${entry.id}_${normalizeFactor(foodLabel)}`,
        userId: entry.userId,
        occurredAt: entry.occurredAt,
        factor: `food_item:${normalizeFactor(foodLabel)}`,
        label: foodLabel,
        category: "food",
        source: "diary",
        strength: 0.65,
        details: {
          mealType: food.mealType,
          amount: food.amount,
          barcode: food.barcode,
        },
      });
    }

    for (const category of food.triggerCategories ?? []) {
      exposures.push({
        id: `exposure_food_category_${entry.id}_${category}`,
        userId: entry.userId,
        occurredAt: entry.occurredAt,
        factor: `food:${category}`,
        label: `Food category: ${category}`,
        category: "food",
        source: "diary",
        strength: 0.8,
        details: { foodName: food.name },
      });
    }
  }
}

function addDiarySignalExposures(entry: DiaryEntry, exposures: ExposureEvent[]) {
  const stressLevel = entry.stress?.level ?? entry.stressLevel;

  if (stressLevel !== undefined && stressLevel >= 7) {
    exposures.push({
      id: `exposure_stress_${entry.id}`,
      userId: entry.userId,
      occurredAt: entry.occurredAt,
      factor: "stress:high",
      label: "High stress",
      category: "habit",
      source: "diary",
      strength: stressLevel / 10,
      details: { level: stressLevel, source: entry.stress?.source },
    });
  }

  if (
    entry.sleep &&
    ((entry.sleep.hours !== undefined && entry.sleep.hours < 6) ||
      (entry.sleep.quality !== undefined && entry.sleep.quality <= 2))
  ) {
    exposures.push({
      id: `exposure_sleep_${entry.id}`,
      userId: entry.userId,
      occurredAt: entry.occurredAt,
      factor: "sleep:poor",
      label: "Poor sleep",
      category: "habit",
      source: "diary",
      strength: 0.75,
      details: entry.sleep,
    });
  }

  if ((entry.sport?.sweatLevel ?? 0) >= 7) {
    exposures.push({
      id: `exposure_sweat_${entry.id}`,
      userId: entry.userId,
      occurredAt: entry.occurredAt,
      factor: "sport:sweat_high",
      label: "High sweat after sport",
      category: "habit",
      source: "diary",
      strength: (entry.sport?.sweatLevel ?? 7) / 10,
      details: entry.sport,
    });
  }

  for (const habit of entry.habits ?? []) {
    exposures.push({
      id: `exposure_habit_${entry.id}_${normalizeFactor(habit)}`,
      userId: entry.userId,
      occurredAt: entry.occurredAt,
      factor: `habit:${normalizeFactor(habit)}`,
      label: habit,
      category: "habit",
      source: "diary",
      strength: 0.45,
    });
  }

  for (const change of entry.lifeChanges ?? []) {
    exposures.push({
      id: `exposure_life_change_${entry.id}_${normalizeFactor(change)}`,
      userId: entry.userId,
      occurredAt: entry.occurredAt,
      factor: `context:${normalizeFactor(change)}`,
      label: change,
      category: "habit",
      source: "diary",
      strength: 0.55,
    });
  }
}

function addEnvironmentExposures(
  snapshot: EnvironmentSnapshot,
  exposures: ExposureEvent[],
) {
  if (!snapshot.userId) {
    return;
  }

  const humidity = snapshot.weather?.humidityPercent;
  const temperature = snapshot.weather?.temperatureCelsius;
  const uvIndex = snapshot.weather?.uvIndex;
  const pollen = snapshot.pollen;
  const pollenEntries = Object.entries(pollen ?? {}).filter(
    ([key, value]) => key !== "overallRisk" && typeof value === "number",
  ) as Array<[string, number]>;

  if (humidity !== undefined && humidity < 35) {
    exposures.push({
      id: `exposure_humidity_${snapshot.id}`,
      userId: snapshot.userId,
      occurredAt: snapshot.capturedAt,
      factor: "weather:low_humidity",
      label: "Low humidity",
      category: "environment",
      source: "environment",
      strength: clamp((35 - humidity) / 35, 0.35, 1),
      details: { humidityPercent: humidity },
    });
  }

  if (temperature !== undefined && temperature >= 28) {
    exposures.push({
      id: `exposure_heat_${snapshot.id}`,
      userId: snapshot.userId,
      occurredAt: snapshot.capturedAt,
      factor: "weather:heat",
      label: "High temperature",
      category: "environment",
      source: "environment",
      strength: clamp((temperature - 24) / 12, 0.35, 1),
      details: { temperatureCelsius: temperature },
    });
  }

  if (temperature !== undefined && temperature <= 5 && humidity !== undefined && humidity < 45) {
    exposures.push({
      id: `exposure_cold_dry_${snapshot.id}`,
      userId: snapshot.userId,
      occurredAt: snapshot.capturedAt,
      factor: "weather:cold_dry_air",
      label: "Cold dry air",
      category: "environment",
      source: "environment",
      strength: 0.7,
      details: { temperatureCelsius: temperature, humidityPercent: humidity },
    });
  }

  if (uvIndex !== undefined && uvIndex >= 6) {
    exposures.push({
      id: `exposure_uv_${snapshot.id}`,
      userId: snapshot.userId,
      occurredAt: snapshot.capturedAt,
      factor: "weather:high_uv",
      label: "High UV index",
      category: "environment",
      source: "environment",
      strength: clamp(uvIndex / 10, 0.4, 1),
      details: { uvIndex },
    });
  }

  if (pollen?.overallRisk === "medium" || pollen?.overallRisk === "high") {
    exposures.push({
      id: `exposure_pollen_overall_${snapshot.id}`,
      userId: snapshot.userId,
      occurredAt: snapshot.capturedAt,
      factor: `pollen:${pollen.overallRisk}`,
      label: `${pollen.overallRisk} pollen risk`,
      category: "environment",
      source: "environment",
      strength: pollen.overallRisk === "high" ? 0.85 : 0.55,
      details: pollen,
    });
  }

  for (const [name, value] of pollenEntries) {
    if (value < 10) {
      continue;
    }

    const isAirQuality = name === "pm10" || name === "pm25" || name === "europeanAqi";
    const normalizedName = normalizeFactor(name);

    exposures.push({
      id: `exposure_${isAirQuality ? "air_quality" : "pollen"}_${snapshot.id}_${name}`,
      userId: snapshot.userId,
      occurredAt: snapshot.capturedAt,
      factor: `${isAirQuality ? "air_quality" : "pollen"}:${normalizedName}`,
      label: isAirQuality ? `${name} air quality` : `${name} pollen`,
      category: "environment",
      source: "environment",
      strength: clamp(value / 100, 0.4, 1),
      details: { value },
    });
  }
}

function addContextEventExposure(event: ContextEvent, exposures: ExposureEvent[]) {
  exposures.push({
    id: `exposure_context_${event.id}`,
    userId: event.userId,
    occurredAt: event.occurredAt,
    factor: `context:${event.type}:${normalizeFactor(event.label)}`,
    label: `${event.type}: ${event.label}`,
    category: event.type === "medication" ? "treatment" : "habit",
    source: "context",
    strength: 0.55,
    details: { notes: event.notes },
  });
}

function addTreatmentExposure(
  application: TreatmentApplication,
  exposures: ExposureEvent[],
) {
  const lowEffectiveness =
    application.effectiveness !== undefined && application.effectiveness <= 3;
  const sideEffects = application.sideEffects ?? [];

  if (!lowEffectiveness && sideEffects.length === 0) {
    return;
  }

  exposures.push({
    id: `exposure_treatment_${application.id}`,
    userId: application.userId,
    occurredAt: application.appliedAt,
    factor: application.medicationId
      ? `treatment:${application.medicationId}`
      : "treatment:unspecified",
    label: application.medicationId
      ? `Treatment ${application.medicationId}`
      : "Unspecified treatment",
    category: "treatment",
    source: "treatment",
    strength: sideEffects.length ? 0.75 : 0.45,
    details: {
      reason: application.reason,
      effectiveness: application.effectiveness,
      sideEffects,
    },
  });
}

function buildExposureEvents(dataset: AnalysisDataset) {
  const exposures: ExposureEvent[] = [];

  for (const entry of dataset.diaryEntries) {
    addFoodExposures(entry, exposures);
    addDiarySignalExposures(entry, exposures);
  }

  for (const snapshot of dataset.environmentSnapshots) {
    addEnvironmentExposures(snapshot, exposures);
  }

  for (const event of dataset.contextEvents) {
    addContextEventExposure(event, exposures);
  }

  for (const application of dataset.treatmentApplications) {
    addTreatmentExposure(application, exposures);
  }

  return exposures.sort(
    (left, right) => toTimestamp(left.occurredAt) - toTimestamp(right.occurredAt),
  );
}

function buildDailyFeatures(
  flareEvents: FlareEvent[],
  exposures: ExposureEvent[],
): DailyFeature[] {
  const features = new Map<string, DailyFeature>();

  function getFeature(date: string) {
    const existing = features.get(date);

    if (existing) {
      return existing;
    }

    const feature: DailyFeature = {
      date,
      flareSeverity: 0,
      flareCount: 0,
      exposureFactors: [],
      exposureCount: 0,
    };
    features.set(date, feature);
    return feature;
  }

  for (const flare of flareEvents) {
    const feature = getFeature(flare.occurredAt.slice(0, 10));
    feature.flareSeverity = Math.max(feature.flareSeverity, flare.severity);
    feature.flareCount += 1;
  }

  for (const exposure of exposures) {
    const feature = getFeature(exposure.occurredAt.slice(0, 10));
    feature.exposureCount += 1;
    feature.exposureFactors.push(exposure.factor);
  }

  return [...features.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function buildTriggerCandidates(
  userId: string,
  flareEvents: FlareEvent[],
  exposures: ExposureEvent[],
  days: number,
  lagHours: number,
  minEvidence: number,
) {
  const byFactor = new Map<string, ExposureEvent[]>();
  const baselineFlareRate = flareEvents.length / Math.max(1, days);
  const generatedAt = new Date().toISOString();

  for (const exposure of exposures.filter((item) => item.userId === userId)) {
    byFactor.set(exposure.factor, [...(byFactor.get(exposure.factor) ?? []), exposure]);
  }

  const candidates: InsightCandidate[] = [];

  for (const [factor, factorExposures] of byFactor) {
    let flareMatches = 0;
    const examples: string[] = [];

    for (const exposure of factorExposures) {
      const matchedFlare = flareEvents.find((flare) => {
        const lag = hoursBetween(exposure.occurredAt, flare.occurredAt);
        return lag >= 0 && lag <= lagHours;
      });

      if (matchedFlare) {
        flareMatches += 1;
        if (examples.length < 3) {
          examples.push(
            `${exposure.label} at ${exposure.occurredAt} before flare at ${matchedFlare.occurredAt}`,
          );
        }
      }
    }

    const exposureCount = factorExposures.length;
    const postExposureRate = flareMatches / Math.max(1, exposureCount);
    const lift = postExposureRate - baselineFlareRate;
    const evidenceWeight = clamp(exposureCount / 8, 0.15, 1);
    const dataQualityWeight = flareEvents.length < 3 ? 0.45 : 1;
    const confidence = clamp(
      (lift + postExposureRate * 0.45) * evidenceWeight * dataQualityWeight,
      0,
      0.95,
    );
    const representative = factorExposures[0];

    if (exposureCount < minEvidence && confidence < 0.3) {
      continue;
    }

    candidates.push({
      id: createId("trigger"),
      userId,
      generatedAt,
      factor,
      label: representative.label,
      category: representative.category,
      confidence: Number(confidence.toFixed(3)),
      explanation:
        flareMatches > 0
          ? `${representative.label} appeared before ${flareMatches} of ${exposureCount} logged exposures within ${lagHours}h. This is a possible pattern, not proof of causation.${flareEvents.length < 3 ? " Confidence is capped because there are fewer than three flare events." : ""}`
          : `${representative.label} is tracked but has not yet preceded a detected flare in the configured ${lagHours}h window.`,
      evidence: {
        exposureCount,
        flareMatches,
        postExposureRate: Number(postExposureRate.toFixed(3)),
        baselineFlareRate: Number(baselineFlareRate.toFixed(3)),
        lift: Number(lift.toFixed(3)),
        lagHours,
        firstSeenAt: factorExposures[0]?.occurredAt,
        lastSeenAt: factorExposures.at(-1)?.occurredAt,
        examples,
      },
    });
  }

  return candidates.sort((left, right) => right.confidence - left.confidence);
}

function buildForecast(
  userId: string,
  horizonHours: 24 | 48,
  days: number,
  flareEvents: FlareEvent[],
  exposures: ExposureEvent[],
  candidates: InsightCandidate[],
  dailyFeatures: DailyFeature[],
) {
  const now = new Date().toISOString();
  const recentThreshold = Date.now() - horizonHours * 60 * 60 * 1000;
  const recentExposures = exposures.filter(
    (exposure) =>
      exposure.userId === userId && toTimestamp(exposure.occurredAt) >= recentThreshold,
  );
  const candidateByFactor = new Map(candidates.map((candidate) => [candidate.factor, candidate]));
  const recentSignalByFactor = new Map<
    string,
    {
      factor: string;
      label: string;
      confidence: number;
      occurredAt: string;
    }
  >();

  for (const exposure of recentExposures) {
    const candidate = candidateByFactor.get(exposure.factor);

    if (!candidate) {
      continue;
    }

    const existing = recentSignalByFactor.get(exposure.factor);

    if (!existing || toTimestamp(exposure.occurredAt) > toTimestamp(existing.occurredAt)) {
      recentSignalByFactor.set(exposure.factor, {
        factor: exposure.factor,
        label: exposure.label,
        confidence: candidate.confidence,
        occurredAt: exposure.occurredAt,
      });
    }
  }

  const recentSignals = [...recentSignalByFactor.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 8);
  const baseline = clamp(flareEvents.length / Math.max(7, days), 0, 0.6);
  const signalScore = clamp(
    recentSignals.reduce((sum, signal) => sum + signal.confidence, 0) / 3,
    0,
    0.75,
  );
  const latestFlare = flareEvents.at(-1);
  const activeFlareScore =
    latestFlare && hoursBetween(latestFlare.occurredAt, now) <= 24
      ? clamp(latestFlare.severity / 20, 0.1, 0.4)
      : 0;
  const rawScore = clamp(baseline + signalScore + activeFlareScore, 0, 0.95);
  const score = flareEvents.length < 3 ? Math.min(rawScore, 0.55) : rawScore;
  const risk: FlareRisk = score >= 0.66 ? "high" : score >= 0.33 ? "medium" : "low";
  const reasons =
    recentSignals.length > 0
      ? recentSignals
          .slice(0, 4)
          .map((signal) => `${signal.label} is a recent signal with confidence ${signal.confidence}.`)
      : [
          flareEvents.length < 3
            ? "Not enough flare history for a strong personalized prediction."
            : "No high-confidence trigger signal was logged recently.",
        ];
  const forecast: ForecastResult = {
    id: createId("forecast"),
    userId,
    horizonHours,
    generatedAt: now,
    risk,
    confidence: Number(score.toFixed(3)),
    reasons,
    score: Number(score.toFixed(3)),
    recentSignals,
    modelStatus: flareEvents.length < 3 ? "insufficient_data" : "heuristic",
    modelVersion,
    rawFeatures: {
      days,
      flareCount: flareEvents.length,
      exposureCount: exposures.length,
      recentExposureCount: recentExposures.length,
      dailyFeatures,
    },
  };

  return forecast;
}

async function loadAnalysisDataset(userId: string, days: number) {
  const from = daysAgo(days);
  const to = new Date().toISOString();
  const [
    diaryStore,
    photos,
    skinObservations,
    environmentSnapshots,
    contextEvents,
    treatmentStore,
  ] = await Promise.all([
    loadDiaryStore(),
    loadRashPhotos<Array<RashPhoto & Record<string, unknown>>[number]>(),
    loadSkinObservations({ userId, from, to }),
    loadInsightEnvironmentSnapshots({ userId, from, to }),
    loadInsightContextEvents({ userId, from, to }),
    loadTreatmentStore(),
  ]);

  return {
    userId,
    from,
    to,
    diaryEntries: diaryStore.entries.filter(
      (entry) => entry.userId === userId && entry.occurredAt >= from,
    ),
    photos: photos.filter((photo) => photo.userId === userId && photo.takenAt >= from),
    skinObservations,
    environmentSnapshots,
    contextEvents,
    treatmentApplications: treatmentStore.applications.filter(
      (application) => application.userId === userId && application.appliedAt >= from,
    ),
  } satisfies AnalysisDataset;
}

async function analyzeUser({
  userId,
  days,
  lagHours,
  horizonHours,
  flareThreshold,
  minEvidence,
  persist,
}: {
  userId: string;
  days: number;
  lagHours: number;
  horizonHours: 24 | 48;
  flareThreshold: number;
  minEvidence: number;
  persist: boolean;
}) {
  const dataset = await loadAnalysisDataset(userId, days);
  const flareEvents = buildFlareEvents(dataset, flareThreshold);
  const exposures = buildExposureEvents(dataset);
  const dailyFeatures = buildDailyFeatures(flareEvents, exposures);
  const candidates = buildTriggerCandidates(
    userId,
    flareEvents,
    exposures,
    days,
    lagHours,
    minEvidence,
  );
  const forecast = buildForecast(
    userId,
    horizonHours,
    days,
    flareEvents,
    exposures,
    candidates,
    dailyFeatures,
  );

  if (persist) {
    await Promise.all([
      persistTriggerCandidates(candidates),
      persistFlareForecast(forecast),
    ]);
  }

  return {
    dataset,
    flareEvents,
    exposures,
    dailyFeatures,
    candidates,
    forecast,
  };
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
}

function getOpenAiModel() {
  return process.env.OPENAI_INSIGHTS_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function extractResponseText(value: unknown) {
  const data = asRecord(value);
  const outputText = asString(data.output_text);

  if (outputText) {
    return outputText;
  }

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    const content = asRecord(item).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      const contentRecord = asRecord(contentItem);
      const text = asString(contentRecord.text) ?? asString(contentRecord.output_text);

      if (text) {
        chunks.push(text);
      }
    }
  }

  return chunks.join("\n").trim() || undefined;
}

function parseJsonFromText(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("OpenAI response did not contain a JSON object.");
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

function buildFallbackExplanation(
  forecast: ForecastResult,
  candidates: InsightCandidate[],
) {
  return {
    source: "heuristic",
    summary:
      candidates.length > 0
        ? `Current ${forecast.horizonHours}h risk is ${forecast.risk}. Top possible pattern: ${candidates[0].label}.`
        : `Current ${forecast.horizonHours}h risk is ${forecast.risk}. More history is needed before ranking triggers reliably.`,
    keyFindings: candidates.slice(0, 3).map((candidate) => candidate.explanation),
    cautions: [
      "These are correlations in self-tracking data, not proof of medical causation.",
      "Use the results as discussion material for a healthcare professional.",
    ],
    suggestedNextLogs: [
      "Keep logging symptoms, sleep, stress, food and treatments consistently.",
      "Add environmental snapshots when symptoms change.",
    ],
  };
}

async function explainWithOpenAi(
  forecast: ForecastResult,
  candidates: InsightCandidate[],
) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    return buildFallbackExplanation(forecast, candidates);
  }

  const payload = {
    forecast: {
      risk: forecast.risk,
      confidence: forecast.confidence,
      horizonHours: forecast.horizonHours,
      reasons: forecast.reasons,
      modelStatus: forecast.modelStatus,
    },
    topTriggerCandidates: candidates.slice(0, 8).map((candidate) => ({
      factor: candidate.factor,
      label: candidate.label,
      category: candidate.category,
      confidence: candidate.confidence,
      explanation: candidate.explanation,
      evidence: candidate.evidence,
    })),
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      input: [
        {
          role: "system",
          content:
            "You explain neurodermatitis self-tracking analytics. Do not diagnose. Do not claim causation. Return JSON only.",
        },
        {
          role: "user",
          content: [
            "Create a concise German explanation for the app UI.",
            "Use cautious wording: possible pattern, correlation, needs more data.",
            "JSON shape: {\"source\":\"openai\",\"summary\":\"string\",\"keyFindings\":[\"string\"],\"cautions\":[\"string\"],\"suggestedNextLogs\":[\"string\"]}.",
            `Analytics JSON: ${JSON.stringify(payload)}`,
          ].join("\n"),
        },
      ],
      text: {
        format: { type: "json_object" },
      },
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI returned ${response.status}: ${await response.text()}`);
  }

  const text = extractResponseText(await response.json());

  if (!text) {
    throw new Error("OpenAI response did not contain text output.");
  }

  return {
    ...buildFallbackExplanation(forecast, candidates),
    ...asRecord(parseJsonFromText(text)),
    source: "openai",
  };
}

function getNumberQuery(value: unknown, fallback: number, min: number, max: number) {
  const parsed = asNumber(value);
  return Math.min(max, Math.max(min, parsed ?? fallback));
}

function getBooleanQuery(value: unknown, fallback: boolean) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function getAnalysisOptions(query: UnknownRecord, body?: UnknownRecord) {
  const source = { ...query, ...body };
  const horizonHours: 24 | 48 = Number(source.horizonHours) === 48 ? 48 : 24;

  return {
    userId: asString(source.userId) ?? "demo-user",
    days: getNumberQuery(source.days, 30, 7, 365),
    lagHours: getNumberQuery(source.lagHours, 48, 6, 168),
    horizonHours,
    flareThreshold: getNumberQuery(source.flareThreshold, 6, 1, 10),
    minEvidence: getNumberQuery(source.minEvidence, 2, 1, 20),
    persist: asBoolean(source.persist, getBooleanQuery(source.persist, false)),
  };
}

function handleError(response: Response, error: unknown) {
  response.status(500).json({
    error: "insights_failed",
    message: error instanceof Error ? error.message : "Insights analysis failed.",
  });
}

createService({
  name: "Insights Service",
  port: getNumberEnv("INSIGHTS_SERVICE_PORT", 3005),
  registerRoutes(app) {
    app.get("/metadata", (_request, response) => {
      response.json({
        modelVersion,
        openAiConfigured: Boolean(getOpenAiApiKey()),
        openAiModel: getOpenAiModel(),
        endpoints: [
          "GET /features",
          "POST /features/rebuild",
          "GET /triggers",
          "POST /trigger-candidates",
          "GET /forecast",
          "POST /explain",
        ],
        defaults: {
          days: 30,
          lagHours: 48,
          flareThreshold: 6,
          minEvidence: 2,
        },
      });
    });

    app.get("/features", async (request, response) => {
      try {
        const options = getAnalysisOptions(request.query as UnknownRecord);
        const analysis = await analyzeUser(options);

        response.json({
          userId: options.userId,
          from: analysis.dataset.from,
          to: analysis.dataset.to,
          dailyFeatures: analysis.dailyFeatures,
          flareEvents: analysis.flareEvents,
          exposures: analysis.exposures,
        });
      } catch (error) {
        handleError(response, error);
      }
    });

    app.post("/features/rebuild", async (request, response) => {
      try {
        const options = getAnalysisOptions(
          request.query as UnknownRecord,
          asRecord(request.body),
        );
        const analysis = await analyzeUser({ ...options, persist: true });

        response.json({
          rebuilt: true,
          userId: options.userId,
          flareEventCount: analysis.flareEvents.length,
          exposureCount: analysis.exposures.length,
          triggerCandidateCount: analysis.candidates.length,
          forecast: analysis.forecast,
        });
      } catch (error) {
        handleError(response, error);
      }
    });

    app.get("/triggers", async (request, response) => {
      try {
        const options = getAnalysisOptions(request.query as UnknownRecord);
        const analysis = await analyzeUser(options);

        response.json({
          userId: options.userId,
          modelVersion,
          candidates: analysis.candidates,
          dataQuality: {
            flareEventCount: analysis.flareEvents.length,
            exposureCount: analysis.exposures.length,
            days: options.days,
          },
        });
      } catch (error) {
        handleError(response, error);
      }
    });

    app.post("/trigger-candidates", async (request, response) => {
      try {
        const options = getAnalysisOptions(
          request.query as UnknownRecord,
          asRecord(request.body),
        );
        const analysis = await analyzeUser(options);

        response.json({
          candidates: analysis.candidates,
          modelStatus:
            analysis.flareEvents.length < 3 ? "insufficient_data" : "heuristic",
          dataQuality: {
            flareEventCount: analysis.flareEvents.length,
            exposureCount: analysis.exposures.length,
            days: options.days,
          },
        });
      } catch (error) {
        handleError(response, error);
      }
    });

    app.get("/forecast", async (request, response) => {
      try {
        const options = getAnalysisOptions(request.query as UnknownRecord);
        const analysis = await analyzeUser(options);

        response.json({ forecast: analysis.forecast });
      } catch (error) {
        handleError(response, error);
      }
    });

    app.post("/explain", async (request, response) => {
      try {
        const options = getAnalysisOptions(
          request.query as UnknownRecord,
          asRecord(request.body),
        );
        const analysis = await analyzeUser(options);
        const explanation = await explainWithOpenAi(
          analysis.forecast,
          analysis.candidates,
        );

        response.json({
          forecast: analysis.forecast,
          candidates: analysis.candidates.slice(0, 8),
          explanation,
        });
      } catch (error) {
        response.status(502).json({
          error: "explanation_failed",
          fallback:
            "The deterministic forecast and trigger candidates are still available via /forecast and /triggers.",
          message: error instanceof Error ? error.message : "Explanation failed.",
        });
      }
    });
  },
});
