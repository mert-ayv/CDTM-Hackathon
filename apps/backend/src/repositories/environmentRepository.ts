import {
  isDatabaseConfigured,
  queryDatabase,
} from "../shared/database.js";
import type { ContextEvent, EnvironmentSnapshot } from "../shared/types.js";

type EnvironmentSnapshotRow = {
  id: string;
  user_id: string | null;
  captured_at: string;
  latitude: number | string | null;
  longitude: number | string | null;
  weather: EnvironmentSnapshot["weather"] | null;
  pollen: EnvironmentSnapshot["pollen"] | null;
  provider: EnvironmentSnapshot["provider"] | null;
  source_url: string | null;
  linked_diary_entry_id: string | null;
  symptom_context: EnvironmentSnapshot["symptomContext"] | null;
  notes: string | null;
  source: EnvironmentSnapshot["source"];
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

type EnvironmentSnapshotFilter = {
  userId?: string;
  from?: string;
  to?: string;
  symptomObserved?: boolean;
  limit?: number;
};

type ContextEventFilter = {
  userId?: string;
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

function rowToEnvironmentSnapshot(row: EnvironmentSnapshotRow): EnvironmentSnapshot {
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
    symptomContext:
      row.symptom_context ??
      (row.linked_diary_entry_id
        ? {
            diaryEntryId: row.linked_diary_entry_id,
            symptomObserved: true,
          }
        : undefined),
    provider: row.provider ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source,
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

function buildSnapshotWhereClause(filter: EnvironmentSnapshotFilter) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.userId) {
    values.push(filter.userId);
    conditions.push(`user_id = $${values.length}`);
  }

  if (filter.from) {
    values.push(filter.from);
    conditions.push(`captured_at >= $${values.length}`);
  }

  if (filter.to) {
    values.push(filter.to);
    conditions.push(`captured_at <= $${values.length}`);
  }

  if (filter.symptomObserved !== undefined) {
    values.push(filter.symptomObserved);
    conditions.push(`(symptom_context ->> 'symptomObserved')::boolean = $${values.length}`);
  }

  return {
    where: conditions.length ? `where ${conditions.join(" and ")}` : "",
    values,
  };
}

export async function loadEnvironmentSnapshots(
  filter: EnvironmentSnapshotFilter = {},
) {
  if (!isDatabaseConfigured()) {
    return [] as EnvironmentSnapshot[];
  }

  const { where, values } = buildSnapshotWhereClause(filter);
  const limit = Math.min(500, Math.max(1, filter.limit ?? 100));
  values.push(limit);

  const result = await queryDatabase<EnvironmentSnapshotRow>(
    `
      select *
      from environment_snapshots
      ${where}
      order by captured_at desc, created_at desc
      limit $${values.length}
    `,
    values,
  );

  return result.rows.map(rowToEnvironmentSnapshot);
}

export async function upsertEnvironmentSnapshot(snapshot: EnvironmentSnapshot) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into environment_snapshots (
        id, user_id, captured_at, latitude, longitude, weather, pollen,
        provider, source_url, linked_diary_entry_id, symptom_context, notes,
        source, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
      on conflict (id) do update set
        user_id = excluded.user_id,
        captured_at = excluded.captured_at,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        weather = excluded.weather,
        pollen = excluded.pollen,
        provider = excluded.provider,
        source_url = excluded.source_url,
        linked_diary_entry_id = excluded.linked_diary_entry_id,
        symptom_context = excluded.symptom_context,
        notes = excluded.notes,
        source = excluded.source,
        updated_at = now()
    `,
    [
      snapshot.id,
      snapshot.userId ?? null,
      snapshot.capturedAt,
      snapshot.location?.latitude ?? null,
      snapshot.location?.longitude ?? null,
      toJsonb(snapshot.weather),
      toJsonb(snapshot.pollen),
      snapshot.provider ?? null,
      snapshot.sourceUrl ?? null,
      snapshot.symptomContext?.diaryEntryId ?? null,
      toJsonb(snapshot.symptomContext),
      snapshot.notes ?? null,
      snapshot.source,
      snapshot.createdAt ?? snapshot.capturedAt,
    ],
  );
}

function buildContextEventWhereClause(filter: ContextEventFilter) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.userId) {
    values.push(filter.userId);
    conditions.push(`user_id = $${values.length}`);
  }

  return {
    where: conditions.length ? `where ${conditions.join(" and ")}` : "",
    values,
  };
}

export async function loadContextEvents(filter: ContextEventFilter = {}) {
  if (!isDatabaseConfigured()) {
    return [] as ContextEvent[];
  }

  const { where, values } = buildContextEventWhereClause(filter);
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

export async function upsertContextEvent(event: ContextEvent) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into context_events (
        id, user_id, occurred_at, type, label, notes, created_at
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (id) do update set
        user_id = excluded.user_id,
        occurred_at = excluded.occurred_at,
        type = excluded.type,
        label = excluded.label,
        notes = excluded.notes
    `,
    [
      event.id,
      event.userId,
      event.occurredAt,
      event.type,
      event.label,
      event.notes ?? null,
      event.createdAt,
    ],
  );
}
