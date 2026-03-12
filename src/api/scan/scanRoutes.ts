import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { scanController } from "./scanController";

export const scanRoutes = Router();

scanRoutes.post("/full", asyncHandler(scanController.startFullScan));
scanRoutes.post("/incremental", asyncHandler(scanController.startIncrementalScan));
scanRoutes.get("/tasks/:taskId", asyncHandler(scanController.getTask));
