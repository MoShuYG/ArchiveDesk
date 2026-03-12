import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { env } from "../../config/env";

let dbInstance: Database.Database | null = null;

function ensureDbDirectory(dbPath: string): void {
  if (dbPath === ":memory:") {
    return;
  }
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
}

function applySchema(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      refresh_token_hash TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      last_activity INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS library_roots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      normalized_path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      root_id TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      ext TEXT,
      size INTEGER NOT NULL,
      mtime_ms INTEGER NOT NULL,
      ctime_ms INTEGER,
      inode TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      content_text TEXT NOT NULL DEFAULT '',
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_scanned_at INTEGER NOT NULL,
      FOREIGN KEY(root_id) REFERENCES library_roots(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_items_root_id ON items(root_id);
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
    CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted);

    CREATE TABLE IF NOT EXISTS history (
      item_id TEXT PRIMARY KEY,
      progress_json TEXT NOT NULL,
      last_accessed_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_last_accessed_at ON history(last_accessed_at DESC);

    CREATE TABLE IF NOT EXISTS scan_tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER,
      finished_at INTEGER,
      total_files INTEGER NOT NULL DEFAULT 0,
      processed_files INTEGER NOT NULL DEFAULT 0,
      created_files INTEGER NOT NULL DEFAULT 0,
      updated_files INTEGER NOT NULL DEFAULT 0,
      deleted_files INTEGER NOT NULL DEFAULT 0,
      warnings_json TEXT NOT NULL DEFAULT '[]',
      error_message TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      title,
      path,
      tags,
      content_text,
      content='items',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items
    WHEN NEW.deleted = 0
    BEGIN
      INSERT INTO items_fts(rowid, title, path, tags, content_text)
      VALUES (NEW.rowid, NEW.title, NEW.path, NEW.tags, NEW.content_text);
    END;

    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items
    BEGIN
      DELETE FROM items_fts WHERE rowid = OLD.rowid;
    END;

    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items
    BEGIN
      DELETE FROM items_fts WHERE rowid = OLD.rowid;
      INSERT INTO items_fts(rowid, title, path, tags, content_text)
      SELECT NEW.rowid, NEW.title, NEW.path, NEW.tags, NEW.content_text
      WHERE NEW.deleted = 0;
    END;
  `);
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    ensureDbDirectory(env.dbPath);
    dbInstance = new Database(env.dbPath);
    applySchema(dbInstance);
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function clearAllTables(): void {
  const db = getDb();
  db.exec(`
    DELETE FROM history;
    DELETE FROM items;
    DELETE FROM scan_tasks;
    DELETE FROM library_roots;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM items_fts;
  `);
}

