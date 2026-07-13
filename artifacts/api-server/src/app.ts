import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Only reflect the Origin header back (with credentials) for origins we
// explicitly trust. Reflecting *any* origin while allowing credentials would
// let any site make authenticated cross-origin requests on behalf of a
// logged-in operator, so we build an allowlist from the Replit-provided
// domains instead.
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const addHost = (host?: string): void => {
    const trimmed = host?.trim();
    if (trimmed) origins.add(`https://${trimmed}`);
  };

  // REPLIT_DOMAINS is a comma-separated list of deployment/preview hosts.
  process.env.REPLIT_DOMAINS?.split(",").forEach(addHost);
  addHost(process.env.REPLIT_DEV_DOMAIN);
  addHost(process.env.REPLIT_EXPO_DEV_DOMAIN);

  // Local development origins (never present in production env).
  if (process.env.NODE_ENV !== "production") {
    for (const port of ["5173", "3000", "8081", "80"]) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }

  return origins;
}

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // No Origin header: same-origin requests, curl, and native mobile apps.
      // These are not subject to the browser same-origin policy, so allow them.
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allowed origin: reflect it so credentialed requests succeed.
      // Disallowed origin: omit CORS headers so the browser blocks the read.
      callback(null, allowedOrigins.has(origin));
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Loads the browser/mobile session user onto req (if any) before routing.
app.use(authMiddleware);

app.use("/api", router);

export default app;
