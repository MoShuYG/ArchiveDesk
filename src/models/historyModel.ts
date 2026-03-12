import { getDb } from "../api/utils/dbUtils";

export type HistoryRecord = {
  itemId: string;
  progress: Record<string, unknown>;
  lastAccessedAt: number;
  updatedAt: number;
};

export type HistorySortBy = "lastAccessedAt" | "name" | "type" | "updatedAt" | "size";
export type HistorySortOrder = "asc" | "desc";

type HistoryRow = {
  item_id: string;
  progress_json: string;
  last_accessed_at: number;
  updated_at: number;
};

function mapRow(row: HistoryRow): HistoryRecord {
  return {
    itemId: row.item_id,
    progress: JSON.parse(row.progress_json),
    lastAccessedAt: row.last_accessed_at,
    updatedAt: row.updated_at
  };
}

export const historyModel = {
  upsertProgress(itemId: string, progress: Record<string, unknown>): HistoryRecord {
    const db = getDb();
    const now = Date.now();
    const progressJson = JSON.stringify(progress);
    db.prepare(
      `INSERT INTO history (item_id, progress_json, last_accessed_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         progress_json = excluded.progress_json,
         last_accessed_at = excluded.last_accessed_at,
         updated_at = excluded.updated_at`
    ).run(itemId, progressJson, now, now);

    const row = db.prepare("SELECT * FROM history WHERE item_id = ?").get(itemId) as HistoryRow;
    return mapRow(row);
  },

  listHistory(input: {
    page: number;
    pageSize: number;
    type?: string;
    rootId?: string;
    sortBy: HistorySortBy;
    order: HistorySortOrder;
  }): { total: number; rows: Array<HistoryRecord & { item: any }> } {
    const db = getDb();
    const whereParts = ["i.deleted = 0"];
    const args: any[] = [];
    if (input.type) {
      whereParts.push("i.type = ?");
      args.push(input.type);
    }
    if (input.rootId) {
      whereParts.push("i.root_id = ?");
      args.push(input.rootId);
    }
    const where = `WHERE ${whereParts.join(" AND ")}`;
    const totalRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM history h
         JOIN items i ON i.id = h.item_id
         ${where}`
      )
      .get(...args) as { total: number };

    const offset = (input.page - 1) * input.pageSize;
    const direction = input.order === "asc" ? "ASC" : "DESC";
    const orderBy =
      input.sortBy === "name"
        ? `i.title COLLATE NOCASE ${direction}`
        : input.sortBy === "type"
          ? `i.type COLLATE NOCASE ${direction}, i.title COLLATE NOCASE ASC`
          : input.sortBy === "updatedAt"
            ? `i.updated_at ${direction}, h.last_accessed_at DESC`
            : input.sortBy === "size"
              ? `i.size ${direction}, i.title COLLATE NOCASE ASC`
              : `h.last_accessed_at ${direction}`;
    const rows = db
      .prepare(
        `SELECT h.*, i.id AS i_id, i.root_id AS i_root_id, i.title AS i_title, i.path AS i_path, i.type AS i_type, i.metadata AS i_metadata, i.size AS i_size, i.updated_at AS i_updated_at
         FROM history h
         JOIN items i ON i.id = h.item_id
         ${where}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(...args, input.pageSize, offset) as any[];

    return {
      total: totalRow.total,
      rows: rows.map((row) => ({
        ...mapRow(row),
        item: {
          id: row.i_id,
          rootId: row.i_root_id,
          title: row.i_title,
          path: row.i_path,
          type: row.i_type,
          metadata: JSON.parse(row.i_metadata)
        }
      }))
    };
  },

  recordView(itemId: string): HistoryRecord {
    const db = getDb();
    const now = Date.now();
    db.prepare(
      `INSERT INTO history (item_id, progress_json, last_accessed_at, updated_at)
       VALUES (?, '{}', ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         last_accessed_at = excluded.last_accessed_at,
         updated_at = excluded.updated_at`
    ).run(itemId, now, now);
    const row = db.prepare("SELECT * FROM history WHERE item_id = ?").get(itemId) as HistoryRow;
    return mapRow(row);
  }
};
