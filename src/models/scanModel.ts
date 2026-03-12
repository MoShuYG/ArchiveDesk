import { v4 as uuidv4 } from "uuid";
import { getDb } from "../api/utils/dbUtils";

export type ScanTaskType = "full" | "incremental";
export type ScanTaskStatus = "queued" | "running" | "success" | "failed" | "canceled";

export type ScanTaskRecord = {
  id: string;
  type: ScanTaskType;
  status: ScanTaskStatus;
  startedAt: number | null;
  finishedAt: number | null;
  totalFiles: number;
  processedFiles: number;
  createdFiles: number;
  updatedFiles: number;
  deletedFiles: number;
  warnings: string[];
  errorMessage: string | null;
  createdAt: number;
};

type ScanTaskRow = {
  id: string;
  type: ScanTaskType;
  status: ScanTaskStatus;
  started_at: number | null;
  finished_at: number | null;
  total_files: number;
  processed_files: number;
  created_files: number;
  updated_files: number;
  deleted_files: number;
  warnings_json: string;
  error_message: string | null;
  created_at: number;
};

function mapRow(row: ScanTaskRow): ScanTaskRecord {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    totalFiles: row.total_files,
    processedFiles: row.processed_files,
    createdFiles: row.created_files,
    updatedFiles: row.updated_files,
    deletedFiles: row.deleted_files,
    warnings: JSON.parse(row.warnings_json),
    errorMessage: row.error_message,
    createdAt: row.created_at
  };
}

export const scanModel = {
  createTask(type: ScanTaskType): ScanTaskRecord {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();
    db.prepare(
      `INSERT INTO scan_tasks (
        id, type, status, started_at, finished_at, total_files, processed_files, created_files, updated_files, deleted_files,
        warnings_json, error_message, created_at
      ) VALUES (?, ?, 'queued', NULL, NULL, 0, 0, 0, 0, 0, '[]', NULL, ?)`
    ).run(id, type, now);
    const task = this.getTaskById(id);
    if (!task) {
      throw new Error("Failed to create scan task.");
    }
    return task;
  },

  getTaskById(taskId: string): ScanTaskRecord | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM scan_tasks WHERE id = ?").get(taskId) as ScanTaskRow | undefined;
    return row ? mapRow(row) : null;
  },

  listRunningTasks(): ScanTaskRecord[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM scan_tasks WHERE status = 'running' ORDER BY created_at DESC").all() as ScanTaskRow[];
    return rows.map(mapRow);
  },

  markRunning(taskId: string): void {
    const db = getDb();
    db.prepare("UPDATE scan_tasks SET status = 'running', started_at = ? WHERE id = ?").run(Date.now(), taskId);
  },

  updateProgress(
    taskId: string,
    input: {
      totalFiles: number;
      processedFiles: number;
      createdFiles: number;
      updatedFiles: number;
      deletedFiles: number;
      warnings: string[];
    }
  ): void {
    const db = getDb();
    db.prepare(
      `UPDATE scan_tasks
       SET total_files = ?, processed_files = ?, created_files = ?, updated_files = ?, deleted_files = ?, warnings_json = ?
       WHERE id = ?`
    ).run(
      input.totalFiles,
      input.processedFiles,
      input.createdFiles,
      input.updatedFiles,
      input.deletedFiles,
      JSON.stringify(input.warnings),
      taskId
    );
  },

  markSuccess(taskId: string): void {
    const db = getDb();
    db.prepare("UPDATE scan_tasks SET status = 'success', finished_at = ? WHERE id = ?").run(Date.now(), taskId);
  },

  markFailed(taskId: string, message: string): void {
    const db = getDb();
    db.prepare("UPDATE scan_tasks SET status = 'failed', finished_at = ?, error_message = ? WHERE id = ?").run(Date.now(), message, taskId);
  }
};

