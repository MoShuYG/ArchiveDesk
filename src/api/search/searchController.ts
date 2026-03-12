import type { Request, Response } from "express";
import { z } from "zod";
import { validateSchema } from "../utils/validationUtils";
import { searchService } from "./searchService";

const querySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  type: z.enum(["video", "audio", "image", "novel", "booklet", "voice", "other"]).optional(),
  rootId: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(["relevance", "updatedAt", "name"]).optional(),
  sortBy: z.enum(["relevance", "name", "type", "updatedAt", "size"]).optional(),
  order: z.enum(["asc", "desc"]).optional()
});

const entriesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  type: z.enum(["video", "audio", "image", "novel", "booklet", "voice", "other"]).optional(),
  rootId: z.string().optional(),
  tag: z.string().optional(),
  sortBy: z.enum(["relevance", "name", "type", "updatedAt", "size"]).optional(),
  order: z.enum(["asc", "desc"]).optional()
});

export const searchController = {
  searchItems(req: Request, res: Response): void {
    const payload = validateSchema(querySchema, req.query);
    const result = searchService.search({
      q: payload.q,
      page: payload.page,
      pageSize: payload.pageSize,
      type: payload.type,
      rootId: payload.rootId,
      tag: payload.tag,
      sortBy: payload.sortBy ?? payload.sort ?? undefined,
      order: payload.order
    });
    res.status(200).json(result);
  },

  async searchEntries(req: Request, res: Response): Promise<void> {
    const payload = validateSchema(entriesQuerySchema, req.query);
    const result = await searchService.searchEntries({
      q: payload.q,
      page: payload.page,
      pageSize: payload.pageSize,
      type: payload.type,
      rootId: payload.rootId,
      tag: payload.tag,
      sortBy: payload.sortBy,
      order: payload.order
    });
    res.status(200).json(result);
  }
};
