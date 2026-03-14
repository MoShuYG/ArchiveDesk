import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { explorerController } from "./explorerController";

export const explorerRoutes = Router();

explorerRoutes.get("/roots/entries", asyncHandler(explorerController.listRootEntries));
explorerRoutes.get("/roots/:rootId/entries", asyncHandler(explorerController.listEntries));
explorerRoutes.get("/roots/:rootId/file", asyncHandler(explorerController.streamEntryFile));
explorerRoutes.post("/roots/:rootId/entries/open", asyncHandler(explorerController.openEntry));
