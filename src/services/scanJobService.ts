import { FSWatcher, watch } from "fs";
import fsp from "fs/promises";
import path from "path";
import { libraryModel } from "../models/libraryModel";
import { itemModel } from "../models/itemModel";
import { scanModel, ScanTaskRecord, ScanTaskType } from "../models/scanModel";
import { extractMetadata, extractTextContent } from "./metadata/metadataService";
import { searchService } from "../api/search/searchService";
import { classifyItemTypeFromExt } from "./fileSupportService";

type MutableProgress = {
  totalFiles: number;
  processedFiles: number;
  createdFiles: number;
  updatedFiles: number;
  deletedFiles: number;
  warnings: string[];
};

async function walkFiles(dirPath: string, files: string[]): Promise<void> {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

async function scanRoot(rootId: string, rootPath: string, progress: MutableProgress, mode: ScanTaskType): Promise<void> {
  const files: string[] = [];
  await walkFiles(rootPath, files);
  progress.totalFiles += files.length;
  const seenPaths: string[] = [];
  const snapshots =
    mode === "incremental"
      ? new Map(itemModel.listSnapshotsByRoot(rootId).map((snapshot) => [snapshot.path, snapshot]))
      : new Map<string, ReturnType<typeof itemModel.listSnapshotsByRoot>[number]>();

  for (const filePath of files) {
    const stat = await fsp.stat(filePath);
    const ext = path.extname(filePath).replace(".", "").toLowerCase() || null;
    const itemType = classifyItemTypeFromExt(ext);
    const title = path.basename(filePath, path.extname(filePath));
    const inode = stat.ino ? String(stat.ino) : null;
    const existing = snapshots.get(filePath);

    if (
      mode === "incremental" &&
      existing &&
      existing.deleted === 0 &&
      existing.size === stat.size &&
      existing.mtime_ms === stat.mtimeMs &&
      existing.inode === inode
    ) {
      progress.processedFiles += 1;
      seenPaths.push(filePath);
      continue;
    }

    const metadataResult = await extractMetadata(filePath, itemType);
    const contentText = await extractTextContent(filePath, ext);
    for (const warning of metadataResult.warnings) {
      if (!progress.warnings.includes(warning)) {
        progress.warnings.push(warning);
      }
    }

    const upsertResult = itemModel.upsertFromScan({
      rootId,
      path: filePath,
      title,
      type: itemType,
      ext,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      ctimeMs: stat.ctimeMs,
      inode,
      tags: [],
      metadata: metadataResult.metadata,
      contentText
    });
    if (upsertResult === "created") {
      progress.createdFiles += 1;
    } else if (upsertResult === "updated") {
      progress.updatedFiles += 1;
    }
    progress.processedFiles += 1;
    seenPaths.push(filePath);
  }

  progress.deletedFiles += itemModel.markMissingAsDeleted(rootId, seenPaths);
}

async function executeTask(task: ScanTaskRecord): Promise<void> {
  scanModel.markRunning(task.id);
  const progress: MutableProgress = {
    totalFiles: 0,
    processedFiles: 0,
    createdFiles: 0,
    updatedFiles: 0,
    deletedFiles: 0,
    warnings: []
  };
  try {
    const roots = libraryModel.listRoots();
    for (const root of roots) {
      await scanRoot(root.id, root.path, progress, task.type);
      searchService.invalidateFolderIndex(root.id);
      scanModel.updateProgress(task.id, progress);
    }
    scanModel.updateProgress(task.id, progress);
    scanModel.markSuccess(task.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scan failure";
    scanModel.markFailed(task.id, message);
  }
}

class ScanJobService {
  private queue: ScanTaskRecord[] = [];
  private running = false;
  private currentTaskType: ScanTaskType | null = null;
  private watchers = new Map<string, FSWatcher>();
  private incrementalDebounceTimer: NodeJS.Timeout | null = null;

  enqueue(type: ScanTaskType): ScanTaskRecord {
    const task = scanModel.createTask(type);
    this.queue.push(task);
    this.refreshWatchers();
    this.scheduleRun();
    return task;
  }

  getTask(taskId: string): ScanTaskRecord | null {
    return scanModel.getTaskById(taskId);
  }

  refreshWatchers(): void {
    if (process.env.NODE_ENV === "test") {
      return;
    }
    const roots = libraryModel.listRoots();
    const rootMap = new Map(roots.map((root) => [root.id, root]));
    for (const [rootId, watcher] of this.watchers.entries()) {
      if (!rootMap.has(rootId)) {
        watcher.close();
        this.watchers.delete(rootId);
      }
    }

    for (const root of roots) {
      if (this.watchers.has(root.id)) {
        continue;
      }
      try {
        const watcher = watch(
          root.path,
          { recursive: true },
          () => {
            this.scheduleIncrementalScan();
          }
        );
        watcher.on("error", () => {
          watcher.close();
          this.watchers.delete(root.id);
        });
        this.watchers.set(root.id, watcher);
      } catch (error) {
        console.warn(`watch setup failed for root ${root.path}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
  }

  private scheduleRun(): void {
    if (this.running) {
      return;
    }
    if (this.queue.length === 0) {
      return;
    }
    this.running = true;
    setImmediate(async () => {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          this.currentTaskType = task.type;
          await executeTask(task);
          this.currentTaskType = null;
        }
      }
      this.running = false;
    });
  }

  private hasPendingIncremental(): boolean {
    if (this.currentTaskType === "incremental") {
      return true;
    }
    return this.queue.some((task) => task.type === "incremental");
  }

  private scheduleIncrementalScan(): void {
    if (this.incrementalDebounceTimer) {
      clearTimeout(this.incrementalDebounceTimer);
    }
    this.incrementalDebounceTimer = setTimeout(() => {
      this.incrementalDebounceTimer = null;
      if (this.hasPendingIncremental()) {
        return;
      }
      this.enqueue("incremental");
    }, 1200);
  }
}

export const scanJobService = new ScanJobService();
