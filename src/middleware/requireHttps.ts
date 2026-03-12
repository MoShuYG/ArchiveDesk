import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";

export function requireHttpsInProduction(req: Request, _res: Response, next: NextFunction): void {
  if (!env.requireHttps) {
    next();
    return;
  }
  if (!req.secure) {
    next(new AppError(403, ErrorCodes.FORBIDDEN, "HTTPS is required for this endpoint."));
    return;
  }
  next();
}
