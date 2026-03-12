import type { Request, Response } from "express";
import { z } from "zod";
import { validateSchema } from "../utils/validationUtils";
import { authService } from "./authService";

const setupSchema = z.object({
  username: z.string().min(1).max(64).optional(),
  password: z.string().min(8).max(256)
});

const loginSchema = z.object({
  username: z.string().min(1).max(64).optional(),
  password: z.string().min(1).max(256)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

export const authController = {
  async setupPassword(req: Request, res: Response): Promise<void> {
    const payload = validateSchema(setupSchema, req.body);
    const user = await authService.setupPassword(payload);
    res.status(201).json({
      user
    });
  },

  async login(req: Request, res: Response): Promise<void> {
    const payload = validateSchema(loginSchema, req.body);
    const tokens = await authService.login(payload);
    res.status(200).json(tokens);
  },

  lock(req: Request, res: Response): void {
    authService.lock(req.auth!.sessionId);
    res.status(200).json({ locked: true });
  },

  logout(req: Request, res: Response): void {
    authService.logout(req.auth!.sessionId);
    res.status(200).json({ ok: true });
  },

  refresh(req: Request, res: Response): void {
    const payload = validateSchema(refreshSchema, req.body);
    const tokens = authService.refresh(payload.refreshToken);
    res.status(200).json(tokens);
  },

  getSession(req: Request, res: Response): void {
    const session = authService.getSession(req.auth!.sessionId);
    res.status(200).json(session);
  }
};

