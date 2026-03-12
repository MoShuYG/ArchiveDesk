import { v4 as uuidv4 } from "uuid";
import { getDb } from "../api/utils/dbUtils";

export type LibraryRootRecord = {
  id: string;
  name: string;
  path: string;
  normalizedPath: string;
  createdAt: number;
  updatedAt: number;
};

function mapRow(row: any): LibraryRootRecord {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    normalizedPath: row.normalized_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const libraryModel = {
  listRoots(): LibraryRootRecord[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM library_roots ORDER BY created_at ASC").all() as any[];
    return rows.map(mapRow);
  },

  getRootById(id: string): LibraryRootRecord | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM library_roots WHERE id = ?").get(id);
    return row ? mapRow(row) : null;
  },

  getRootByNormalizedPath(normalizedPath: string): LibraryRootRecord | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM library_roots WHERE normalized_path = ?").get(normalizedPath);
    return row ? mapRow(row) : null;
  },

  createRoot(input: { name: string; path: string; normalizedPath: string }): LibraryRootRecord {
    const db = getDb();
    const now = Date.now();
    const id = uuidv4();
    db.prepare(
      `INSERT INTO library_roots (id, name, path, normalized_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, input.name, input.path, input.normalizedPath, now, now);
    const created = this.getRootById(id);
    if (!created) {
      throw new Error("Failed to create root.");
    }
    return created;
  },

  updateRoot(
    id: string,
    input: {
      name: string;
      path: string;
      normalizedPath: string;
    }
  ): LibraryRootRecord | null {
    const db = getDb();
    const now = Date.now();
    db.prepare(
      `UPDATE library_roots
       SET name = ?, path = ?, normalized_path = ?, updated_at = ?
       WHERE id = ?`
    ).run(input.name, input.path, input.normalizedPath, now, id);
    return this.getRootById(id);
  },

  deleteRoot(id: string): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM library_roots WHERE id = ?").run(id);
    return result.changes;
  }
};

