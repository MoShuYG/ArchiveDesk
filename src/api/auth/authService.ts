import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../config/env";
import { ACCESS_TOKEN_TTL_SECONDS, AUTO_LOCK_MS, REFRESH_TOKEN_TTL_SECONDS } from "../../config/jwt";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { hashToken, userModel, type SessionRecord } from "../../models/userModel";

type AccessTokenPayload = {
  sub: string;
  sid: string;
  typ: "access";
};

type RefreshTokenPayload = {
  sub: string;
  sid: string;
  typ: "refresh";
};

function signAccessToken(userId: number, sessionId: string): string {
  const payload: AccessTokenPayload = {
    sub: String(userId),
    sid: sessionId,
    typ: "access"
  };
  return jwt.sign(payload, env.jwtAccessSecret, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS
  });
}

function signRefreshToken(userId: number, sessionId: string): string {
  const payload: RefreshTokenPayload = {
    sub: String(userId),
    sid: sessionId,
    typ: "refresh"
  };
  return jwt.sign(payload, env.jwtRefreshSecret, {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_TTL_SECONDS
  });
}

function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    if (payload.typ !== "access") {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, "Invalid access token.");
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, "Access token expired.");
    }
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, "Invalid access token.");
  }
}

function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
    if (payload.typ !== "refresh") {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, "Invalid refresh token.");
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, "Refresh token expired.");
    }
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, "Invalid refresh token.");
  }
}

function isSessionLocked(session: Pick<SessionRecord, "id" | "locked" | "lastActivity">): boolean {
  const timedOut = Date.now() - session.lastActivity > AUTO_LOCK_MS;
  if (timedOut && !session.locked) {
    userModel.lockSession(session.id);
  }
  return timedOut || session.locked;
}

export const authService = {
  async setupPassword(input: { username?: string; password: string }): Promise<{ userId: number; username: string }> {
    if (input.password.length < 8) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Password must be at least 8 characters.");
    }
    const existing = userModel.getSingleUser();
    if (existing) {
      throw new AppError(409, ErrorCodes.AUTH_ALREADY_INITIALIZED, "Password already initialized.");
    }
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
    });
    const user = userModel.createSingleUser(input.username ?? "local", passwordHash);
    return {
      userId: user.id,
      username: user.username
    };
  },

  async login(input: { username?: string; password: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  }> {
    const user = userModel.getSingleUser();
    if (!user) {
      throw new AppError(400, ErrorCodes.AUTH_NOT_INITIALIZED, "Password is not initialized yet.");
    }
    if (input.username && input.username !== user.username) {
      throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, "Invalid credentials.");
    }
    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, "Invalid credentials.");
    }
    const sessionId = uuidv4();
    const refreshToken = signRefreshToken(user.id, sessionId);
    const now = Date.now();
    userModel.createSession({
      id: sessionId,
      userId: user.id,
      refreshToken,
      createdAt: now,
      expiresAt: now + REFRESH_TOKEN_TTL_SECONDS * 1000
    });
    const accessToken = signAccessToken(user.id, sessionId);
    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS
    };
  },

  logout(sessionId: string): void {
    userModel.revokeSession(sessionId);
  },

  lock(sessionId: string): void {
    userModel.lockSession(sessionId);
  },

  refresh(refreshToken: string): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  } {
    const payload = verifyRefreshToken(refreshToken);
    const session = userModel.getSessionById(payload.sid);
    if (!session || session.revokedAt) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, "Session not found or revoked.");
    }
    if (session.expiresAt <= Date.now()) {
      userModel.revokeSession(session.id);
      throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, "Refresh token expired.");
    }
    if (isSessionLocked(session)) {
      throw new AppError(423, ErrorCodes.SESSION_LOCKED, "Session is locked.");
    }
    const hashed = hashToken(refreshToken);
    if (hashed !== session.refreshTokenHash) {
      userModel.revokeSession(session.id);
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, "Refresh token does not match session.");
    }
    const newRefreshToken = signRefreshToken(Number(payload.sub), session.id);
    const newExpiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000;
    userModel.rotateRefreshToken(session.id, newRefreshToken, newExpiresAt);
    userModel.touchSession(session.id);
    return {
      accessToken: signAccessToken(Number(payload.sub), session.id),
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS
    };
  },

  authenticateAccessToken(token: string, options?: { allowLocked?: boolean }): { userId: number; sessionId: string; locked: boolean } {
    const payload = verifyAccessToken(token);
    const session = userModel.getSessionById(payload.sid);
    if (!session || session.revokedAt) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, "Session invalid.");
    }
    if (session.expiresAt <= Date.now()) {
      userModel.revokeSession(session.id);
      throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, "Session expired.");
    }
    const locked = isSessionLocked(session);
    if (locked && !options?.allowLocked) {
      throw new AppError(423, ErrorCodes.SESSION_LOCKED, "Session locked.");
    }
    if (!locked) {
      userModel.touchSession(session.id);
    }
    return {
      userId: Number(payload.sub),
      sessionId: session.id,
      locked
    };
  },

  getSession(sessionId: string): {
    sessionId: string;
    userId: number;
    username: string;
    locked: boolean;
    lastActivity: number;
    expiresAt: number;
  } {
    const session = userModel.getSessionByIdWithUser(sessionId);
    if (!session || session.revokedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Session not found.");
    }
    return {
      sessionId: session.id,
      userId: session.userId,
      username: session.username,
      locked: session.locked,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt
    };
  }
};
