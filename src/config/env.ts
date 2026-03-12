import fs from "fs";
import path from "path";

type AppEnv = {
  nodeEnv: string;
  port: number;
  dbPath: string;
  corsOrigin: string;
  requireHttps: boolean;
  trustProxy: string | boolean;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  quickViewerPath: string | null;
};

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) {
      continue;
    }
    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1);
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeOptionalPath(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim() || null;
  }
  return trimmed;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

function readNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env: ${name}`);
  }
  return parsed;
}

function readTrustProxyEnv(): string | boolean {
  const value = process.env.TRUST_PROXY;
  if (value === undefined) {
    return "loopback";
  }
  if (value.toLowerCase() === "true") {
    return true;
  }
  if (value.toLowerCase() === "false") {
    return false;
  }
  return value;
}

loadEnvFile();

export const env: AppEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: readNumberEnv("PORT", 3000),
  dbPath:
    (process.env.DB_PATH ?? "./data/app.db") === ":memory:"
      ? ":memory:"
      : path.resolve(process.cwd(), process.env.DB_PATH ?? "./data/app.db"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  requireHttps: readBooleanEnv("REQUIRE_HTTPS", process.env.NODE_ENV === "production"),
  trustProxy: readTrustProxyEnv(),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_me",
  quickViewerPath: normalizeOptionalPath(process.env.QUICKVIEWER_PATH)
};

if (env.nodeEnv === "production") {
  if (env.jwtAccessSecret.length < 16 || env.jwtRefreshSecret.length < 16) {
    throw new Error("JWT secrets are too short for production.");
  }
}
