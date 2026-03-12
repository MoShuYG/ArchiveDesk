import { ErrorCode, ErrorCodes } from "./errorCodes";

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function internalError(message = "Internal server error", details?: unknown): AppError {
  return new AppError(500, ErrorCodes.INTERNAL_ERROR, message, details);
}

