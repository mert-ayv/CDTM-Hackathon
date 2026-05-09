import {
  isDatabaseConfigured,
  queryDatabase,
} from "../shared/database.js";
import type { RashPhoto } from "../shared/types.js";

export type PersistedRashPhoto = RashPhoto & Record<string, unknown>;

type RashPhotoRow = {
  id: string;
  user_id: string;
  taken_at: string;
  body_region_id: string | null;
  side: RashPhoto["side"] | null;
  storage_url: string | null;
  storage_type: string;
  local_file_name: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  user_severity_score: number | null;
  user_intensity: number | null;
  itchiness: number | null;
  dryness: number | null;
  redness: number | null;
  pain: number | null;
  swelling: number | null;
  notes: string | null;
  ai_analysis_status: RashPhoto["aiAnalysisStatus"];
  ai_severity_score: number | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  ai_findings: string[] | null;
  ai_analysis: unknown | null;
  ai_analysis_error: string | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToPhoto(row: RashPhotoRow): PersistedRashPhoto {
  return {
    id: row.id,
    userId: row.user_id,
    takenAt: toIsoString(row.taken_at),
    bodyRegionId: row.body_region_id ?? undefined,
    side: row.side ?? undefined,
    storageUrl: row.storage_url ?? undefined,
    storageType: row.storage_type,
    localFileName: row.local_file_name ?? undefined,
    originalFilename: row.original_filename ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    userSeverityScore: row.user_severity_score ?? undefined,
    userIntensity: row.user_intensity ?? undefined,
    itchiness: row.itchiness ?? undefined,
    dryness: row.dryness ?? undefined,
    redness: row.redness ?? undefined,
    pain: row.pain ?? undefined,
    swelling: row.swelling ?? undefined,
    notes: row.notes ?? undefined,
    aiAnalysisStatus: row.ai_analysis_status,
    aiSeverityScore: row.ai_severity_score ?? undefined,
    aiConfidence: row.ai_confidence ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiFindings: row.ai_findings ?? undefined,
    aiAnalysis: row.ai_analysis ?? undefined,
    aiAnalysisError: row.ai_analysis_error ?? undefined,
    analyzedAt: row.analyzed_at ? toIsoString(row.analyzed_at) : undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function loadRashPhotos<T extends PersistedRashPhoto>() {
  if (!isDatabaseConfigured()) {
    return [] as T[];
  }

  const result = await queryDatabase<RashPhotoRow>(
    "select * from rash_photos order by taken_at desc, created_at desc",
  );

  return result.rows.map((row) => rowToPhoto(row) as T);
}

export async function upsertRashPhoto(photo: PersistedRashPhoto) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into rash_photos (
        id, user_id, taken_at, body_region_id, side, storage_url, storage_type,
        local_file_name, original_filename, mime_type, file_size_bytes,
        user_severity_score, user_intensity, itchiness, dryness, redness, pain,
        swelling, notes, ai_analysis_status, ai_severity_score, ai_confidence,
        ai_summary, ai_findings, ai_analysis, ai_analysis_error, analyzed_at,
        created_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        taken_at = excluded.taken_at,
        body_region_id = excluded.body_region_id,
        side = excluded.side,
        storage_url = excluded.storage_url,
        storage_type = excluded.storage_type,
        local_file_name = excluded.local_file_name,
        original_filename = excluded.original_filename,
        mime_type = excluded.mime_type,
        file_size_bytes = excluded.file_size_bytes,
        user_severity_score = excluded.user_severity_score,
        user_intensity = excluded.user_intensity,
        itchiness = excluded.itchiness,
        dryness = excluded.dryness,
        redness = excluded.redness,
        pain = excluded.pain,
        swelling = excluded.swelling,
        notes = excluded.notes,
        ai_analysis_status = excluded.ai_analysis_status,
        ai_severity_score = excluded.ai_severity_score,
        ai_confidence = excluded.ai_confidence,
        ai_summary = excluded.ai_summary,
        ai_findings = excluded.ai_findings,
        ai_analysis = excluded.ai_analysis,
        ai_analysis_error = excluded.ai_analysis_error,
        analyzed_at = excluded.analyzed_at,
        updated_at = excluded.updated_at
    `,
    [
      photo.id,
      photo.userId,
      photo.takenAt,
      photo.bodyRegionId ?? null,
      photo.side ?? null,
      photo.storageUrl ?? null,
      photo.storageType ?? "metadata_only",
      photo.localFileName ?? null,
      photo.originalFilename ?? null,
      photo.mimeType ?? null,
      photo.fileSizeBytes ?? null,
      photo.userSeverityScore ?? null,
      photo.userIntensity ?? null,
      photo.itchiness ?? null,
      photo.dryness ?? null,
      photo.redness ?? null,
      photo.pain ?? null,
      photo.swelling ?? null,
      photo.notes ?? null,
      photo.aiAnalysisStatus,
      photo.aiSeverityScore ?? null,
      photo.aiConfidence ?? null,
      photo.aiSummary ?? null,
      photo.aiFindings ?? null,
      photo.aiAnalysis ?? null,
      photo.aiAnalysisError ?? null,
      photo.analyzedAt ?? null,
      photo.createdAt,
      photo.updatedAt ?? photo.createdAt,
    ],
  );
}

export async function deleteRashPhoto(id: string) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase("delete from rash_photos where id = $1", [id]);
}
