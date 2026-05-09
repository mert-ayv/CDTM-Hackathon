import type { Response } from "express";
import {
  deleteMedication,
  deleteTreatmentApplication,
  loadTreatmentStore,
  upsertMedication,
  upsertTreatmentApplication,
} from "../../repositories/treatmentRepository.js";
import { bodyRegions } from "../../shared/bodyMap.js";
import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type {
  BodySide,
  Medication,
  TreatmentApplication,
} from "../../shared/types.js";

type UnknownRecord = Record<string, unknown>;

const medicationTypes: Array<NonNullable<Medication["type"]>> = [
  "emollient",
  "topical_steroid",
  "topical_calcineurin_inhibitor",
  "antihistamine",
  "antibiotic",
  "biologic",
  "supplement",
  "other",
];

const medicationForms: Array<NonNullable<Medication["form"]>> = [
  "cream",
  "ointment",
  "lotion",
  "gel",
  "tablet",
  "capsule",
  "drops",
  "injection",
  "other",
];

const applicationReasons: Array<NonNullable<TreatmentApplication["reason"]>> = [
  "routine",
  "flare",
  "itch",
  "dryness",
  "prevention",
  "other",
];

let medications: Medication[] = [];
let applications: TreatmentApplication[] = [];

async function initializeTreatmentStore() {
  try {
    const store = await loadTreatmentStore();
    medications = store.medications;
    applications = store.applications;
    console.log(
      `Treatment Service loaded ${medications.length} medications and ${applications.length} applications from storage.`,
    );
  } catch (error) {
    console.warn(
      `Treatment Service storage load failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

void initializeTreatmentStore();

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
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

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function clampScale(value: unknown): number | undefined {
  const numberValue = asNumber(value);

  if (numberValue === undefined) {
    return undefined;
  }

  return Math.min(10, Math.max(0, Math.round(numberValue)));
}

function asIsoDate(value: unknown, fallback: string) {
  const raw = asString(value);

  if (!raw) {
    return fallback;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeMedicationType(value: unknown): Medication["type"] | undefined {
  const raw = asString(value);
  return medicationTypes.find((type) => type === raw);
}

function normalizeMedicationForm(value: unknown): Medication["form"] | undefined {
  const raw = asString(value);
  return medicationForms.find((form) => form === raw);
}

function normalizeApplicationReason(
  value: unknown,
): TreatmentApplication["reason"] | undefined {
  const raw = asString(value);
  return applicationReasons.find((reason) => reason === raw);
}

function normalizeSide(value: unknown): BodySide | undefined {
  return value === "front" || value === "back" ? value : undefined;
}

function findBodyRegion(bodyRegionId: string | undefined) {
  return bodyRegionId
    ? bodyRegions.find((region) => region.id === bodyRegionId)
    : undefined;
}

function getBodyRegionSide(bodyRegionId: string | undefined, fallback?: BodySide) {
  return findBodyRegion(bodyRegionId)?.side ?? fallback;
}

function badRequest(response: Response, message: string) {
  response.status(400).json({ error: "bad_request", message });
}

function getMedicationOr404(id: string, response: Response) {
  const medication = medications.find((item) => item.id === id);

  if (!medication) {
    response.status(404).json({ error: "medication_not_found" });
    return undefined;
  }

  return medication;
}

function getApplicationOr404(id: string, response: Response) {
  const application = applications.find((item) => item.id === id);

  if (!application) {
    response.status(404).json({ error: "application_not_found" });
    return undefined;
  }

  return application;
}

function createMedicationFromBody(value: unknown): Medication {
  const body = asRecord(value);
  const now = new Date().toISOString();
  const name = asString(body.name);

  if (!name) {
    throw new Error("Medication name is required.");
  }

  return {
    id: createId("med"),
    userId: asString(body.userId) ?? "demo-user",
    name,
    type: normalizeMedicationType(body.type),
    form: normalizeMedicationForm(body.form),
    activeIngredient: asString(body.activeIngredient),
    strength: asString(body.strength),
    dosage: asString(body.dosage),
    schedule: asString(body.schedule),
    instructions: asString(body.instructions),
    prescribedBy: asString(body.prescribedBy),
    startDate: asIsoDate(body.startDate, now),
    endDate: asString(body.endDate) ? asIsoDate(body.endDate, now) : undefined,
    active: asBoolean(body.active) ?? true,
    notes: asString(body.notes),
    createdAt: now,
    updatedAt: now,
  };
}

function patchMedication(medication: Medication, value: unknown): Medication {
  const body = asRecord(value);
  const patched = { ...medication, updatedAt: new Date().toISOString() };

  if ("name" in body) {
    const name = asString(body.name);

    if (!name) {
      throw new Error("Medication name cannot be empty.");
    }

    patched.name = name;
  }

  if ("type" in body) {
    patched.type = normalizeMedicationType(body.type);
  }

  if ("form" in body) {
    patched.form = normalizeMedicationForm(body.form);
  }

  if ("activeIngredient" in body) {
    patched.activeIngredient = asString(body.activeIngredient);
  }

  if ("strength" in body) {
    patched.strength = asString(body.strength);
  }

  if ("dosage" in body) {
    patched.dosage = asString(body.dosage);
  }

  if ("schedule" in body) {
    patched.schedule = asString(body.schedule);
  }

  if ("instructions" in body) {
    patched.instructions = asString(body.instructions);
  }

  if ("prescribedBy" in body) {
    patched.prescribedBy = asString(body.prescribedBy);
  }

  if ("startDate" in body) {
    patched.startDate = asString(body.startDate)
      ? asIsoDate(body.startDate, medication.startDate ?? patched.updatedAt)
      : undefined;
  }

  if ("endDate" in body) {
    patched.endDate = asString(body.endDate)
      ? asIsoDate(body.endDate, patched.updatedAt)
      : undefined;
  }

  if ("active" in body) {
    patched.active = asBoolean(body.active) ?? medication.active ?? true;
  }

  if ("notes" in body) {
    patched.notes = asString(body.notes);
  }

  return patched;
}

function createApplicationFromBody(value: unknown): TreatmentApplication {
  const body = asRecord(value);
  const now = new Date().toISOString();
  const medicationId = asString(body.medicationId);
  const bodyRegionId = asString(body.bodyRegionId);

  if (medicationId && !medications.some((medication) => medication.id === medicationId)) {
    throw new Error(`Unknown medicationId "${medicationId}".`);
  }

  if (bodyRegionId && !findBodyRegion(bodyRegionId)) {
    throw new Error(`Unknown bodyRegionId "${bodyRegionId}".`);
  }

  return {
    id: createId("treatment"),
    userId: asString(body.userId) ?? "demo-user",
    medicationId,
    appliedAt: asIsoDate(body.appliedAt, now),
    bodyRegionId,
    side: normalizeSide(body.side) ?? getBodyRegionSide(bodyRegionId),
    amount: asString(body.amount),
    reason: normalizeApplicationReason(body.reason),
    itchinessBefore: clampScale(body.itchinessBefore),
    itchinessAfter: clampScale(body.itchinessAfter),
    drynessBefore: clampScale(body.drynessBefore),
    drynessAfter: clampScale(body.drynessAfter),
    rednessBefore: clampScale(body.rednessBefore),
    rednessAfter: clampScale(body.rednessAfter),
    effectiveness: clampScale(body.effectiveness),
    sideEffects: asStringArray(body.sideEffects),
    notes: asString(body.notes),
    createdAt: now,
    updatedAt: now,
  };
}

function patchApplication(
  application: TreatmentApplication,
  value: unknown,
): TreatmentApplication {
  const body = asRecord(value);
  const patched = { ...application, updatedAt: new Date().toISOString() };

  if ("medicationId" in body) {
    const medicationId = asString(body.medicationId);

    if (
      medicationId &&
      !medications.some((medication) => medication.id === medicationId)
    ) {
      throw new Error(`Unknown medicationId "${medicationId}".`);
    }

    patched.medicationId = medicationId;
  }

  if ("appliedAt" in body) {
    patched.appliedAt = asIsoDate(body.appliedAt, application.appliedAt);
  }

  if ("bodyRegionId" in body) {
    const bodyRegionId = asString(body.bodyRegionId);

    if (bodyRegionId && !findBodyRegion(bodyRegionId)) {
      throw new Error(`Unknown bodyRegionId "${bodyRegionId}".`);
    }

    patched.bodyRegionId = bodyRegionId;
    patched.side = getBodyRegionSide(bodyRegionId, patched.side);
  }

  if ("side" in body) {
    patched.side = normalizeSide(body.side) ?? patched.side;
  }

  if ("amount" in body) {
    patched.amount = asString(body.amount);
  }

  if ("reason" in body) {
    patched.reason = normalizeApplicationReason(body.reason);
  }

  if ("itchinessBefore" in body) {
    patched.itchinessBefore = clampScale(body.itchinessBefore);
  }

  if ("itchinessAfter" in body) {
    patched.itchinessAfter = clampScale(body.itchinessAfter);
  }

  if ("drynessBefore" in body) {
    patched.drynessBefore = clampScale(body.drynessBefore);
  }

  if ("drynessAfter" in body) {
    patched.drynessAfter = clampScale(body.drynessAfter);
  }

  if ("rednessBefore" in body) {
    patched.rednessBefore = clampScale(body.rednessBefore);
  }

  if ("rednessAfter" in body) {
    patched.rednessAfter = clampScale(body.rednessAfter);
  }

  if ("effectiveness" in body) {
    patched.effectiveness = clampScale(body.effectiveness);
  }

  if ("sideEffects" in body) {
    patched.sideEffects = asStringArray(body.sideEffects);
  }

  if ("notes" in body) {
    patched.notes = asString(body.notes);
  }

  return patched;
}

function filterMedications(query: UnknownRecord) {
  const userId = asString(query.userId);
  const active = asString(query.active);
  const type = normalizeMedicationType(query.type);

  return medications.filter((medication) => {
    if (userId && medication.userId !== userId) {
      return false;
    }

    if (active === "true" && medication.active === false) {
      return false;
    }

    if (active === "false" && medication.active !== false) {
      return false;
    }

    if (type && medication.type !== type) {
      return false;
    }

    return true;
  });
}

function filterApplications(query: UnknownRecord) {
  const userId = asString(query.userId);
  const medicationId = asString(query.medicationId);
  const bodyRegionId = asString(query.bodyRegionId);
  const from = asString(query.from);
  const to = asString(query.to);

  return applications.filter((application) => {
    if (userId && application.userId !== userId) {
      return false;
    }

    if (medicationId && application.medicationId !== medicationId) {
      return false;
    }

    if (bodyRegionId && application.bodyRegionId !== bodyRegionId) {
      return false;
    }

    if (from && application.appliedAt < asIsoDate(from, from)) {
      return false;
    }

    if (to && application.appliedAt > asIsoDate(to, to)) {
      return false;
    }

    return true;
  });
}

function sortNewestApplicationFirst(
  left: TreatmentApplication,
  right: TreatmentApplication,
) {
  return new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime();
}

function buildTreatmentSummary(userId: string | undefined, days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const relevantApplications = applications.filter((application) => {
    if (userId && application.userId !== userId) {
      return false;
    }

    return new Date(application.appliedAt).getTime() >= since;
  });
  const relevantMedicationIds = new Set(
    relevantApplications
      .map((application) => application.medicationId)
      .filter((id): id is string => Boolean(id)),
  );
  const relevantMedications = medications.filter((medication) => {
    if (userId && medication.userId !== userId) {
      return false;
    }

    return medication.active || relevantMedicationIds.has(medication.id);
  });
  const medicationUseCounts = new Map<string, number>();
  const effectivenessScores = relevantApplications
    .map((application) => application.effectiveness)
    .filter((score): score is number => score !== undefined);
  const itchinessDeltas = relevantApplications
    .map((application) =>
      application.itchinessBefore !== undefined &&
      application.itchinessAfter !== undefined
        ? application.itchinessBefore - application.itchinessAfter
        : undefined,
    )
    .filter((delta): delta is number => delta !== undefined);

  for (const application of relevantApplications) {
    if (!application.medicationId) {
      continue;
    }

    medicationUseCounts.set(
      application.medicationId,
      (medicationUseCounts.get(application.medicationId) ?? 0) + 1,
    );
  }

  return {
    userId,
    days,
    medicationCount: relevantMedications.length,
    activeMedicationCount: relevantMedications.filter(
      (medication) => medication.active !== false,
    ).length,
    applicationCount: relevantApplications.length,
    averages: {
      effectiveness:
        effectivenessScores.length > 0
          ? effectivenessScores.reduce((sum, score) => sum + score, 0) /
            effectivenessScores.length
          : null,
      itchinessReduction:
        itchinessDeltas.length > 0
          ? itchinessDeltas.reduce((sum, delta) => sum + delta, 0) /
            itchinessDeltas.length
          : null,
    },
    topMedications: [...medicationUseCounts.entries()]
      .map(([medicationId, count]) => ({
        medicationId,
        medicationName:
          medications.find((medication) => medication.id === medicationId)?.name ??
          "Unknown medication",
        count,
      }))
      .sort((left, right) => right.count - left.count),
  };
}

async function persistMedication(medication: Medication) {
  try {
    await upsertMedication(medication);
  } catch (error) {
    console.warn(
      `Treatment Service medication persist failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function persistApplication(application: TreatmentApplication) {
  try {
    await upsertTreatmentApplication(application);
  } catch (error) {
    console.warn(
      `Treatment Service application persist failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function removeMedication(id: string) {
  try {
    await deleteMedication(id);
  } catch (error) {
    console.warn(
      `Treatment Service medication delete failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function removeApplication(id: string) {
  try {
    await deleteTreatmentApplication(id);
  } catch (error) {
    console.warn(
      `Treatment Service application delete failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

createService({
  name: "Treatment Service",
  port: getNumberEnv("TREATMENT_SERVICE_PORT", 3006),
  registerRoutes(app) {
    app.get("/metadata", (_request, response) => {
      response.json({
        medicationTypes,
        medicationForms,
        applicationReasons,
        scales: {
          itchiness: { min: 0, max: 10 },
          dryness: { min: 0, max: 10 },
          redness: { min: 0, max: 10 },
          effectiveness: { min: 0, max: 10 },
        },
        bodyRegions,
      });
    });

    app.get("/medications", (request, response) => {
      response.json({
        medications: filterMedications(request.query as UnknownRecord),
      });
    });

    app.post("/medications", async (request, response) => {
      try {
        const medication = createMedicationFromBody(request.body);

        medications.push(medication);
        await persistMedication(medication);
        response.status(201).json({ medication });
      } catch (error) {
        badRequest(
          response,
          error instanceof Error ? error.message : "Could not create medication.",
        );
      }
    });

    app.get("/medications/:id", (request, response) => {
      const medication = getMedicationOr404(request.params.id, response);

      if (!medication) {
        return;
      }

      response.json({ medication });
    });

    app.patch("/medications/:id", async (request, response) => {
      const medicationIndex = medications.findIndex(
        (medication) => medication.id === request.params.id,
      );

      if (medicationIndex === -1) {
        response.status(404).json({ error: "medication_not_found" });
        return;
      }

      try {
        const patched = patchMedication(medications[medicationIndex], request.body);
        medications[medicationIndex] = patched;
        await persistMedication(patched);
        response.json({ medication: patched });
      } catch (error) {
        badRequest(
          response,
          error instanceof Error ? error.message : "Could not update medication.",
        );
      }
    });

    app.delete("/medications/:id", async (request, response) => {
      const medication = getMedicationOr404(request.params.id, response);

      if (!medication) {
        return;
      }

      const deletedApplications = applications.filter(
        (application) => application.medicationId === medication.id,
      );

      medications = medications.filter((item) => item.id !== medication.id);
      applications = applications.filter(
        (application) => application.medicationId !== medication.id,
      );
      await removeMedication(medication.id);

      response.json({ deleted: medication, deletedApplications });
    });

    app.get("/applications", (request, response) => {
      response.json({
        applications: filterApplications(request.query as UnknownRecord).sort(
          sortNewestApplicationFirst,
        ),
      });
    });

    app.post("/applications", async (request, response) => {
      try {
        const application = createApplicationFromBody(request.body);

        applications.push(application);
        await persistApplication(application);
        response.status(201).json({ application });
      } catch (error) {
        badRequest(
          response,
          error instanceof Error
            ? error.message
            : "Could not create treatment application.",
        );
      }
    });

    app.get("/applications/:id", (request, response) => {
      const application = getApplicationOr404(request.params.id, response);

      if (!application) {
        return;
      }

      response.json({ application });
    });

    app.patch("/applications/:id", async (request, response) => {
      const applicationIndex = applications.findIndex(
        (application) => application.id === request.params.id,
      );

      if (applicationIndex === -1) {
        response.status(404).json({ error: "application_not_found" });
        return;
      }

      try {
        const patched = patchApplication(
          applications[applicationIndex],
          request.body,
        );
        applications[applicationIndex] = patched;
        await persistApplication(patched);
        response.json({ application: patched });
      } catch (error) {
        badRequest(
          response,
          error instanceof Error
            ? error.message
            : "Could not update treatment application.",
        );
      }
    });

    app.delete("/applications/:id", async (request, response) => {
      const application = getApplicationOr404(request.params.id, response);

      if (!application) {
        return;
      }

      applications = applications.filter((item) => item.id !== application.id);
      await removeApplication(application.id);
      response.json({ deleted: application });
    });

    app.get("/summary", (request, response) => {
      const days = Math.min(365, Math.max(1, asNumber(request.query.days) ?? 14));
      response.json({
        summary: buildTreatmentSummary(asString(request.query.userId), days),
      });
    });
  },
});
