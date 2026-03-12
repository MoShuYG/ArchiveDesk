import { v4 as uuidv4 } from "uuid";
import { getDb } from "../api/utils/dbUtils";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";

export type ItemType = "video" | "audio" | "image" | "novel" | "booklet" | "voice" | "other";

export type ItemRecord = {
  id: string;
  rootId: string;
  path: string;
  title: string;
  type: ItemType;
  ext: string | null;
  size: number;
  mtimeMs: number;
  ctimeMs: number | null;
  inode: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  contentText: string;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
  lastScannedAt: number;
};

type ItemRow = {
  id: string;
  root_id: string;
  path: string;
  title: string;
  type: ItemType;
  ext: string | null;
  size: number;
  mtime_ms: number;
  ctime_ms: number | null;
  inode: string | null;
  tags: string;
  metadata: string;
  content_text: string;
  deleted: number;
  created_at: number;
  updated_at: number;
  last_scanned_at: number;
};

export type SearchSort = "relevance" | "updatedAt" | "name";
export type SearchSortBy = "relevance" | "name" | "type" | "updatedAt" | "size";
export type SortOrder = "asc" | "desc";
export type SearchItemRecord = {
  item: ItemRecord;
  score: number;
};

function mapRow(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    rootId: row.root_id,
    path: row.path,
    title: row.title,
    type: row.type,
    ext: row.ext,
    size: row.size,
    mtimeMs: row.mtime_ms,
    ctimeMs: row.ctime_ms,
    inode: row.inode,
    tags: JSON.parse(row.tags),
    metadata: JSON.parse(row.metadata),
    contentText: row.content_text,
    deleted: row.deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastScannedAt: row.last_scanned_at
  };
}

export type UpsertItemInput = {
  rootId: string;
  path: string;
  title: string;
  type: ItemType;
  ext: string | null;
  size: number;
  mtimeMs: number;
  ctimeMs: number | null;
  inode: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  contentText: string;
};

type ExistingSnapshot = {
  id: string;
  path: string;
  size: number;
  mtime_ms: number;
  inode: string | null;
  deleted: number;
};

function buildInClause(values: string[]): string {
  return values.map(() => "?").join(",");
}

function sanitizeFtsQuery(raw: string): string {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .map((token) => `${token}*`);
  return tokens.join(" ");
}

