import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

