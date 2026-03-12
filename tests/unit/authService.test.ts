import { authService } from "../../src/api/auth/authService";
import { AUTO_LOCK_MS } from "../../src/config/jwt";
import { AppError } from "../../src/errors/appError";
import { ErrorCodes } from "../../src/errors/errorCodes";
import { userModel } from "../../src/models/userModel";

describe("authService", () => {
  test("should setup password only once", async () => {
    await authService.setupPassword({ password: "password123" });
    await expect(authService.setupPassword({ password: "password123" })).rejects.toMatchObject({
      code: ErrorCodes.AUTH_ALREADY_INITIALIZED
    });
  });

  test("should login refresh and lock by idle timeout", async () => {
    await authService.setupPassword({ password: "password123" });
    const login = await authService.login({ password: "password123" });
    expect(login.accessToken).toBeTruthy();
    expect(login.refreshToken).toBeTruthy();

    const auth = authService.authenticateAccessToken(login.accessToken);
    expect(auth.userId).toBe(1);

    const refreshed = authService.refresh(login.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();

    userModel.setLastActivity(auth.sessionId, Date.now() - AUTO_LOCK_MS - 10);
    expect(() => authService.authenticateAccessToken(refreshed.accessToken)).toThrow(AppError);
    try {
      authService.authenticateAccessToken(refreshed.accessToken);
    } catch (error) {
      expect((error as AppError).code).toBe(ErrorCodes.SESSION_LOCKED);
    }
  });

  test("should reject invalid password", async () => {
    await authService.setupPassword({ password: "password123" });
    await expect(authService.login({ password: "wrong-password" })).rejects.toMatchObject({
      code: ErrorCodes.INVALID_CREDENTIALS
    });
  });
});