function runSearchQuery(input: {
  query?: string;
  page: number;
  pageSize: number;
  type?: ItemType;
  rootId?: string;
  tag?: string;
  sortBy: SearchSortBy;
  order: SortOrder;
}): { total: number; rows: Array<ItemRow & { score: number }> } {
  const db = getDb();
  const whereParts: string[] = ["i.deleted = 0"];
  const args: Array<string | number> = [];
  let fromClause = "items i";
  let selectScore = "0.0 AS score";

  const ftsQuery = input.query ? sanitizeFtsQuery(input.query) : "";
  if (input.query && input.query.trim().length > 0 && !ftsQuery) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid search query.");
  }
  if (ftsQuery) {
    fromClause = "items_fts f JOIN items i ON i.rowid = f.rowid";
    whereParts.push("items_fts MATCH ?");
    args.push(ftsQuery);
    selectScore = "bm25(items_fts) AS score";
  }

  if (input.type) {
    whereParts.push("i.type = ?");
    args.push(input.type);
  }
  if (input.rootId) {
    whereParts.push("i.root_id = ?");
    args.push(input.rootId);
  }
  if (input.tag) {
    whereParts.push("i.tags LIKE ?");
    args.push(`%\"${input.tag}\"%`);
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  const direction = input.order === "asc" ? "ASC" : "DESC";
  const orderBy =
    input.sortBy === "name"
      ? `i.title COLLATE NOCASE ${direction}`
      : input.sortBy === "type"
        ? `i.type COLLATE NOCASE ${direction}, i.title COLLATE NOCASE ASC`
        : input.sortBy === "size"
          ? `i.size ${direction}, i.title COLLATE NOCASE ASC`
          : input.sortBy === "updatedAt"
            ? `i.updated_at ${direction}, i.title COLLATE NOCASE ASC`
            : ftsQuery
              ? `score ${direction}, i.updated_at DESC`
              : "i.updated_at DESC";
  const offset = (input.page - 1) * input.pageSize;

  try {
    const totalRow = db
      .prepare(`SELECT COUNT(*) AS total FROM ${fromClause} ${whereSql}`)
      .get(...args) as { total: number };

    const rows = db
      .prepare(
        `SELECT i.*, ${selectScore}
         FROM ${fromClause}
         ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(...args, input.pageSize, offset) as Array<ItemRow & { score: number }>;

    return {
      total: totalRow.total,
      rows
    };
  } catch {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid search query syntax.");
  }
}

export const itemModel = {
  getItemById(itemId: string): ItemRecord | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId) as ItemRow | undefined;
    return row ? mapRow(row) : null;
  },

  getItemByPath(filePath: string): ItemRecord | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM items WHERE path = ?").get(filePath) as ItemRow | undefined;
    return row ? mapRow(row) : null;
  },

  listActiveByRoot(rootId: string): ItemRecord[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM items WHERE root_id = ? AND deleted = 0 ORDER BY updated_at DESC")
      .all(rootId) as ItemRow[];
    return rows.map(mapRow);
  },

  listItemsByPaths(paths: string[]): Map<string, ItemRecord> {
    const map = new Map<string, ItemRecord>();
    if (paths.length === 0) {
      return map;
    }
    const db = getDb();
    const placeholders = buildInClause(paths);
    const rows = db.prepare(`SELECT * FROM items WHERE path IN (${placeholders}) AND deleted = 0`).all(...paths) as ItemRow[];
    for (const row of rows) {
      const item = mapRow(row);
      map.set(item.path, item);
    }
    return map;
  },

  listSnapshotsByRoot(rootId: string): ExistingSnapshot[] {
    const db = getDb();
    return db
      .prepare("SELECT id, path, size, mtime_ms, inode, deleted FROM items WHERE root_id = ?")
      .all(rootId) as ExistingSnapshot[];
  },

  listImageByRootAndPrefix(input: {
    rootId: string;
    absolutePrefixPath: string;
    page: number;
    pageSize: number;
  }): { total: number; rows: ItemRecord[] } {
    const db = getDb();
    const likePrefix = `${input.absolutePrefixPath}%`;
    const totalRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM items
         WHERE root_id = ? AND type = 'image' AND deleted = 0 AND path LIKE ?`
      )
      .get(input.rootId, likePrefix) as { total: number };
    const offset = (input.page - 1) * input.pageSize;
    const rows = db
      .prepare(
        `SELECT *
         FROM items
         WHERE root_id = ? AND type = 'image' AND deleted = 0 AND path LIKE ?
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(input.rootId, likePrefix, input.pageSize, offset) as ItemRow[];
    return {
      total: totalRow.total,
      rows: rows.map(mapRow)
    };
  },

  findFirstImageByRootAndPrefix(rootId: string, absolutePrefixPath: string): ItemRecord | null {
    const db = getDb();
    const likePrefix = `${absolutePrefixPath}%`;
    const row = db
      .prepare(
        `SELECT *
         FROM items
         WHERE root_id = ? AND type = 'image' AND deleted = 0 AND path LIKE ?
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get(rootId, likePrefix) as ItemRow | undefined;
    return row ? mapRow(row) : null;
  },

  upsertFromScan(input: UpsertItemInput): "created" | "updated" | "unchanged" {
    const db = getDb();
    const now = Date.now();
    const tagsJson = JSON.stringify(input.tags);
    const metadataJson = JSON.stringify(input.metadata);
    const existing = db
      .prepare(
        `SELECT id, title, type, ext, size, mtime_ms, ctime_ms, inode, tags, metadata, content_text, deleted
         FROM items WHERE path = ?`
      )
      .get(input.path) as any;

    if (!existing) {
      db.prepare(
        `INSERT INTO items (
          id, root_id, path, title, type, ext, size, mtime_ms, ctime_ms, inode,
          tags, metadata, content_text, deleted, created_at, updated_at, last_scanned_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      ).run(
        uuidv4(),
        input.rootId,
        input.path,
        input.title,
        input.type,
        input.ext,
        input.size,
        input.mtimeMs,
        input.ctimeMs,
        input.inode,
        tagsJson,
        metadataJson,
        input.contentText,
        now,
        now,
        now
      );
      return "created";
    }

    const changed =
      existing.title !== input.title ||
      existing.type !== input.type ||
      existing.ext !== input.ext ||
      existing.size !== input.size ||
      existing.mtime_ms !== input.mtimeMs ||
      existing.ctime_ms !== input.ctimeMs ||
      existing.inode !== input.inode ||
      existing.tags !== tagsJson ||
      existing.metadata !== metadataJson ||
      existing.content_text !== input.contentText ||
      existing.deleted === 1;

    if (changed) {
      db.prepare(
        `UPDATE items
         SET root_id = ?, title = ?, type = ?, ext = ?, size = ?, mtime_ms = ?, ctime_ms = ?, inode = ?,
             tags = ?, metadata = ?, content_text = ?, deleted = 0, updated_at = ?, last_scanned_at = ?
         WHERE path = ?`
      ).run(
        input.rootId,
        input.title,
        input.type,
        input.ext,
        input.size,
        input.mtimeMs,
        input.ctimeMs,
        input.inode,
        tagsJson,
        metadataJson,
        input.contentText,
        now,
        now,
        input.path
      );
      return "updated";
    }

    db.prepare("UPDATE items SET last_scanned_at = ? WHERE path = ?").run(now, input.path);
    return "unchanged";
  },

  markMissingAsDeleted(rootId: string, seenPaths: string[]): number {
    const db = getDb();
    const now = Date.now();
    if (seenPaths.length === 0) {
      const result = db
        .prepare("UPDATE items SET deleted = 1, updated_at = ? WHERE root_id = ? AND deleted = 0")
        .run(now, rootId);
      return result.changes;
    }
    const placeholders = buildInClause(seenPaths);
    const sql = `UPDATE items
      SET deleted = 1, updated_at = ?
      WHERE root_id = ? AND deleted = 0 AND path NOT IN (${placeholders})`;
    const result = db.prepare(sql).run(now, rootId, ...seenPaths);
    return result.changes;
  },

  search(input: {
    query?: string;
    page: number;
    pageSize: number;
    type?: ItemType;
    rootId?: string;
    tag?: string;
    sortBy: SearchSortBy;
    order: SortOrder;
  }): { total: number; rows: ItemRecord[] } {
    const result = runSearchQuery(input);
    return {
      total: result.total,
      rows: result.rows.map(mapRow)
    };
  },

  searchWithScore(input: {
    query?: string;
    page: number;
    pageSize: number;
    type?: ItemType;
    rootId?: string;
    tag?: string;
    sortBy: SearchSortBy;
    order: SortOrder;
  }): { total: number; rows: SearchItemRecord[] } {
    const result = runSearchQuery(input);
    return {
      total: result.total,
      rows: result.rows.map((row) => ({
        item: mapRow(row),
        score: Number(row.score ?? 0)
      }))
    };
  }
};
