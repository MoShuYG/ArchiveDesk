import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import morgan from "morgan";
import path from "node:path";
import type { Request } from "express";
import { env } from "./config/env";
import { authRoutes } from "./api/auth/authRoutes";
import { libraryRoutes } from "./api/library/libraryRoutes";
import { scanRoutes } from "./api/scan/scanRoutes";
import { searchRoutes } from "./api/search/searchRoutes";
import { historyRoutes } from "./api/history/historyRoutes";
import { itemRoutes } from "./api/items/itemRoutes";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandlerMiddleware, notFoundMiddleware } from "./middleware/errorHandler";
import { requireHttpsInProduction } from "./middleware/requireHttps";
import { auditMiddleware } from "./middleware/audit";
import { requireAuthMiddleware } from "./middleware/authMiddleware";

function isSameOriginRequest(origin: string, req: Request): boolean {
  try {
    const requestOrigin = new URL(origin);
    const forwardedProto = req.header("x-forwarded-proto");
    const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;
    return requestOrigin.host === req.get("host") && requestOrigin.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();
  const frontendDistPath = path.resolve(process.cwd(), "frontend", "dist");
  const frontendIndexPath = path.join(frontendDistPath, "index.html");

  app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors((req, callback) => {
      const origin = req.header("Origin");
      if (!origin) {
        callback(null, { origin: false, credentials: true });
        return;
      }

      const allowOrigin =
        isSameOriginRequest(origin, req) || env.corsAllowedOrigins.includes(origin);

      callback(null, { origin: allowOrigin, credentials: true });
    })
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  app.use(requestIdMiddleware);
  app.use(requireHttpsInProduction);
  app.use(auditMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/library", requireAuthMiddleware, libraryRoutes);
  app.use("/api/scan", requireAuthMiddleware, scanRoutes);
  app.use("/api/search", requireAuthMiddleware, searchRoutes);
  app.use("/api/history", requireAuthMiddleware, historyRoutes);
  app.use("/api/items", requireAuthMiddleware, itemRoutes);

  if (env.nodeEnv === "production") {
    if (!fs.existsSync(frontendIndexPath)) {
      throw new Error(`Missing frontend build output: ${frontendIndexPath}`);
    }

    app.use(express.static(frontendDistPath, { index: false }));
    app.get(/^\/(?!api(?:\/|$)|health(?:\/|$)).*/, (_req, res) => {
      res.sendFile(frontendIndexPath);
    });
  }

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);
  return app;
}
