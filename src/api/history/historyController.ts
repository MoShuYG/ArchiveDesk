import type { Request, Response } from "express";
import { z } from "zod";
import { validateSchema } from "../utils/validationUtils";
import { historyService } from "./historyService";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  type: z.enum(["video", "audio", "image", "novel", "booklet", "voice", "other"]).optional(),
  category: z.enum(["all", "image", "video", "novel", "audio"]).optional(),
  rootId: z.string().optional(),
  sortBy: z.enum(["lastAccessedAt", "name", "type", "updatedAt", "size"]).optional(),
  order: z.enum(["asc", "desc"]).optional()
});

const progressSchema = z.object({
  progress: z.record(z.unknown())
});

export const historyController = {
  listHistory(req: Request, res: Response): void {
    const payload = validateSchema(listSchema, req.query);
    const result = historyService.listHistory(payload);
    res.status(200).json({
      page: payload.page,
      pageSize: payload.pageSize,
      total: result.total,
      items: result.rows
    });
  },

  updateProgress(req: Request, res: Response): void {
    const payload = validateSchema(progressSchema, req.body);
    const item = historyService.upsertProgress(req.params.itemId, payload.progress);
    res.status(200).json(item);
  },

  recordView(req: Request, res: Response): void {
    const item = historyService.recordView(req.params.itemId);
    res.status(200).json(item);
  }
};
