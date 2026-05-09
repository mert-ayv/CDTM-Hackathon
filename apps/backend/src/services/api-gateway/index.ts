import type { Request } from "express";
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
      const services = await Promise.all(targets.map(fetchHealth));
      response.json({
        gateway: "ok",
        services,
        timestamp: new Date().toISOString(),
      });
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
          foodLogging: true,
          bodyMap: true,
          photoUploads: "metadata-only",
          weatherAndPollen: "placeholder",
          triggerDetection: "placeholder",
          flarePrediction: "placeholder",
          treatmentTracking: true,
        },
      });
    });

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
