import express, { type Request } from "express";
import { getDatabaseHealth } from "../../shared/database.js";
import {
  createService,
  getNumberEnv,
  getStringEnv,
} from "../../shared/http.js";

type ServiceTarget = {
  key: string;
  label: string;
  routePrefix: string;
  baseUrl: string;
};

const targets: ServiceTarget[] = [
  {
    key: "diary",
    label: "Diary Service",
    routePrefix: "/api/diary",
    baseUrl: process.env.DIARY_SERVICE_URL ?? "http://localhost:3001",
  },
  {
    key: "skin",
    label: "Skin Service",
    routePrefix: "/api/skin",
    baseUrl: process.env.SKIN_SERVICE_URL ?? "http://localhost:3002",
  },
  {
    key: "photos",
    label: "Photo Service",
    routePrefix: "/api/photos",
    baseUrl: process.env.PHOTO_SERVICE_URL ?? "http://localhost:3003",
  },
  {
    key: "environment",
    label: "Environment Service",
    routePrefix: "/api/environment",
    baseUrl: process.env.ENVIRONMENT_SERVICE_URL ?? "http://localhost:3004",
  },
  {
    key: "insights",
    label: "Insights Service",
    routePrefix: "/api/insights",
    baseUrl: process.env.INSIGHTS_SERVICE_URL ?? "http://localhost:3005",
  },
  {
    key: "treatment",
    label: "Treatment Service",
    routePrefix: "/api/treatment",
    baseUrl: process.env.TREATMENT_SERVICE_URL ?? "http://localhost:3006",
  },
];

const gatewayPort = getNumberEnv("API_GATEWAY_PORT", 3000);
const openAiTranscriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1";
const agentActionReceipts: Array<{
  id: string;
  userId: string;
  kind: string;
  payload: unknown;
  createdAt: string;
}> = [];

const demoVoiceTranscript =
  "I forgot last week: approximately two fast food meals and slept badly. Backfill it.";

function removeTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getApiBaseUrl(request: Request) {
  const explicitBaseUrl = process.env.PUBLIC_API_BASE_URL;

  if (explicitBaseUrl) {
    return removeTrailingSlash(explicitBaseUrl);
  }

  const protocol = getStringEnv("PUBLIC_API_PROTOCOL", request.protocol);
  const host = request.get("host") ?? `localhost:${gatewayPort}`;
  return `${protocol}://${host}`;
}

function getAudioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mpeg";
  if (mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg") || mimeType.includes("oga")) return "ogg";
  return "webm";
}

