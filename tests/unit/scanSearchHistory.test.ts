import fs from "fs/promises";
import os from "os";
import path from "path";
import { historyService } from "../../src/api/history/historyService";
import { libraryService } from "../../src/api/library/libraryService";
import { scanService } from "../../src/api/scan/scanService";
import { searchService } from "../../src/api/search/searchService";

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

  test("should support mixed folder search and history root filter", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-mixed-"));
    const chapterDir = path.join(tempRoot, "ChapterOne");
    await fs.mkdir(chapterDir, { recursive: true });
    await fs.writeFile(path.join(chapterDir, "intro.txt"), "chapter intro");

    const createdRoot = await libraryService.createRoot({ name: "mixed-root", path: tempRoot });
    const fullTask = scanService.enqueueFullScan();
    const fullResult = await waitForScanTask(fullTask.id);
    expect(fullResult.status).toBe("success");

    const mixed = await searchService.searchEntries({
      q: "Chapter",
      page: 1,
      pageSize: 20,
      sortBy: "relevance",
      order: "asc"
    });
    expect(mixed.total).toBeGreaterThanOrEqual(1);
    expect(mixed.items[0].kind).toBe("folder");

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
