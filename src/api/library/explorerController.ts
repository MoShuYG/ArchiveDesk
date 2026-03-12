import type { Request, Response } from "express";
import { z } from "zod";
import { validateSchema } from "../utils/validationUtils";
import { explorerService } from "./explorerService";

const listRootEntriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  sortBy: z.enum(["name", "updatedAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc")
});

const listEntriesQuerySchema = z.object({
  relPath: z.string().optional().default(""),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  sortBy: z.enum(["name", "type", "updatedAt", "size"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  foldersFirst: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value.toLowerCase() !== "false";
      }
      return true;
    })
});

const openEntryBodySchema = z.object({
  relPath: z.string().min(1)
});

export const explorerController = {
  async listRootEntries(req: Request, res: Response): Promise<void> {
    const query = validateSchema(listRootEntriesQuerySchema, req.query);
    const response = await explorerService.listRootEntries({
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      order: query.order
    });
    res.status(200).json(response);
  },

  async listEntries(req: Request, res: Response): Promise<void> {
    const query = validateSchema(listEntriesQuerySchema, req.query);
    const response = await explorerService.listEntries({
      rootId: req.params.rootId,
      relPath: query.relPath,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      order: query.order,
      foldersFirst: query.foldersFirst
    });
    res.status(200).json(response);
  },

  async openEntry(req: Request, res: Response): Promise<void> {
    const body = validateSchema(openEntryBodySchema, req.body);
    const response = await explorerService.openEntry({
      rootId: req.params.rootId,
      relPath: body.relPath
    });
    res.status(200).json(response);
  }
};
