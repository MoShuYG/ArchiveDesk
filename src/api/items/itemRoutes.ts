import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { itemController } from "./itemController";

export const itemRoutes = Router();

itemRoutes.get("/:itemId", asyncHandler(itemController.getItemById));
itemRoutes.get("/:itemId/file", asyncHandler(itemController.streamItemFile));
itemRoutes.get("/:itemId/thumbnail", asyncHandler(itemController.getThumbnail));
itemRoutes.post("/:itemId/open", asyncHandler(itemController.openItem));
