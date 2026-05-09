import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Response } from "express";
import {
  deleteRashPhoto,
  loadRashPhotos,
  upsertRashPhoto,
} from "../../repositories/rashPhotoRepository.js";
import { bodyRegions } from "../../shared/bodyMap.js";
import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type { BodySide, RashPhoto } from "../../shared/types.js";

type UnknownRecord = Record<string, unknown>;

type BodyMapColor = "clear" | "mild" | "moderate" | "severe";

type RashPhotoAnalysis = {
  severityScore?: number;
  confidence?: number;
  visualSigns: string[];
  summary?: string;
  colorHint?: BodyMapColor;
  needsMedicalAttention?: boolean;
  limitations: string[];
};

type RashPhotoRecord = RashPhoto & {
  storageType: "local_file" | "remote_url" | "metadata_only";
  localFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  userSeverityScore?: number;
  userIntensity?: 1 | 2 | 3 | 4 | 5;
  itchiness?: number;
  dryness?: number;
  redness?: number;
  pain?: number;
  swelling?: number;
  notes?: string;
  aiConfidence?: number;
  aiSummary?: string;
  aiFindings?: string[];
  aiAnalysis?: RashPhotoAnalysis;
  aiAnalysisError?: string;
  analyzedAt?: string;
  updatedAt: string;
};

type PhotoListOptions = {
  includeImageData: boolean;
};

const supportedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const dataDirectory =
  process.env.PHOTO_SERVICE_DATA_DIR ?? path.join(process.cwd(), "data", "photo-service");
const uploadsDirectory = path.join(dataDirectory, "uploads");
const databasePath = path.join(dataDirectory, "photos.json");

mkdirSync(uploadsDirectory, { recursive: true });

let photos: RashPhotoRecord[] = loadPhotos();

