import { createService, getNumberEnv } from "../../shared/http.js";
import type { FlareForecast, TriggerCandidate } from "../../shared/types.js";

createService({
  name: "Insights Service",
  port: getNumberEnv("INSIGHTS_SERVICE_PORT", 3005),
  registerRoutes(app) {
    app.get("/forecast", (request, response) => {
      const userId = request.query.userId?.toString() ?? "demo-user";
      const horizonHours = Number(request.query.horizonHours) === 48 ? 48 : 24;

      const forecast: FlareForecast = {
        userId,
        horizonHours,
        generatedAt: new Date().toISOString(),
        risk: "unknown",
        confidence: 0,
        reasons: [
          "Prediction model is not trained yet.",
          "Connect diary, skin, photo, weather, pollen and treatment history first.",
        ],
      };

      response.json({ forecast });
    });

    app.post("/trigger-candidates", (_request, response) => {
      const candidates: TriggerCandidate[] = [
        {
          factor: "insufficient-history",
          category: "unknown",
          confidence: 0,
          explanation:
            "Collect at least two weeks of diary, skin and environment data before ranking triggers.",
        },
      ];

      response.json({
        candidates,
        modelStatus: "not_trained",
      });
    });
  },
});
