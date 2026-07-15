import fs from "fs/promises";
import os from "os";
import path from "path";
import { historyService } from "../../src/api/history/historyService";
import { libraryService } from "../../src/api/library/libraryService";
import { scanService } from "../../src/api/scan/scanService";
import { searchService } from "../../src/api/search/searchService";
import { scanModel } from "../../src/models/scanModel";
import { scanJobService } from "../../src/services/scanJobService";

async function waitForScanTask(taskId: string): Promise<any> {
  const timeoutAt = Date.now() + 10_000;
  while (Date.now() < timeoutAt) {
    const task = scanService.getTask(taskId);
    if (task.status === "success" || task.status === "failed") {
      return task;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Scan task timeout: ${taskId}`);
}

describe("scan/search/history flow", () => {
  test("should end unfinished scan tasks after the service restarts", () => {
    const runningTask = scanModel.createTask("full");
    scanModel.markRunning(runningTask.id);
    const queuedTask = scanModel.createTask("incremental");

    const recoveredCount = scanJobService.recoverInterruptedTasks();

    expect(recoveredCount).toBe(2);
    for (const taskId of [runningTask.id, queuedTask.id]) {
      const task = scanModel.getTaskById(taskId);
      expect(task?.status).toBe("failed");
      expect(task?.finishedAt).not.toBeNull();
      expect(task?.errorMessage).toContain("服务已重启");
    }
  });

  test("should persist progress before a root finishes scanning", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-progress-"));
    await Promise.all(
      Array.from({ length: 205 }, (_, index) => fs.writeFile(path.join(tempRoot, `file-${index}.bin`), ""))
    );
    await libraryService.createRoot({ name: "progress-root", path: tempRoot });
    const progressSnapshots: Array<{ taskId: string; totalFiles: number; processedFiles: number }> = [];
    const updateProgress = scanModel.updateProgress.bind(scanModel);
    const updateProgressSpy = jest.spyOn(scanModel, "updateProgress").mockImplementation((taskId, progress) => {
      progressSnapshots.push({
        taskId,
        totalFiles: progress.totalFiles,
        processedFiles: progress.processedFiles
      });
      updateProgress(taskId, progress);
    });

    try {
      const task = scanService.enqueueFullScan();
      const result = await waitForScanTask(task.id);

      expect(result.status).toBe("success");
      expect(
        progressSnapshots.some(
          (progress) =>
            progress.taskId === task.id &&
            progress.processedFiles > 0 &&
            progress.processedFiles < progress.totalFiles
        )
      ).toBe(true);
    } finally {
      updateProgressSpy.mockRestore();
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("should scan files, search by name and persist history progress", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-scan-"));
    const textPath = path.join(tempRoot, "story.txt");
    await fs.writeFile(textPath, "hello world from novel content");

    await libraryService.createRoot({ name: "root", path: tempRoot });

    const fullTask = scanService.enqueueFullScan();
    const fullResult = await waitForScanTask(fullTask.id);
    expect(fullResult.status).toBe("success");
    expect(fullResult.processedFiles).toBeGreaterThanOrEqual(1);

    const searchByName = searchService.search({
      q: "story",
      page: 1,
      pageSize: 20,
      sortBy: "relevance",
      order: "asc"
    });
    expect(searchByName.total).toBeGreaterThanOrEqual(1);
    const targetItem = searchByName.items[0];
    expect(targetItem).toBeTruthy();

    const upserted = historyService.upsertProgress(targetItem.id, { position: 42, duration: 100 });
    expect(upserted.itemId).toBe(targetItem.id);

    const history = historyService.listHistory({ page: 1, pageSize: 20 });
    expect(history.total).toBe(1);
    expect(history.rows[0].item.id).toBe(targetItem.id);

    await fs.writeFile(textPath, "hello world changed");
    const incrementalTask = scanService.enqueueIncrementalScan();
    const incrementalResult = await waitForScanTask(incrementalTask.id);
    expect(incrementalResult.status).toBe("success");
  });

  test("should globally sort mixed folder and file search results", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-mixed-"));
    const folderPath = path.join(tempRoot, "bbb-match-folder");
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(tempRoot, "aaa-match-file.txt"), "match content");

    await libraryService.createRoot({ name: "mixed-root", path: tempRoot });
    const fullTask = scanService.enqueueFullScan();
    const fullResult = await waitForScanTask(fullTask.id);
    expect(fullResult.status).toBe("success");

    const mixed = await searchService.searchEntries({
      q: "match",
      page: 1,
      pageSize: 20,
      sortBy: "name",
      order: "asc"
    });

    expect(mixed.total).toBeGreaterThanOrEqual(2);
    expect(mixed.items[0]).toMatchObject({ kind: "file", name: "aaa-match-file.txt" });
    expect(mixed.items[1]).toMatchObject({ kind: "folder", name: "bbb-match-folder" });
  });

  test("should support history root filter", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-history-filter-"));
    await fs.writeFile(path.join(tempRoot, "intro.txt"), "chapter intro");

    const createdRoot = await libraryService.createRoot({ name: "filter-root", path: tempRoot });
    const fullTask = scanService.enqueueFullScan();
    const fullResult = await waitForScanTask(fullTask.id);
    expect(fullResult.status).toBe("success");

    const fileSearch = searchService.search({
      q: "intro",
      page: 1,
      pageSize: 20,
      sortBy: "relevance",
      order: "asc"
    });
    const itemId = fileSearch.items[0].id;
    historyService.recordView(itemId);

    const filtered = historyService.listHistory({
      page: 1,
      pageSize: 20,
      rootId: createdRoot.id
    });
    expect(filtered.total).toBeGreaterThanOrEqual(1);
  });
});