async function initializePhotoStore() {
  try {
    const databasePhotos = await loadRashPhotos<RashPhotoRecord>();

    if (databasePhotos.length > 0) {
      photos = databasePhotos;
    }

    console.log(`Photo Service loaded ${photos.length} photos from storage.`);
  } catch (error) {
    console.warn(
      `Photo Service storage load failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

void initializePhotoStore();

async function deleteStoredPhoto(id: string) {
  try {
    await deleteRashPhoto(id);
  } catch (error) {
    console.warn(
      `Photo Service database delete failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
}

function clampScale(value: unknown, fallback: number, min = 0, max = 10) {
  const numberValue = asNumber(value) ?? fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function asScale1To5(value: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  const numberValue = asNumber(value);

  if (numberValue === undefined) {
    return undefined;
  }

  return Math.min(5, Math.max(1, Math.round(numberValue))) as 1 | 2 | 3 | 4 | 5;
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

function getBodyRegionSide(bodyRegionId: string | undefined, fallback?: BodySide) {
  return findBodyRegion(bodyRegionId)?.side ?? fallback;
}

function isValidAnalysisStatus(
  value: unknown,
): value is RashPhotoRecord["aiAnalysisStatus"] {
  return value === "pending" || value === "complete" || value === "failed";
}

function getImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  return mimeType.replace("image/", "");
}

function parseDataUri(value: string) {
  const match = value
    .trim()
    .match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([a-zA-Z0-9+/=\s]+)$/);

  if (!match) {
    throw new Error("Expected dataUri as data:image/<jpeg|png|webp|gif>;base64,...");
  }

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];

  if (!supportedImageMimeTypes.has(mimeType)) {
    throw new Error("Unsupported image type. Use jpeg, png, webp or gif.");
  }

  return {
    mimeType,
    buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"),
  };
}

function persistPhotos() {
  writeFileSync(
    databasePath,
    JSON.stringify(
      {
        version: 1,
        photos,
      },
      null,
      2,
    ),
  );
  void Promise.all(photos.map((photo) => upsertRashPhoto(photo))).catch((error) => {
    console.warn(
      `Photo Service database persist failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  });
}

function normalizePersistedPhoto(value: unknown): RashPhotoRecord | undefined {
  const raw = asRecord(value);
  const id = asString(raw.id);
  const createdAt = asString(raw.createdAt);

  if (!id || !createdAt) {
    return undefined;
  }

  const userId = asString(raw.userId) ?? "demo-user";
  const bodyRegionId = asString(raw.bodyRegionId);
  const side = normalizeSide(raw.side) ?? getBodyRegionSide(bodyRegionId);
  const storageType = asString(raw.storageType);

  return {
    id,
    userId,
    takenAt: asIsoDate(raw.takenAt, createdAt),
    bodyRegionId,
    side,
    storageUrl: asString(raw.storageUrl),
    originalFilename: asString(raw.originalFilename),
    aiSeverityScore: asNumber(raw.aiSeverityScore),
    aiAnalysisStatus: isValidAnalysisStatus(raw.aiAnalysisStatus)
      ? raw.aiAnalysisStatus
      : "pending",
    createdAt,
    storageType:
      storageType === "local_file" || storageType === "remote_url"
        ? storageType
        : "metadata_only",
    localFileName: asString(raw.localFileName),
    mimeType: asString(raw.mimeType),
    fileSizeBytes: asNumber(raw.fileSizeBytes),
    userSeverityScore:
      raw.userSeverityScore === undefined
        ? undefined
        : clampScale(raw.userSeverityScore, 0),
    userIntensity: asScale1To5(raw.userIntensity),
    itchiness: raw.itchiness === undefined ? undefined : clampScale(raw.itchiness, 0),
    dryness: raw.dryness === undefined ? undefined : clampScale(raw.dryness, 0),
    redness: raw.redness === undefined ? undefined : clampScale(raw.redness, 0),
    pain: raw.pain === undefined ? undefined : clampScale(raw.pain, 0),
    swelling: raw.swelling === undefined ? undefined : clampScale(raw.swelling, 0),
    notes: asString(raw.notes),
    aiConfidence: asNumber(raw.aiConfidence),
    aiSummary: asString(raw.aiSummary),
    aiFindings: asStringArray(raw.aiFindings),
    aiAnalysis: normalizeAnalysis(raw.aiAnalysis),
    aiAnalysisError: asString(raw.aiAnalysisError),
    analyzedAt: asString(raw.analyzedAt),
    updatedAt: asString(raw.updatedAt) ?? createdAt,
  };
}

function loadPhotos() {
  if (!existsSync(databasePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(readFileSync(databasePath, "utf8")) as unknown;
    const rawPhotos = Array.isArray(parsed) ? parsed : asRecord(parsed).photos;

    if (!Array.isArray(rawPhotos)) {
      return [];
    }

    return rawPhotos
      .map(normalizePersistedPhoto)
      .filter((photo): photo is RashPhotoRecord => Boolean(photo));
  } catch {
    return [];
  }
}

function normalizeAnalysis(value: unknown): RashPhotoAnalysis | undefined {
  const raw = asRecord(value);

  if (!Object.keys(raw).length) {
    return undefined;
  }

  const colorHint = asString(raw.colorHint);

  return {
    severityScore:
      raw.severityScore === undefined ? undefined : clampScale(raw.severityScore, 0),
    confidence:
      raw.confidence === undefined
        ? undefined
        : Math.min(1, Math.max(0, asNumber(raw.confidence) ?? 0)),
    visualSigns: asStringArray(raw.visualSigns),
    summary: asString(raw.summary),
    colorHint:
      colorHint === "clear" ||
      colorHint === "mild" ||
      colorHint === "moderate" ||
      colorHint === "severe"
        ? colorHint
        : undefined,
    needsMedicalAttention: asBoolean(raw.needsMedicalAttention, false),
    limitations: asStringArray(raw.limitations),
  };
}

function serializePhoto(photo: RashPhotoRecord, options: PhotoListOptions) {
  const { localFileName: _localFileName, ...safePhoto } = photo;

  return {
    ...safePhoto,
    imageUrl: photo.localFileName ? `/photos/${photo.id}/image` : photo.storageUrl,
    imageDataUri: options.includeImageData ? readPhotoDataUri(photo) : undefined,
  };
}

function readPhotoDataUri(photo: RashPhotoRecord) {
  if (!photo.localFileName || !photo.mimeType) {
    return undefined;
  }

  try {
    const file = readFileSync(path.join(uploadsDirectory, photo.localFileName));
    return `data:${photo.mimeType};base64,${file.toString("base64")}`;
  } catch {
    return undefined;
  }
}

function filterPhotos(query: UnknownRecord) {
  const userId = asString(query.userId);
  const bodyRegionId = asString(query.bodyRegionId);
  const side = normalizeSide(query.side);

  return photos.filter((photo) => {
    if (userId && photo.userId !== userId) {
      return false;
    }

    if (bodyRegionId && photo.bodyRegionId !== bodyRegionId) {
      return false;
    }

    if (side && photo.side !== side) {
      return false;
    }

    return true;
  });
}

function getSeverityScore(photo: RashPhotoRecord) {
  return (
    photo.aiSeverityScore ??
    photo.userSeverityScore ??
    (photo.userIntensity ? photo.userIntensity * 2 : undefined)
  );
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

function sortNewestFirst(left: RashPhotoRecord, right: RashPhotoRecord) {
  return new Date(right.takenAt).getTime() - new Date(left.takenAt).getTime();
}

function buildBodyMap(query: UnknownRecord) {
  const relevantPhotos = filterPhotos(query);

  return bodyRegions.map((region) => {
    const regionPhotos = relevantPhotos
      .filter((photo) => photo.bodyRegionId === region.id)
      .sort(sortNewestFirst);
    const latestPhoto = regionPhotos[0];
    const severityScores = regionPhotos
      .map(getSeverityScore)
      .filter((score): score is number => score !== undefined);
    const latestSeverityScore = latestPhoto ? getSeverityScore(latestPhoto) : undefined;
    const maxSeverityScore = severityScores.length
      ? Math.max(...severityScores)
      : undefined;
    const color = getSeverityColor(latestSeverityScore);

    return {
      ...region,
      active: regionPhotos.length > 0,
      photoCount: regionPhotos.length,
      latestPhotoId: latestPhoto?.id,
      latestPhotoAt: latestPhoto?.takenAt,
      latestSeverityScore,
      maxSeverityScore,
      color,
      colorHex: getBodyMapColorHex(color),
    };
  });
}

function badRequest(response: Response, message: string) {
  response.status(400).json({ error: "bad_request", message });
}

function getPhotoOr404(id: string, response: Response) {
  const photo = photos.find((item) => item.id === id);

  if (!photo) {
    response.status(404).json({ error: "photo_not_found" });
    return undefined;
  }

  return photo;
}

function updatePhotoFromBody(photo: RashPhotoRecord, body: UnknownRecord) {
  if ("takenAt" in body) {
    photo.takenAt = asIsoDate(body.takenAt, photo.takenAt);
  }

  if ("bodyRegionId" in body) {
    photo.bodyRegionId = asString(body.bodyRegionId);
    photo.side = getBodyRegionSide(photo.bodyRegionId, photo.side);
  }

  if ("side" in body) {
    photo.side = normalizeSide(body.side) ?? photo.side;
  }

  if ("userSeverityScore" in body || "severityScore" in body) {
    photo.userSeverityScore = clampScale(body.userSeverityScore ?? body.severityScore, 0);
  }

  if ("userIntensity" in body || "intensity" in body) {
    photo.userIntensity = asScale1To5(body.userIntensity ?? body.intensity);
  }

  if ("itchiness" in body) {
    photo.itchiness = clampScale(body.itchiness, 0);
  }

  if ("dryness" in body) {
    photo.dryness = clampScale(body.dryness, 0);
  }

  if ("redness" in body) {
    photo.redness = clampScale(body.redness, 0);
  }

  if ("pain" in body) {
    photo.pain = clampScale(body.pain, 0);
  }

  if ("swelling" in body) {
    photo.swelling = clampScale(body.swelling, 0);
  }

  if ("notes" in body) {
    photo.notes = asString(body.notes);
  }

  photo.updatedAt = new Date().toISOString();
}

function createPhotoFromBody(value: unknown): RashPhotoRecord {
  const body = asRecord(value);
  const now = new Date().toISOString();
  const bodyRegionId = asString(body.bodyRegionId);
  const side = normalizeSide(body.side) ?? getBodyRegionSide(bodyRegionId);
  const id = createId("photo");
  const dataUri = asString(body.dataUri);
  const storageUrl = asString(body.storageUrl);
  let storageType: RashPhotoRecord["storageType"] = "metadata_only";
  let localFileName: string | undefined;
  let mimeType = asString(body.mimeType);
  let fileSizeBytes: number | undefined;

  if (dataUri) {
    const parsed = parseDataUri(dataUri);
    const extension = getImageExtension(parsed.mimeType);
    localFileName = `${id}.${extension}`;
    mimeType = parsed.mimeType;
    fileSizeBytes = parsed.buffer.byteLength;
    storageType = "local_file";
    writeFileSync(path.join(uploadsDirectory, localFileName), parsed.buffer);
  } else if (storageUrl) {
    storageType = "remote_url";
  }

  return {
    id,
    userId: asString(body.userId) ?? "demo-user",
    takenAt: asIsoDate(body.takenAt, now),
    bodyRegionId,
    side,
    storageUrl,
    originalFilename: asString(body.originalFilename),
    aiAnalysisStatus: "pending",
    createdAt: now,
    storageType,
    localFileName,
    mimeType,
    fileSizeBytes,
    userSeverityScore:
      body.userSeverityScore === undefined && body.severityScore === undefined
        ? undefined
        : clampScale(body.userSeverityScore ?? body.severityScore, 0),
    userIntensity: asScale1To5(body.userIntensity ?? body.intensity),
    itchiness: body.itchiness === undefined ? undefined : clampScale(body.itchiness, 0),
    dryness: body.dryness === undefined ? undefined : clampScale(body.dryness, 0),
    redness: body.redness === undefined ? undefined : clampScale(body.redness, 0),
    pain: body.pain === undefined ? undefined : clampScale(body.pain, 0),
    swelling: body.swelling === undefined ? undefined : clampScale(body.swelling, 0),
    notes: asString(body.notes),
    updatedAt: now,
  };
}

function validatePhotoInput(body: UnknownRecord) {
  const bodyRegionId = asString(body.bodyRegionId);

  if (bodyRegionId && !findBodyRegion(bodyRegionId)) {
    return `Unknown bodyRegionId "${bodyRegionId}".`;
  }

  if (!asString(body.dataUri) && !asString(body.storageUrl)) {
    return "Provide dataUri or storageUrl for the rash image.";
  }

  return undefined;
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
}

function getOpenAiModel() {
  return process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function buildAnalysisPrompt(photo: RashPhotoRecord) {
  const region = findBodyRegion(photo.bodyRegionId);
  const context = {
    bodyRegionId: photo.bodyRegionId,
    bodyRegionLabel: region?.label,
    side: photo.side,
    userSeverityScore: photo.userSeverityScore,
    userIntensity: photo.userIntensity,
    itchiness: photo.itchiness,
    dryness: photo.dryness,
    redness: photo.redness,
    pain: photo.pain,
    swelling: photo.swelling,
    notes: photo.notes,
  };

  return [
    "You help a neurodermatitis tracker summarize rash photos for longitudinal self-tracking.",
    "Do not diagnose and do not provide treatment instructions.",
    "Estimate only visible rash tracking signals from the image and user context.",
    "Return only valid JSON with this shape:",
    '{"severityScore":0,"confidence":0.0,"visualSigns":["string"],"summary":"string","colorHint":"clear|mild|moderate|severe","needsMedicalAttention":false,"limitations":["string"]}',
    `User context: ${JSON.stringify(context)}`,
  ].join("\n");
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
  const withoutFence = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("OpenAI response did not contain a JSON object.");
  }

  return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
}

async function getImageInputForOpenAi(photo: RashPhotoRecord) {
  if (photo.storageUrl?.startsWith("http://") || photo.storageUrl?.startsWith("https://")) {
    return photo.storageUrl;
  }

  const dataUri = readPhotoDataUri(photo);

  if (dataUri) {
    return dataUri;
  }

  throw new Error("No OpenAI-readable image is available for this photo.");
}

async function analyzePhotoWithOpenAi(photo: RashPhotoRecord) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY or AI_PROVIDER_API_KEY.");
  }

  const imageInput = await getImageInputForOpenAi(photo);
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
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildAnalysisPrompt(photo),
            },
            {
              type: "input_image",
              image_url: imageInput,
              detail: "high",
            },
          ],
        },
      ],
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI returned ${response.status}: ${await response.text()}`);
  }

  const responseJson = (await response.json()) as unknown;
  const responseText = extractResponseText(responseJson);

  if (!responseText) {
    throw new Error("OpenAI response did not contain text output.");
  }

  const analysis = normalizeAnalysis(parseJsonFromText(responseText));

  if (!analysis) {
    throw new Error("OpenAI response did not contain an analysis object.");
  }

  return analysis;
}

async function analyzeAndPersistPhoto(photo: RashPhotoRecord) {
  try {
    const analysis = await analyzePhotoWithOpenAi(photo);
    const now = new Date().toISOString();

    photo.aiAnalysisStatus = "complete";
    photo.aiSeverityScore = analysis.severityScore;
    photo.aiConfidence = analysis.confidence;
    photo.aiSummary = analysis.summary;
    photo.aiFindings = analysis.visualSigns;
    photo.aiAnalysis = analysis;
    photo.aiAnalysisError = undefined;
    photo.analyzedAt = now;
    photo.updatedAt = now;
  } catch (error) {
    const now = new Date().toISOString();

    photo.aiAnalysisStatus = "failed";
    photo.aiAnalysisError =
      error instanceof Error ? error.message : "OpenAI analysis failed.";
    photo.updatedAt = now;
  }

  persistPhotos();
  return photo;
}

createService({
  name: "Photo Service",
  port: getNumberEnv("PHOTO_SERVICE_PORT", 3003),
  registerRoutes(app) {
    app.get("/metadata", (_request, response) => {
      response.json({
        supportedUploadFormats: ["dataUri", "storageUrl"],
        supportedImageMimeTypes: [...supportedImageMimeTypes],
        scales: {
          severity: { min: 0, max: 10 },
          intensity: { min: 1, max: 5 },
          itchiness: { min: 0, max: 10 },
          dryness: { min: 0, max: 10 },
          redness: { min: 0, max: 10 },
        },
        bodyRegions,
        openAiConfigured: Boolean(getOpenAiApiKey()),
        openAiModel: getOpenAiModel(),
      });
    });

    app.get("/body-map", (request, response) => {
      response.json({
        regions: buildBodyMap(request.query as UnknownRecord),
      });
    });

    app.get("/body-map/regions/:bodyRegionId/photos", (request, response) => {
      const includeImageData = request.query.includeImageData === "true";
      const region = findBodyRegion(request.params.bodyRegionId);

      if (!region) {
        response.status(404).json({ error: "body_region_not_found" });
        return;
      }

      const regionPhotos = filterPhotos({
        ...request.query,
        bodyRegionId: request.params.bodyRegionId,
      }).sort(sortNewestFirst);

      response.json({
        region,
        photos: regionPhotos.map((photo) =>
          serializePhoto(photo, { includeImageData }),
        ),
      });
    });

    app.get(["/", "/photos"], (request, response) => {
      const includeImageData = request.query.includeImageData === "true";
      response.json({
        photos: filterPhotos(request.query as UnknownRecord)
          .sort(sortNewestFirst)
          .map((photo) => serializePhoto(photo, { includeImageData })),
      });
    });

    app.post(["/", "/photos"], async (request, response) => {
      const body = asRecord(request.body);
      const validationError = validatePhotoInput(body);

      if (validationError) {
        badRequest(response, validationError);
        return;
      }

      try {
        const photo = createPhotoFromBody(body);
        photos.push(photo);
        persistPhotos();

        if (asBoolean(body.analyze, true)) {
          await analyzeAndPersistPhoto(photo);
        }

        response.status(201).json({
          photo: serializePhoto(photo, {
            includeImageData: request.query.includeImageData === "true",
          }),
        });
      } catch (error) {
        badRequest(
          response,
          error instanceof Error ? error.message : "Could not create photo.",
        );
      }
    });

    app.get(["/:id", "/photos/:id"], (request, response) => {
      const photo = getPhotoOr404(request.params.id, response);

      if (!photo) {
        return;
      }

      response.json({
        photo: serializePhoto(photo, {
          includeImageData: request.query.includeImageData === "true",
        }),
      });
    });

    app.get(["/:id/image", "/photos/:id/image"], (request, response) => {
      const photo = getPhotoOr404(request.params.id, response);

      if (!photo) {
        return;
      }

      if (!photo.localFileName || !photo.mimeType) {
        response.status(404).json({ error: "photo_image_not_found" });
        return;
      }

      try {
        response.type(photo.mimeType).send(
          readFileSync(path.join(uploadsDirectory, photo.localFileName)),
        );
      } catch {
        response.status(404).json({ error: "photo_image_not_found" });
      }
    });

    app.patch(["/:id", "/photos/:id"], (request, response) => {
      const photo = getPhotoOr404(request.params.id, response);

      if (!photo) {
        return;
      }

      const body = asRecord(request.body);
      const bodyRegionId = asString(body.bodyRegionId);

      if (bodyRegionId && !findBodyRegion(bodyRegionId)) {
        badRequest(response, `Unknown bodyRegionId "${bodyRegionId}".`);
        return;
      }

      updatePhotoFromBody(photo, body);
      persistPhotos();

      response.json({ photo: serializePhoto(photo, { includeImageData: false }) });
    });

    app.post(["/:id/analyze", "/photos/:id/analyze"], async (request, response) => {
      const photo = getPhotoOr404(request.params.id, response);

      if (!photo) {
        return;
      }

      const body = asRecord(request.body);

      if ("aiSeverityScore" in body && asBoolean(body.runOpenAi, false) === false) {
        const now = new Date().toISOString();
        photo.aiAnalysisStatus = "complete";
        photo.aiSeverityScore = clampScale(body.aiSeverityScore, 0);
        photo.aiConfidence = asNumber(body.aiConfidence);
        photo.aiSummary = asString(body.aiSummary);
        photo.aiFindings = asStringArray(body.aiFindings);
        photo.analyzedAt = now;
        photo.updatedAt = now;
        persistPhotos();

        response.json({ photo: serializePhoto(photo, { includeImageData: false }) });
        return;
      }

      await analyzeAndPersistPhoto(photo);
      response.json({ photo: serializePhoto(photo, { includeImageData: false }) });
    });

    app.delete(["/:id", "/photos/:id"], async (request, response) => {
      const photoIndex = photos.findIndex((photo) => photo.id === request.params.id);

      if (photoIndex === -1) {
        response.status(404).json({ error: "photo_not_found" });
        return;
      }

      const [deleted] = photos.splice(photoIndex, 1);

      if (deleted.localFileName) {
        try {
          unlinkSync(path.join(uploadsDirectory, deleted.localFileName));
        } catch {
          // The metadata can still be deleted if the file was already missing.
        }
      }

      persistPhotos();
      await deleteStoredPhoto(deleted.id);
      response.json({ deleted: serializePhoto(deleted, { includeImageData: false }) });
    });
  },
});
