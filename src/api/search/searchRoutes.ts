import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { searchController } from "./searchController";

export const searchRoutes = Router();

searchRoutes.get("/items", asyncHandler(searchController.searchItems));
searchRoutes.get("/entries", asyncHandler(searchController.searchEntries));
