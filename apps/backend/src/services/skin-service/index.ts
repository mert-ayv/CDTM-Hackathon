import { bodyRegions } from "../../shared/bodyMap.js";
import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type { FlareObservation } from "../../shared/types.js";

const observations: FlareObservation[] = [];

createService({
  name: "Skin Service",
  port: getNumberEnv("SKIN_SERVICE_PORT", 3002),
  registerRoutes(app) {
    app.get("/body-map/regions", (_request, response) => {
      response.json({ regions: bodyRegions });
    });

    app.get("/flare-observations", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        observations: userId
          ? observations.filter((observation) => observation.userId === userId)
          : observations,
      });
    });

    app.post("/flare-observations", (request, response) => {
      const now = new Date().toISOString();
      const observation: FlareObservation = {
        id: createId("flare"),
        userId: request.body.userId ?? "demo-user",
        observedAt: request.body.observedAt ?? now,
        bodyRegionId: request.body.bodyRegionId,
        side: request.body.side ?? "front",
        intensity: request.body.intensity ?? 1,
        itchiness: request.body.itchiness,
        dryness: request.body.dryness,
        redness: request.body.redness,
        scorradTotal: request.body.scorradTotal,
        notes: request.body.notes,
        createdAt: now,
      };

      observations.push(observation);
      response.status(201).json({ observation });
    });
  },
});
