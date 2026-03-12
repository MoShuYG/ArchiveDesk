import { Router } from "express";
import { LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS } from "../../config/security";
import { requireAuthAllowLockedMiddleware, requireAuthMiddleware } from "../../middleware/authMiddleware";
import { createSimpleRateLimit } from "../../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { authController } from "./authController";

const loginRateLimit = createSimpleRateLimit(LOGIN_RATE_LIMIT_WINDOW_MS, LOGIN_RATE_LIMIT_MAX);

export const authRoutes = Router();

authRoutes.post("/setup-password", asyncHandler(authController.setupPassword));
authRoutes.post("/login", loginRateLimit, asyncHandler(authController.login));
authRoutes.post("/refresh", asyncHandler(authController.refresh));
authRoutes.post("/lock", requireAuthMiddleware, asyncHandler(authController.lock));
authRoutes.post("/logout", requireAuthAllowLockedMiddleware, asyncHandler(authController.logout));
authRoutes.get("/session", requireAuthAllowLockedMiddleware, asyncHandler(authController.getSession));
