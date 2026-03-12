import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: {
        userId: number;
        sessionId: string;
        locked: boolean;
      };
    }
  }
}

export type RequestWithAuth = Request & {
  auth: {
    userId: number;
    sessionId: string;
    locked: boolean;
  };
};
