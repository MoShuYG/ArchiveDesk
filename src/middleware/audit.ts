import type { NextFunction, Request, Response } from "express";

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const cost = Date.now() - start;
    const userId = req.auth?.userId ?? "anonymous";
    // Lightweight audit output for local usage; can be redirected by process manager.
    console.log(
      `[audit] requestId=${req.requestId ?? "n/a"} user=${userId} ${req.method} ${req.originalUrl} status=${res.statusCode} costMs=${cost}`
    );
  });
  next();
}

