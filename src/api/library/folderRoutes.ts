import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { folderController } from "./folderController";

export const folderRoutes = Router();

folderRoutes.get("/roots/:rootId/folders", asyncHandler(folderController.listFolders));
folderRoutes.get("/roots/:rootId/folders/cover-candidates", asyncHandler(folderController.listCoverCandidates));
folderRoutes.get("/roots/:rootId/folders/cover-browser", asyncHandler(folderController.listCoverBrowser));
folderRoutes.put("/roots/:rootId/folders/cover", asyncHandler(folderController.setCover));
folderRoutes.post("/roots/:rootId/folders/cover/upload", asyncHandler(folderController.uploadCover));
folderRoutes.get("/roots/:rootId/folders/cover/uploaded", asyncHandler(folderController.getUploadedCover));
