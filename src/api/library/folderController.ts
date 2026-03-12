import fs from "fs";
import type { Request, Response } from "express";
import { z } from "zod";
import { parseSingleFileMultipart } from "../utils/multipart";
import { validateSchema } from "../utils/validationUtils";
import { folderService } from "./folderService";

const listFoldersQuerySchema = z.object({
  parentRelPath: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100)
});

const coverCandidatesQuerySchema = z.object({
  relPath: z.string().optional().default(""),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100)
});

const coverBrowserQuerySchema = z.object({
  relPath: z.string().optional().default(""),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  sortBy: z.enum(["name", "updatedAt", "size"]).default("name"),
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

const setCoverBodySchema = z.discriminatedUnion("mode", [
  z.object({
    relPath: z.string().default(""),
    mode: z.literal("auto")
  }),
  z.object({
    relPath: z.string().default(""),
    mode: z.literal("none")
  }),
  z.object({
    relPath: z.string().default(""),
    mode: z.literal("manual_item"),
    itemId: z.string().min(1)
  })
]);

const uploadedCoverQuerySchema = z.object({
  relPath: z.string().optional().default("")
});

export const folderController = {
  async listFolders(req: Request, res: Response): Promise<void> {
    const query = validateSchema(listFoldersQuerySchema, req.query);
    const response = await folderService.listFolders({
      rootId: req.params.rootId,
      parentRelPath: query.parentRelPath,
      page: query.page,
      pageSize: query.pageSize
    });
    res.status(200).json(response);
  },

  async listCoverCandidates(req: Request, res: Response): Promise<void> {
    const query = validateSchema(coverCandidatesQuerySchema, req.query);
    const response = await folderService.listCoverCandidates({
      rootId: req.params.rootId,
      relPath: query.relPath,
      page: query.page,
      pageSize: query.pageSize
    });
    res.status(200).json(response);
  },

  async listCoverBrowser(req: Request, res: Response): Promise<void> {
    const query = validateSchema(coverBrowserQuerySchema, req.query);
    const response = await folderService.listCoverBrowser({
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

  async setCover(req: Request, res: Response): Promise<void> {
    const body = validateSchema(setCoverBodySchema, req.body);
    const cover = await folderService.setFolderCover({
      rootId: req.params.rootId,
      relPath: body.relPath,
      mode: body.mode,
      itemId: body.mode === "manual_item" ? body.itemId : undefined
    });
    res.status(200).json(cover);
  },

  async uploadCover(req: Request, res: Response): Promise<void> {
    const multipart = await parseSingleFileMultipart(req);
    const cover = await folderService.uploadFolderCover({
      rootId: req.params.rootId,
      relPath: multipart.fields.relPath ?? "",
      buffer: multipart.file.buffer,
      mimeType: multipart.file.mimeType
    });
    res.status(200).json(cover);
  },

  async getUploadedCover(req: Request, res: Response): Promise<void> {
    const query = validateSchema(uploadedCoverQuerySchema, req.query);
    const uploaded = await folderService.getUploadedCover({
      rootId: req.params.rootId,
      relPath: query.relPath
    });
    res.setHeader("Content-Type", uploaded.contentType);
    fs.createReadStream(uploaded.filePath).pipe(res);
  }
};
