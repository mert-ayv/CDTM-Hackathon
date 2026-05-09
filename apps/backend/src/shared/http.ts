import cors from "cors";
import "dotenv/config";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

export type ServiceStatus = "ok" | "degraded";

export type ServiceConfig = {
  name: string;
  port: number;
  host?: string;
  registerRoutes: (app: Express) => void;
};

function getAllowedOrigins() {
  const rawOrigins = process.env.CORS_ORIGINS;

  if (!rawOrigins) {
    return true;
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createService({
  name,
  port,
  host = process.env.BACKEND_HOST ?? "0.0.0.0",
  registerRoutes,
}: ServiceConfig) {
  const app = express();

  app.use(
    cors({
      origin: getAllowedOrigins(),
    }),
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      service: name,
      status: "ok" satisfies ServiceStatus,
      timestamp: new Date().toISOString(),
    });
  });

  registerRoutes(app);

  app.use((_request, response) => {
    response.status(404).json({
      error: "not_found",
      message: `${name} does not expose this route.`,
    });
  });

  app.use(
    (
      error: Error,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      response.status(500).json({
        error: "internal_server_error",
        message: error.message,
      });
    },
  );

  return app.listen(port, host, () => {
    console.log(
      `${name} listening on http://${host}:${port} (local: http://localhost:${port})`,
    );
  });
}

export function getNumberEnv(name: string, fallback: number) {
  const value = process.env[name];
  return value ? Number(value) : fallback;
}

export function getStringEnv(name: string, fallback: string) {
  return process.env[name] ?? fallback;
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
