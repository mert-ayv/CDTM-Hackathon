import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type { RashPhoto } from "../../shared/types.js";

const photos: RashPhoto[] = [];

createService({
  name: "Photo Service",
  port: getNumberEnv("PHOTO_SERVICE_PORT", 3003),
  registerRoutes(app) {
    app.get("/photos", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        photos: userId
          ? photos.filter((photo) => photo.userId === userId)
          : photos,
      });
    });

    app.post("/photos", (request, response) => {
      const now = new Date().toISOString();
      const photo: RashPhoto = {
        id: createId("photo"),
        userId: request.body.userId ?? "demo-user",
        takenAt: request.body.takenAt ?? now,
        bodyRegionId: request.body.bodyRegionId,
        side: request.body.side,
        storageUrl: request.body.storageUrl,
        originalFilename: request.body.originalFilename,
        aiAnalysisStatus: "pending",
        createdAt: now,
      };

      photos.push(photo);
      response.status(201).json({
        photo,
        nextStep:
          "Wire this endpoint to multipart upload storage and AI severity scoring.",
      });
    });

    app.post("/photos/:id/analyze", (request, response) => {
      const photo = photos.find((item) => item.id === request.params.id);

      if (!photo) {
        response.status(404).json({ error: "photo_not_found" });
        return;
      }

      photo.aiAnalysisStatus = "complete";
      photo.aiSeverityScore = request.body.aiSeverityScore ?? 0;
      response.json({ photo });
    });
  },
});