async function fetchHealth(target: ServiceTarget) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${target.baseUrl}/health`, {
      signal: controller.signal,
    });
    return {
      key: target.key,
      label: target.label,
      status: response.ok ? "ok" : "degraded",
      baseUrl: target.baseUrl,
    };
  } catch {
    return {
      key: target.key,
      label: target.label,
      status: "degraded",
      baseUrl: target.baseUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}

createService({
  name: "API Gateway",
  port: gatewayPort,
  registerRoutes(app) {
    app.get("/api/health", async (_request, response) => {
      const [services, database] = await Promise.all([
        Promise.all(targets.map(fetchHealth)),
        getDatabaseHealth(),
      ]);
      response.json({
        gateway: "ok",
        database,
        services,
        timestamp: new Date().toISOString(),
      });
    });

    app.get("/api/database/health", async (_request, response) => {
      response.json({ database: await getDatabaseHealth() });
    });

    app.get("/api/services", (_request, response) => {
      response.json({ services: targets });
    });

    app.get("/api/mobile/config", (request, response) => {
      const apiBaseUrl = getApiBaseUrl(request);

      response.json({
        app: "neurodermitis-tracker",
        platform: "expo-go",
        apiBaseUrl,
        endpoints: {
          health: `${apiBaseUrl}/api/health`,
          diary: `${apiBaseUrl}/api/diary`,
          skin: `${apiBaseUrl}/api/skin`,
          photos: `${apiBaseUrl}/api/photos`,
          environment: `${apiBaseUrl}/api/environment`,
          insights: `${apiBaseUrl}/api/insights`,
          treatment: `${apiBaseUrl}/api/treatment`,
        },
        features: {
          supabasePersistence: true,
          foodLogging: true,
          foodTriggerCategories: true,
          openFoodFacts: "barcode-and-search",
          foodPhotoUploads: "metadata-and-url",
          stressTracking: true,
          sportSweatTracking: true,
          activeRashScales: true,
          bodyMap: true,
          photoUploads: "data-uri-upload-local-storage-ai-analysis",
          weatherAndPollen: "placeholder",
          triggerDetection: "placeholder",
          flarePrediction: "placeholder",
          treatmentTracking: true,
        },
      });
    });

    app.get("/api/agent/action-receipts", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        receipts: userId
          ? agentActionReceipts.filter((receipt) => receipt.userId === userId)
          : agentActionReceipts,
      });
    });

    app.post("/api/agent/action-receipts", (request, response) => {
      const receipt = {
        id: `agent_${crypto.randomUUID()}`,
        userId: request.body?.userId ?? "demo-user",
        kind: request.body?.kind ?? "agent-action",
        payload: request.body?.payload ?? {},
        createdAt: new Date().toISOString(),
      };
      agentActionReceipts.unshift(receipt);
      response.status(201).json({ receipt });
    });

    app.post(
      "/api/agent/transcribe",
      express.raw({
        type: ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "application/octet-stream"],
        limit: process.env.AUDIO_BODY_LIMIT ?? "25mb",
      }),
      async (request, response) => {
        const apiKey = process.env.OPENAI_API_KEY;
        const audio = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
        const mimeType = request.headers["content-type"]?.split(";")[0] || "audio/webm";

        if (!audio.length) {
          response.status(400).json({
            error: "missing_audio",
            message: "Send a raw audio body to transcribe.",
          });
          return;
        }

        if (!apiKey) {
          response.json({
            text: demoVoiceTranscript,
            source: "demo",
            model: openAiTranscriptionModel,
          });
          return;
        }

        try {
          const formData = new FormData();
          const audioBytes = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
          formData.append("model", openAiTranscriptionModel);
          formData.append("file", new Blob([audioBytes], { type: mimeType }), `dermatrack-voice.${getAudioExtension(mimeType)}`);

          const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
          });

          const result = (await transcriptionResponse.json()) as { text?: string; error?: { message?: string } };

          if (!transcriptionResponse.ok || !result.text) {
            response.status(502).json({
              error: "transcription_failed",
              message: result.error?.message ?? "OpenAI transcription failed.",
            });
            return;
          }

          response.json({
            text: result.text,
            source: "openai",
            model: openAiTranscriptionModel,
          });
        } catch (error) {
          response.status(502).json({
            error: "transcription_failed",
            message: error instanceof Error ? error.message : "OpenAI transcription failed.",
          });
        }
      },
    );

    for (const target of targets) {
      app.use(target.routePrefix, async (request, response) => {
        const servicePath =
          request.originalUrl.slice(target.routePrefix.length) || "/";
        const serviceUrl = new URL(servicePath, target.baseUrl);
        const hasBody = !["GET", "HEAD"].includes(request.method);

        try {
          const serviceResponse = await fetch(serviceUrl, {
            method: request.method,
            headers: {
              "content-type": request.headers["content-type"] ?? "application/json",
            },
            body: hasBody ? JSON.stringify(request.body ?? {}) : undefined,
          });

          const contentType = serviceResponse.headers.get("content-type");
          if (contentType) {
            response.setHeader("content-type", contentType);
          }

          response.status(serviceResponse.status).send(await serviceResponse.text());
        } catch {
          response.status(502).json({
            error: "service_unavailable",
            service: target.key,
            message: `${target.label} is not reachable.`,
          });
        }
      });
    }
  },
});
