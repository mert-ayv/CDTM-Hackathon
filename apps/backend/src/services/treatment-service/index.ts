import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type {
  Medication,
  TreatmentApplication,
} from "../../shared/types.js";

const medications: Medication[] = [];
const applications: TreatmentApplication[] = [];

createService({
  name: "Treatment Service",
  port: getNumberEnv("TREATMENT_SERVICE_PORT", 3006),
  registerRoutes(app) {
    app.get("/medications", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        medications: userId
          ? medications.filter((medication) => medication.userId === userId)
          : medications,
      });
    });

    app.post("/medications", (request, response) => {
      const medication: Medication = {
        id: createId("med"),
        userId: request.body.userId ?? "demo-user",
        name: request.body.name,
        dosage: request.body.dosage,
        schedule: request.body.schedule,
        prescribedBy: request.body.prescribedBy,
        createdAt: new Date().toISOString(),
      };

      medications.push(medication);
      response.status(201).json({ medication });
    });

    app.get("/applications", (request, response) => {
      const userId = request.query.userId?.toString();
      response.json({
        applications: userId
          ? applications.filter((application) => application.userId === userId)
          : applications,
      });
    });

    app.post("/applications", (request, response) => {
      const now = new Date().toISOString();
      const application: TreatmentApplication = {
        id: createId("treatment"),
        userId: request.body.userId ?? "demo-user",
        medicationId: request.body.medicationId,
        appliedAt: request.body.appliedAt ?? now,
        bodyRegionId: request.body.bodyRegionId,
        amount: request.body.amount,
        notes: request.body.notes,
        createdAt: now,
      };

      applications.push(application);
      response.status(201).json({ application });
    });
  },
});
