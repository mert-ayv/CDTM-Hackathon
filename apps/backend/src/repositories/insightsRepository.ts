import {
  isDatabaseConfigured,
  queryDatabase,
} from "../shared/database.js";
import type {
  ContextEvent,
  EnvironmentSnapshot,
  FlareForecast,
  FlareObservation,
  TriggerCandidate,
} from "../shared/types.js";

export type PersistedTriggerCandidate = TriggerCandidate & {
  id: string;
  userId: string;
  generatedAt: string;
  evidence?: Record<string, unknown>;
};

export type PersistedFlareForecast = FlareForecast & {
  id: string;
  modelVersion?: string;
  rawFeatures?: Record<string, unknown>;
};

type SkinObservationRow = {
  id: string;
  user_id: string;
  observed_at: string;
  body_region_id: string;
  side: FlareObservation["side"];
  intensity: number;
  itchiness: number | null;
  dryness: number | null;
  redness: number | null;
  scorrad_total: number | null;
  notes: string | null;
  created_at: string;
};

type ContextEventRow = {
  id: string;
  user_id: string;
  occurred_at: string;
  type: ContextEvent["type"];
  label: string;
  notes: string | null;
  created_at: string;
};

type EnvironmentSnapshotRow = {
  id: string;
  user_id: string | null;
  captured_at: string;
  latitude: number | string | null;
  longitude: number | string | null;
  weather: EnvironmentSnapshot["weather"] | null;
  pollen: EnvironmentSnapshot["pollen"] | null;
  source: EnvironmentSnapshot["source"];
  created_at: string;
};

type SkinObservationFilter = {
  userId?: string;
  from?: string;
  to?: string;
};

type ContextEventFilter = {
  userId?: string;
  from?: string;
  to?: string;
};

type EnvironmentSnapshotFilter = {
  userId?: string;
  from?: string;
  to?: string;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toJsonb(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function rowToSkinObservation(row: SkinObservationRow): FlareObservation {
  return {
    id: row.id,
    userId: row.user_id,
    observedAt: toIsoString(row.observed_at),
    bodyRegionId: row.body_region_id,
    side: row.side,
    intensity: row.intensity as FlareObservation["intensity"],
    itchiness: toNumber(row.itchiness),
    dryness: toNumber(row.dryness),
    redness: toNumber(row.redness),
    scorradTotal: toNumber(row.scorrad_total),
    notes: row.notes ?? undefined,
    createdAt: toIsoString(row.created_at),
  };
}

function rowToContextEvent(row: ContextEventRow): ContextEvent {
  return {
    id: row.id,
    userId: row.user_id,
    occurredAt: toIsoString(row.occurred_at),
    type: row.type,
    label: row.label,
    notes: row.notes ?? undefined,
    createdAt: toIsoString(row.created_at),
  };
}

function rowToEnvironmentSnapshot(
  row: EnvironmentSnapshotRow,
): EnvironmentSnapshot {
  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    capturedAt: toIsoString(row.captured_at),
    location:
      latitude !== undefined && longitude !== undefined
        ? { latitude, longitude }
        : undefined,
    weather: row.weather ?? undefined,
    pollen: row.pollen ?? undefined,
    source: row.source,
    createdAt: toIsoString(row.created_at),
  };
}

function buildTimeWhereClause(
  filter: { userId?: string; from?: string; to?: string },
  timestampColumn: string,
) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.userId) {
    values.push(filter.userId);
    conditions.push(`user_id = $${values.length}`);
  }

  if (filter.from) {
    values.push(filter.from);
    conditions.push(`${timestampColumn} >= $${values.length}`);
  }

  if (filter.to) {
    values.push(filter.to);
    conditions.push(`${timestampColumn} <= $${values.length}`);
  }

  return {
    where: conditions.length ? `where ${conditions.join(" and ")}` : "",
    values,
  };
}

export async function loadSkinObservations(filter: SkinObservationFilter = {}) {
  if (!isDatabaseConfigured()) {
    return [] as FlareObservation[];
  }

  const { where, values } = buildTimeWhereClause(filter, "observed_at");
  const result = await queryDatabase<SkinObservationRow>(
    `
      select *
      from skin_observations
      ${where}
      order by observed_at desc, created_at desc
    `,
    values,
  );

  return result.rows.map(rowToSkinObservation);
}

export async function loadInsightContextEvents(filter: ContextEventFilter = {}) {
  if (!isDatabaseConfigured()) {
    return [] as ContextEvent[];
  }

  const { where, values } = buildTimeWhereClause(filter, "occurred_at");
  const result = await queryDatabase<ContextEventRow>(
    `
      select *
      from context_events
      ${where}
      order by occurred_at desc, created_at desc
    `,
    values,
  );

  return result.rows.map(rowToContextEvent);
}

export async function loadInsightEnvironmentSnapshots(
  filter: EnvironmentSnapshotFilter = {},
) {
  if (!isDatabaseConfigured()) {
    return [] as EnvironmentSnapshot[];
  }

  const { where, values } = buildTimeWhereClause(filter, "captured_at");
  const result = await queryDatabase<EnvironmentSnapshotRow>(
    `
      select
        id,
        user_id,
        captured_at,
        latitude,
        longitude,
        weather,
        pollen,
        source,
        created_at
      from environment_snapshots
      ${where}
      order by captured_at desc, created_at desc
    `,
    values,
  );

  return result.rows.map(rowToEnvironmentSnapshot);
}

export async function persistFlareForecast(forecast: PersistedFlareForecast) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into flare_forecasts (
        id, user_id, horizon_hours, generated_at, risk, confidence, reasons,
        model_version, raw_features
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      on conflict (id) do update set
        user_id = excluded.user_id,
        horizon_hours = excluded.horizon_hours,
        generated_at = excluded.generated_at,
        risk = excluded.risk,
        confidence = excluded.confidence,
        reasons = excluded.reasons,
        model_version = excluded.model_version,
        raw_features = excluded.raw_features
    `,
    [
      forecast.id,
      forecast.userId,
      forecast.horizonHours,
      forecast.generatedAt,
      forecast.risk,
      forecast.confidence,
      forecast.reasons,
      forecast.modelVersion ?? null,
      toJsonb(forecast.rawFeatures),
    ],
  );
}

export async function persistTriggerCandidates(
  candidates: PersistedTriggerCandidate[],
) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await Promise.all(
    candidates.map((candidate) =>
      queryDatabase(
        `
          insert into trigger_candidates (
            id, user_id, factor, category, confidence, explanation, evidence,
            generated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (id) do update set
            user_id = excluded.user_id,
            factor = excluded.factor,
            category = excluded.category,
            confidence = excluded.confidence,
            explanation = excluded.explanation,
            evidence = excluded.evidence,
            generated_at = excluded.generated_at
        `,
        [
          candidate.id,
          candidate.userId,
          candidate.factor,
          candidate.category,
          candidate.confidence,
          candidate.explanation,
          toJsonb(candidate.evidence),
          candidate.generatedAt,
        ],
      ),
    ),
  );
}
