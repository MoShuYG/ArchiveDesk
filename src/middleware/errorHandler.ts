import type { NextFunction, Request, Response } from "express";
import { AppError, isAppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, ErrorCodes.NOT_FOUND, `Route not found: ${req.method} ${req.path}`));
}

export function errorHandlerMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (isAppError(error)) {
    res.status(error.status).json({
      code: error.code,
      message: error.message,
      details: error.details ?? null,
      requestId: req.requestId ?? null
    });
    return;
  }

  const safeMessage = error instanceof Error ? error.message : "Unknown error";
  res.status(500).json({
    code: ErrorCodes.INTERNAL_ERROR,
    message: "Internal server error",
    details: process.env.NODE_ENV === "production" ? null : safeMessage,
    requestId: req.requestId ?? null
  });
}

