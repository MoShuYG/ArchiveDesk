import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function createSimpleRateLimit(windowMs: number, max: number) {
  return function rateLimit(req: Request, _res: Response, next: NextFunction): void {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= max) {
      next(new AppError(429, ErrorCodes.TOO_MANY_REQUESTS, "Too many requests. Please retry later."));
      return;
    }
    current.count += 1;
    buckets.set(key, current);
    next();
  };
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
