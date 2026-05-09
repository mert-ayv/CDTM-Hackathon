import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Response } from "express";
import { bodyRegions } from "../../shared/bodyMap.js";
import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type { BodySide, FlareObservation } from "../../shared/types.js";

type UnknownRecord = Record<string, unknown>;
type BodyMapColor = "clear" | "mild" | "moderate" | "severe";

type SkinEntry = FlareObservation & {
  severityScore?: number;
  photoIds?: string[];
  pain?: number;
  swelling?: number;
  active?: boolean;
  updatedAt?: string;
};

const dataDirectory =
  process.env.SKIN_SERVICE_DATA_DIR ?? path.join(process.cwd(), "data", "skin-service");
const databasePath = path.join(dataDirectory, "skin-entries.json");

mkdirSync(dataDirectory, { recursive: true });

const entries: SkinEntry[] = loadEntries();

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

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

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function clampScale(value: unknown, fallback: number, min = 0, max = 10) {
  const numberValue = asNumber(value) ?? fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function asIntensity(value: unknown, fallback = 1): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(asNumber(value) ?? fallback))) as
    | 1
    | 2
    | 3
    | 4
    | 5;
}

function asIsoDate(value: unknown, fallback: string) {
  const raw = asString(value);

  if (!raw) {
    return fallback;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeSide(value: unknown): BodySide | undefined {
  return value === "front" || value === "back" ? value : undefined;
}

function findBodyRegion(bodyRegionId: string | undefined) {
  return bodyRegionId
    ? bodyRegions.find((region) => region.id === bodyRegionId)
    : undefined;
}

function getBodyRegionSide(bodyRegionId: string, fallback?: BodySide) {
  return findBodyRegion(bodyRegionId)?.side ?? fallback ?? "front";
}

function badRequest(response: Response, message: string) {
  response.status(400).json({ error: "bad_request", message });
}

function persistEntries() {
  writeFileSync(
    databasePath,
    JSON.stringify(
      {
        version: 1,
        entries,
      },
      null,
      2,
    ),
  );
}

function normalizePersistedEntry(value: unknown): SkinEntry | undefined {
  const raw = asRecord(value);
  const id = asString(raw.id);
  const bodyRegionId = asString(raw.bodyRegionId);
  const createdAt = asString(raw.createdAt);

  if (!id || !bodyRegionId || !createdAt || !findBodyRegion(bodyRegionId)) {
    return undefined;
  }

  return {
    id,
    userId: asString(raw.userId) ?? "demo-user",
    observedAt: asIsoDate(raw.observedAt, createdAt),
    bodyRegionId,
    side: normalizeSide(raw.side) ?? getBodyRegionSide(bodyRegionId),
    intensity: asIntensity(raw.intensity),
    severityScore:
      raw.severityScore === undefined ? undefined : clampScale(raw.severityScore, 0),
    itchiness: raw.itchiness === undefined ? undefined : clampScale(raw.itchiness, 0),
    dryness: raw.dryness === undefined ? undefined : clampScale(raw.dryness, 0),
    redness: raw.redness === undefined ? undefined : clampScale(raw.redness, 0),
    pain: raw.pain === undefined ? undefined : clampScale(raw.pain, 0),
    swelling: raw.swelling === undefined ? undefined : clampScale(raw.swelling, 0),
    scorradTotal: asNumber(raw.scorradTotal),
    photoIds: asStringArray(raw.photoIds),
    active: asBoolean(raw.active, true),
    notes: asString(raw.notes),
    createdAt,
    updatedAt: asString(raw.updatedAt) ?? createdAt,
  };
}

function loadEntries() {
  if (!existsSync(databasePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(readFileSync(databasePath, "utf8")) as unknown;
    const rawEntries = Array.isArray(parsed) ? parsed : asRecord(parsed).entries;

    if (!Array.isArray(rawEntries)) {
      return [];
    }

    return rawEntries
      .map(normalizePersistedEntry)
      .filter((entry): entry is SkinEntry => Boolean(entry));
  } catch {
    return [];
  }
}

function getEntryOr404(id: string, response: Response) {
  const entry = entries.find((item) => item.id === id);

  if (!entry) {
    response.status(404).json({ error: "skin_entry_not_found" });
    return undefined;
  }

  return entry;
}

function normalizePhotoIds(body: UnknownRecord) {
  return [
    ...new Set([
      ...asStringArray(body.photoIds),
      ...asStringArray(body.photoId),
    ]),
  ];
}

function createEntryFromBody(value: unknown): SkinEntry {
  const body = asRecord(value);
  const now = new Date().toISOString();
  const bodyRegionId = asString(body.bodyRegionId);

  if (!bodyRegionId || !findBodyRegion(bodyRegionId)) {
    throw new Error("Provide a valid bodyRegionId.");
  }

  const intensity = asIntensity(body.intensity ?? body.userIntensity);

  return {
    id: createId("skin"),
    userId: asString(body.userId) ?? "demo-user",
    observedAt: asIsoDate(body.observedAt ?? body.takenAt, now),
    bodyRegionId,
    side: normalizeSide(body.side) ?? getBodyRegionSide(bodyRegionId),
    intensity,
    severityScore:
      body.severityScore === undefined && body.userSeverityScore === undefined
        ? intensity * 2
        : clampScale(body.severityScore ?? body.userSeverityScore, intensity * 2),
    itchiness: body.itchiness === undefined ? undefined : clampScale(body.itchiness, 0),
    dryness: body.dryness === undefined ? undefined : clampScale(body.dryness, 0),
    redness: body.redness === undefined ? undefined : clampScale(body.redness, 0),
    pain: body.pain === undefined ? undefined : clampScale(body.pain, 0),
    swelling: body.swelling === undefined ? undefined : clampScale(body.swelling, 0),
    scorradTotal: asNumber(body.scorradTotal),
    photoIds: normalizePhotoIds(body),
    active: asBoolean(body.active, true),
    notes: asString(body.notes),
    createdAt: now,
    updatedAt: now,
  };
}

function patchEntry(entry: SkinEntry, value: unknown) {
  const body = asRecord(value);

  if ("observedAt" in body || "takenAt" in body) {
    entry.observedAt = asIsoDate(body.observedAt ?? body.takenAt, entry.observedAt);
  }

  if ("bodyRegionId" in body) {
    const bodyRegionId = asString(body.bodyRegionId);

    if (!bodyRegionId || !findBodyRegion(bodyRegionId)) {
      throw new Error("Provide a valid bodyRegionId.");
    }

    entry.bodyRegionId = bodyRegionId;
    entry.side = getBodyRegionSide(bodyRegionId, entry.side);
  }

  if ("side" in body) {
    entry.side = normalizeSide(body.side) ?? entry.side;
  }

  if ("intensity" in body || "userIntensity" in body) {
    entry.intensity = asIntensity(body.intensity ?? body.userIntensity, entry.intensity);
  }

  if ("severityScore" in body || "userSeverityScore" in body) {
    entry.severityScore = clampScale(
      body.severityScore ?? body.userSeverityScore,
      entry.severityScore ?? entry.intensity * 2,
    );
  }

  if ("itchiness" in body) {
    entry.itchiness = clampScale(body.itchiness, 0);
  }

  if ("dryness" in body) {
    entry.dryness = clampScale(body.dryness, 0);
  }

  if ("redness" in body) {
    entry.redness = clampScale(body.redness, 0);
  }

  if ("pain" in body) {
    entry.pain = clampScale(body.pain, 0);
  }

  if ("swelling" in body) {
    entry.swelling = clampScale(body.swelling, 0);
  }

  if ("scorradTotal" in body) {
    entry.scorradTotal = asNumber(body.scorradTotal);
  }

  if ("photoIds" in body || "photoId" in body) {
    entry.photoIds = normalizePhotoIds(body);
  }

  if ("active" in body) {
    entry.active = asBoolean(body.active, entry.active ?? true);
  }

  if ("notes" in body) {
    entry.notes = asString(body.notes);
  }

  entry.updatedAt = new Date().toISOString();
  return entry;
}

function filterEntries(query: UnknownRecord) {
  const userId = asString(query.userId);
  const bodyRegionId = asString(query.bodyRegionId);
  const side = normalizeSide(query.side);
  const active = asString(query.active);

  return entries.filter((entry) => {
    if (userId && entry.userId !== userId) {
      return false;
    }

    if (bodyRegionId && entry.bodyRegionId !== bodyRegionId) {
      return false;
    }

    if (side && entry.side !== side) {
      return false;
    }

    if (active === "true" && entry.active === false) {
      return false;
    }

    if (active === "false" && entry.active !== false) {
      return false;
    }

    return true;
  });
}

function sortNewestFirst(left: SkinEntry, right: SkinEntry) {
  return new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime();
}

function getSeverityScore(entry: SkinEntry) {
  return entry.severityScore ?? entry.intensity * 2;
}

function getSeverityColor(score: number | undefined): BodyMapColor {
  if (score === undefined || score <= 0) {
    return "clear";
  }

  if (score <= 3) {
    return "mild";
  }

  if (score <= 6) {
    return "moderate";
  }

  return "severe";
}

function getBodyMapColorHex(color: BodyMapColor) {
  switch (color) {
    case "mild":
      return "#facc15";
    case "moderate":
      return "#fb923c";
    case "severe":
      return "#ef4444";
    case "clear":
    default:
      return "#22c55e";
  }
}

function toPhotoReference(photoId: string) {
  return {
    id: photoId,
    photoId,
    metadataUrl: `/api/photos/${photoId}`,
    imageUrl: `/api/photos/${photoId}/image`,
  };
}

function serializeEntry(entry: SkinEntry) {
  return {
    ...entry,
    photos: (entry.photoIds ?? []).map(toPhotoReference),
  };
}

function buildBodyMap(query: UnknownRecord) {
  const relevantEntries = filterEntries({
    ...query,
    active: asString(query.active) ?? "true",
  });

  return bodyRegions.map((region) => {
    const regionEntries = relevantEntries
      .filter((entry) => entry.bodyRegionId === region.id)
      .sort(sortNewestFirst);
    const latestEntry = regionEntries[0];
    const severityScores = regionEntries.map(getSeverityScore);
    const latestSeverityScore = latestEntry ? getSeverityScore(latestEntry) : undefined;
    const maxSeverityScore = severityScores.length
      ? Math.max(...severityScores)
      : undefined;
    const color = getSeverityColor(latestSeverityScore);
    const photoIds = [
      ...new Set(regionEntries.flatMap((entry) => entry.photoIds ?? [])),
    ];

    return {
      ...region,
      active: regionEntries.length > 0,
      entryCount: regionEntries.length,
      photoCount: photoIds.length,
      latestEntryId: latestEntry?.id,
      latestObservedAt: latestEntry?.observedAt,
      latestSeverityScore,
      maxSeverityScore,
      color,
      colorHex: getBodyMapColorHex(color),
    };
  });
}

createService({
  name: "Skin Service",
  port: getNumberEnv("SKIN_SERVICE_PORT", 3002),
  registerRoutes(app) {
    app.get("/metadata", (_request, response) => {
      response.json({
        owns: ["body-map", "rash-entries", "region-history", "photo-references"],
        scales: {
          severity: { min: 0, max: 10 },
          intensity: { min: 1, max: 5 },
          itchiness: { min: 0, max: 10 },
          dryness: { min: 0, max: 10 },
          redness: { min: 0, max: 10 },
          pain: { min: 0, max: 10 },
          swelling: { min: 0, max: 10 },
        },
        bodyRegions,
      });
    });

    app.get("/body-map/regions", (_request, response) => {
      response.json({ regions: bodyRegions });
    });

    app.get("/body-map", (request, response) => {
      response.json({
        regions: buildBodyMap(request.query as UnknownRecord),
      });
    });

    app.get("/body-map/regions/:bodyRegionId/entries", (request, response) => {
      const region = findBodyRegion(request.params.bodyRegionId);

      if (!region) {
        response.status(404).json({ error: "body_region_not_found" });
        return;
      }

      const regionEntries = filterEntries({
        ...request.query,
        bodyRegionId: request.params.bodyRegionId,
      }).sort(sortNewestFirst);

      response.json({
        region,
        entries: regionEntries.map(serializeEntry),
      });
    });

    app.get("/body-map/regions/:bodyRegionId/photos", (request, response) => {
      const region = findBodyRegion(request.params.bodyRegionId);

      if (!region) {
        response.status(404).json({ error: "body_region_not_found" });
        return;
      }

      const regionEntries = filterEntries({
        ...request.query,
        bodyRegionId: request.params.bodyRegionId,
      }).sort(sortNewestFirst);
      const photoIds = [
        ...new Set(regionEntries.flatMap((entry) => entry.photoIds ?? [])),
      ];

      response.json({
        region,
        photoIds,
        photos: photoIds.map(toPhotoReference),
        entries: regionEntries.map(serializeEntry),
      });
    });

    app.get("/entries", (request, response) => {
      response.json({
        entries: filterEntries(request.query as UnknownRecord)
          .sort(sortNewestFirst)
          .map(serializeEntry),
      });
    });

    app.get("/flare-observations", (request, response) => {
      response.json({
        observations: filterEntries(request.query as UnknownRecord)
          .sort(sortNewestFirst)
          .map(serializeEntry),
      });
    });

    app.post(["/entries", "/flare-observations"], (request, response) => {
      try {
        const entry = createEntryFromBody(request.body);
        entries.push(entry);
        persistEntries();

        response.status(201).json({
          entry: serializeEntry(entry),
          observation: serializeEntry(entry),
        });
      } catch (error) {
        badRequest(
          response,
          error instanceof Error ? error.message : "Could not create skin entry.",
        );
      }
    });

    app.get(["/entries/:id", "/flare-observations/:id"], (request, response) => {
      const entry = getEntryOr404(request.params.id, response);

      if (!entry) {
        return;
      }

      response.json({
        entry: serializeEntry(entry),
        observation: serializeEntry(entry),
      });
    });

    app.patch(["/entries/:id", "/flare-observations/:id"], (request, response) => {
      const entry = getEntryOr404(request.params.id, response);

      if (!entry) {
        return;
      }

      try {
        patchEntry(entry, request.body);
        persistEntries();

        response.json({
          entry: serializeEntry(entry),
          observation: serializeEntry(entry),
        });
      } catch (error) {
        badRequest(
          response,
          error instanceof Error ? error.message : "Could not update skin entry.",
        );
      }
    });

    app.delete(["/entries/:id", "/flare-observations/:id"], (request, response) => {
      const entryIndex = entries.findIndex((entry) => entry.id === request.params.id);

      if (entryIndex === -1) {
        response.status(404).json({ error: "skin_entry_not_found" });
        return;
      }

      const [deleted] = entries.splice(entryIndex, 1);
      persistEntries();

      response.json({
        deleted: serializeEntry(deleted),
      });
    });
  },
});
