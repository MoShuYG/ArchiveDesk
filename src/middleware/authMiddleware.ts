import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";
import { authService } from "../api/auth/authService";

function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token) {
    return null;
  }
  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token;
}

function parseQueryToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function allowQueryToken(req: Request): boolean {
  return req.method === "GET" && req.path.endsWith("/file");
}

function getRequestToken(req: Request): string | null {
  const bearerToken = parseBearerToken(req.header("authorization"));
  if (bearerToken) {
    return bearerToken;
  }
  if (allowQueryToken(req)) {
    return parseQueryToken(req.query.accessToken);
  }
  return null;
}

export function requireAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = getRequestToken(req);
  if (!token) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, "Missing Bearer token."));
    return;
  }
  const auth = authService.authenticateAccessToken(token, { allowLocked: false });
  req.auth = auth;
  next();
}

export function requireAuthAllowLockedMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = getRequestToken(req);
  if (!token) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, "Missing Bearer token."));
    return;
  }
  const auth = authService.authenticateAccessToken(token, { allowLocked: true });
  req.auth = auth;
  next();
}
