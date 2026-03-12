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

export function requireAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = parseBearerToken(req.header("authorization"));
  if (!token) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, "Missing Bearer token."));
    return;
  }
  const auth = authService.authenticateAccessToken(token, { allowLocked: false });
  req.auth = auth;
  next();
}

export function requireAuthAllowLockedMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = parseBearerToken(req.header("authorization"));
  if (!token) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, "Missing Bearer token."));
    return;
  }
  const auth = authService.authenticateAccessToken(token, { allowLocked: true });
  req.auth = auth;
  next();
}
