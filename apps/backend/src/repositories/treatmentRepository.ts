import {
  isDatabaseConfigured,
  queryDatabase,
} from "../shared/database.js";
import type {
  Medication,
  TreatmentApplication,
} from "../shared/types.js";

type MedicationRow = {
  id: string;
  user_id: string;
  name: string;
  type: Medication["type"] | null;
  form: Medication["form"] | null;
  active_ingredient: string | null;
  strength: string | null;
  dosage: string | null;
  schedule: string | null;
  instructions: string | null;
  prescribed_by: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

type TreatmentApplicationRow = {
  id: string;
  user_id: string;
  medication_id: string | null;
  applied_at: string;
  body_region_id: string | null;
  side: TreatmentApplication["side"] | null;
  amount: string | null;
  reason: TreatmentApplication["reason"] | null;
  itchiness_before: number | null;
  itchiness_after: number | null;
  dryness_before: number | null;
  dryness_after: number | null;
  redness_before: number | null;
  redness_after: number | null;
  effectiveness: number | null;
  side_effects: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type ?? undefined,
    form: row.form ?? undefined,
    activeIngredient: row.active_ingredient ?? undefined,
    strength: row.strength ?? undefined,
    dosage: row.dosage ?? undefined,
    schedule: row.schedule ?? undefined,
    instructions: row.instructions ?? undefined,
    prescribedBy: row.prescribed_by ?? undefined,
    startDate: row.start_date ? toIsoString(row.start_date) : undefined,
    endDate: row.end_date ? toIsoString(row.end_date) : undefined,
    active: row.active ?? true,
    notes: row.notes ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: row.updated_at ? toIsoString(row.updated_at) : undefined,
  };
}

function rowToApplication(row: TreatmentApplicationRow): TreatmentApplication {
  return {
    id: row.id,
    userId: row.user_id,
    medicationId: row.medication_id ?? undefined,
    appliedAt: toIsoString(row.applied_at),
    bodyRegionId: row.body_region_id ?? undefined,
    side: row.side ?? undefined,
    amount: row.amount ?? undefined,
    reason: row.reason ?? undefined,
    itchinessBefore: row.itchiness_before ?? undefined,
    itchinessAfter: row.itchiness_after ?? undefined,
    drynessBefore: row.dryness_before ?? undefined,
    drynessAfter: row.dryness_after ?? undefined,
    rednessBefore: row.redness_before ?? undefined,
    rednessAfter: row.redness_after ?? undefined,
    effectiveness: row.effectiveness ?? undefined,
    sideEffects: row.side_effects ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: row.updated_at ? toIsoString(row.updated_at) : undefined,
  };
}

export async function loadTreatmentStore() {
  if (!isDatabaseConfigured()) {
    return {
      medications: [] as Medication[],
      applications: [] as TreatmentApplication[],
    };
  }

  const [medicationsResult, applicationsResult] = await Promise.all([
    queryDatabase<MedicationRow>(
      "select * from medications order by created_at desc",
    ),
    queryDatabase<TreatmentApplicationRow>(
      "select * from treatment_applications order by applied_at desc, created_at desc",
    ),
  ]);

  return {
    medications: medicationsResult.rows.map(rowToMedication),
    applications: applicationsResult.rows.map(rowToApplication),
  };
}

export async function upsertMedication(medication: Medication) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into medications (
        id, user_id, name, type, form, active_ingredient, strength, dosage,
        schedule, instructions, prescribed_by, start_date, end_date, active,
        notes, created_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        name = excluded.name,
        type = excluded.type,
        form = excluded.form,
        active_ingredient = excluded.active_ingredient,
        strength = excluded.strength,
        dosage = excluded.dosage,
        schedule = excluded.schedule,
        instructions = excluded.instructions,
        prescribed_by = excluded.prescribed_by,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        active = excluded.active,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `,
    [
      medication.id,
      medication.userId,
      medication.name,
      medication.type ?? null,
      medication.form ?? null,
      medication.activeIngredient ?? null,
      medication.strength ?? null,
      medication.dosage ?? null,
      medication.schedule ?? null,
      medication.instructions ?? null,
      medication.prescribedBy ?? null,
      medication.startDate ?? null,
      medication.endDate ?? null,
      medication.active ?? true,
      medication.notes ?? null,
      medication.createdAt,
      medication.updatedAt ?? medication.createdAt,
    ],
  );
}

export async function deleteMedication(id: string) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase("delete from medications where id = $1", [id]);
}

export async function upsertTreatmentApplication(
  application: TreatmentApplication,
) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into treatment_applications (
        id, user_id, medication_id, applied_at, body_region_id, side, amount,
        reason, itchiness_before, itchiness_after, dryness_before, dryness_after,
        redness_before, redness_after, effectiveness, side_effects, notes,
        created_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        medication_id = excluded.medication_id,
        applied_at = excluded.applied_at,
        body_region_id = excluded.body_region_id,
        side = excluded.side,
        amount = excluded.amount,
        reason = excluded.reason,
        itchiness_before = excluded.itchiness_before,
        itchiness_after = excluded.itchiness_after,
        dryness_before = excluded.dryness_before,
        dryness_after = excluded.dryness_after,
        redness_before = excluded.redness_before,
        redness_after = excluded.redness_after,
        effectiveness = excluded.effectiveness,
        side_effects = excluded.side_effects,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `,
    [
      application.id,
      application.userId,
      application.medicationId ?? null,
      application.appliedAt,
      application.bodyRegionId ?? null,
      application.side ?? null,
      application.amount ?? null,
      application.reason ?? null,
      application.itchinessBefore ?? null,
      application.itchinessAfter ?? null,
      application.drynessBefore ?? null,
      application.drynessAfter ?? null,
      application.rednessBefore ?? null,
      application.rednessAfter ?? null,
      application.effectiveness ?? null,
      application.sideEffects ?? null,
      application.notes ?? null,
      application.createdAt,
      application.updatedAt ?? application.createdAt,
    ],
  );
}

export async function deleteTreatmentApplication(id: string) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase("delete from treatment_applications where id = $1", [id]);
}
