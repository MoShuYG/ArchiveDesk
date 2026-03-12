import crypto from "crypto";
import { getDb } from "../api/utils/dbUtils";

export type UserRecord = {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
};

export type SessionRecord = {
  id: string;
  userId: number;
  refreshTokenHash: string;
  locked: boolean;
  lastActivity: number;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

function mapUserRow(row: any): UserRecord | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSessionRow(row: any): SessionRecord | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    locked: row.locked === 1,
    lastActivity: row.last_activity,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null
  };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const userModel = {
  getSingleUser(): UserRecord | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM users WHERE id = 1").get();
    return mapUserRow(row);
  },

  createSingleUser(username: string, passwordHash: string): UserRecord {
    const db = getDb();
    const now = Date.now();
    db.prepare(
      `INSERT INTO users (id, username, password_hash, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?)`
    ).run(username, passwordHash, now, now);
    const created = this.getSingleUser();
    if (!created) {
      throw new Error("Failed to create user.");
    }
    return created;
  },

  updatePassword(passwordHash: string): void {
    const db = getDb();
    const now = Date.now();
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = 1").run(passwordHash, now);
  },

  createSession(input: {
    id: string;
    userId: number;
    refreshToken: string;
    createdAt: number;
    expiresAt: number;
  }): SessionRecord {
    const db = getDb();
    db.prepare(
      `INSERT INTO sessions (id, user_id, refresh_token_hash, locked, last_activity, created_at, expires_at, revoked_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, NULL)`
    ).run(input.id, input.userId, hashToken(input.refreshToken), input.createdAt, input.createdAt, input.expiresAt);

    const created = this.getSessionById(input.id);
    if (!created) {
      throw new Error("Failed to create session.");
    }
    return created;
  },

  getSessionById(sessionId: string): SessionRecord | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
    return mapSessionRow(row);
  },

  getSessionByIdWithUser(sessionId: string): (SessionRecord & { username: string }) | null {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT s.*, u.username
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = ?`
      )
      .get(sessionId) as any;
    const session = mapSessionRow(row);
    if (!session) {
      return null;
    }
    return {
      ...session,
      username: row.username
    };
  },

  rotateRefreshToken(sessionId: string, refreshToken: string, expiresAt: number): void {
    const db = getDb();
    db.prepare(
      `UPDATE sessions
       SET refresh_token_hash = ?, expires_at = ?, revoked_at = NULL
       WHERE id = ?`
    ).run(hashToken(refreshToken), expiresAt, sessionId);
  },

  revokeSession(sessionId: string): void {
    const db = getDb();
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(Date.now(), sessionId);
  },

  lockSession(sessionId: string): void {
    const db = getDb();
    db.prepare("UPDATE sessions SET locked = 1 WHERE id = ?").run(sessionId);
  },

  unlockSession(sessionId: string): void {
    const db = getDb();
    db.prepare("UPDATE sessions SET locked = 0, last_activity = ? WHERE id = ?").run(Date.now(), sessionId);
  },

  touchSession(sessionId: string): void {
    const db = getDb();
    db.prepare("UPDATE sessions SET last_activity = ? WHERE id = ?").run(Date.now(), sessionId);
  },

  setLastActivity(sessionId: string, lastActivity: number): void {
    const db = getDb();
    db.prepare("UPDATE sessions SET last_activity = ? WHERE id = ?").run(lastActivity, sessionId);
  },

  revokeExpiredSessions(): number {
    const db = getDb();
    const result = db
      .prepare("UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL AND expires_at <= ?")
      .run(Date.now(), Date.now());
    return result.changes;
  }
};

