import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type { DiaryEntry } from "../../shared/types.js";

const entries: DiaryEntry[] = [];

createService({
  name: "Diary Service",
  port: getNumberEnv("DIARY_SERVICE_PORT", 3001),
  registerRoutes(app) {
    app.get("/entries", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        entries: userId
          ? entries.filter((entry) => entry.userId === userId)
          : entries,
      });
    });

    app.post("/entries", (request, response) => {
      const now = new Date().toISOString();
      const entry: DiaryEntry = {
        id: createId("diary"),
        userId: request.body.userId ?? "demo-user",
        occurredAt: request.body.occurredAt ?? now,
        food: request.body.food,
        sport: request.body.sport,
        stressLevel: request.body.stressLevel,
        sleep: request.body.sleep,
        habits: request.body.habits,
        lifeChanges: request.body.lifeChanges,
        notes: request.body.notes,
        createdAt: now,
      };

      entries.push(entry);
      response.status(201).json({ entry });
    });

    app.get("/entries/:id", (request, response) => {
      const entry = entries.find((item) => item.id === request.params.id);

      if (!entry) {
        response.status(404).json({ error: "entry_not_found" });
        return;
      }

      response.json({ entry });
    });

    app.get("/food/search", (_request, response) => {
      response.json({
        provider: "OpenFoodFacts",
        status: "not_connected",
        message:
          "Use this route for OpenFoodFacts barcode/search enrichment later.",
      });
    });
  },
});
