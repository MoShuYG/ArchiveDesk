import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { historyController } from "./historyController";

export const historyRoutes = Router();

historyRoutes.get("/items", asyncHandler(historyController.listHistory));
historyRoutes.put("/items/:itemId/progress", asyncHandler(historyController.updateProgress));
historyRoutes.post("/items/:itemId/view", asyncHandler(historyController.recordView));
