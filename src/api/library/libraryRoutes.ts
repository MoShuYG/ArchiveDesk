import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { explorerRoutes } from "./explorerRoutes";
import { folderRoutes } from "./folderRoutes";
import { libraryController } from "./libraryController";

export const libraryRoutes = Router();

libraryRoutes.get("/roots", asyncHandler(libraryController.listRoots));
libraryRoutes.post("/roots", asyncHandler(libraryController.createRoot));
libraryRoutes.put("/roots/:id", asyncHandler(libraryController.updateRoot));
libraryRoutes.delete("/roots/:id", asyncHandler(libraryController.deleteRoot));
libraryRoutes.use(folderRoutes);
libraryRoutes.use(explorerRoutes);
