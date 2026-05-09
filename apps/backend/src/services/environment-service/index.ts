import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type {
  ContextEvent,
  EnvironmentSnapshot,
} from "../../shared/types.js";

const contextEvents: ContextEvent[] = [];

createService({
  name: "Environment Service",
  port: getNumberEnv("ENVIRONMENT_SERVICE_PORT", 3004),
  registerRoutes(app) {
    app.get("/snapshot", (request, response) => {
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

      const snapshot: EnvironmentSnapshot = {
        id: createId("env"),
        userId: request.query.userId?.toString(),
        capturedAt: new Date().toISOString(),
        location: hasLocation ? { latitude, longitude } : undefined,
        weather: {
          temperatureCelsius: undefined,
          humidityPercent: undefined,
          uvIndex: undefined,
        },
        pollen: {
          overallRisk: "unknown",
        },
        source: "placeholder",
      };

      response.json({
        snapshot,
        integrations: ["weather-provider", "pollen-provider"],
      });
    });

    app.get("/context-events", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        events: userId
          ? contextEvents.filter((event) => event.userId === userId)
          : contextEvents,
      });
    });

    app.post("/context-events", (request, response) => {
      const now = new Date().toISOString();
      const event: ContextEvent = {
        id: createId("context"),
        userId: request.body.userId ?? "demo-user",
        occurredAt: request.body.occurredAt ?? now,
        type: request.body.type ?? "other",
        label: request.body.label,
        notes: request.body.notes,
        createdAt: now,
      };

      contextEvents.push(event);
      response.status(201).json({ event });
    });
  },
});
