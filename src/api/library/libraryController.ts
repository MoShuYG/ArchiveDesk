import type { Request, Response } from "express";
import { z } from "zod";
import { validateSchema } from "../utils/validationUtils";
import { libraryService } from "./libraryService";

const createRootSchema = z.object({
  name: z.string().min(1).max(128),
  path: z.string().min(1)
});

const updateRootSchema = z
  .object({
    name: z.string().min(1).max(128).optional(),
    path: z.string().min(1).optional()
  })
  .refine((value) => value.name !== undefined || value.path !== undefined, {
    message: "At least one field must be provided."
  });

export const libraryController = {
  listRoots(_req: Request, res: Response): void {
    const rows = libraryService.listRoots();
    res.status(200).json({ items: rows });
  },

  async createRoot(req: Request, res: Response): Promise<void> {
    const payload = validateSchema(createRootSchema, req.body);
    const created = await libraryService.createRoot(payload);
    res.status(201).json(created);
  },

  async updateRoot(req: Request, res: Response): Promise<void> {
    const payload = validateSchema(updateRootSchema, req.body);
    const updated = await libraryService.updateRoot(req.params.id, payload);
    res.status(200).json(updated);
  },

  async deleteRoot(req: Request, res: Response): Promise<void> {
    const deleted = await libraryService.deleteRoot(req.params.id);
    res.status(200).json(deleted);
  }
};
