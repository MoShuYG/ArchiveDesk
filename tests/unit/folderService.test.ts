import fs from "fs/promises";
import os from "os";
import path from "path";
import { folderService } from "../../src/api/library/folderService";
import { libraryService } from "../../src/api/library/libraryService";
import { scanService } from "../../src/api/scan/scanService";
import { ErrorCodes } from "../../src/errors/errorCodes";
import { itemModel } from "../../src/models/itemModel";

async function waitForScanTask(taskId: string): Promise<void> {
  const timeoutAt = Date.now() + 10_000;
  while (Date.now() < timeoutAt) {
    const task = scanService.getTask(taskId);
    if (task.status === "success") {
      return;
    }
    if (task.status === "failed") {
      throw new Error(`scan failed: ${task.errorMessage}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("scan timeout");
}

describe("folderService", () => {
  test("should list folders and set none/manual_item cover", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-folder-"));
    const folderA = path.join(rootPath, "A");
    const folderB = path.join(folderA, "B");
    await fs.mkdir(folderB, { recursive: true });
    await fs.writeFile(path.join(folderA, "cover-1.jpg"), Buffer.from("img1"));
    await fs.writeFile(path.join(folderB, "cover-2.png"), Buffer.from("img2"));

    const root = await libraryService.createRoot({ name: "test-root", path: rootPath });
    const task = scanService.enqueueFullScan();
    await waitForScanTask(task.id);

    const listed = await folderService.listFolders({
      rootId: root.id,
      parentRelPath: "",
      page: 1,
      pageSize: 20
    });
    expect(listed.total).toBe(1);
    expect(listed.items[0].relPath).toBe("A");
    expect(listed.items[0].hasChildren).toBe(true);

    const candidates = await folderService.listCoverCandidates({
      rootId: root.id,
      relPath: "A",
      page: 1,
      pageSize: 20
    });
    expect(candidates.total).toBeGreaterThanOrEqual(2);

    const noneCover = await folderService.setFolderCover({
      rootId: root.id,
      relPath: "A",
      mode: "none"
    });
    expect(noneCover.mode).toBe("none");
    expect(noneCover.url).toBeNull();

    const manualCover = await folderService.setFolderCover({
      rootId: root.id,
      relPath: "A",
      mode: "manual_item",
      itemId: candidates.items[0].id
    });
    expect(manualCover.mode).toBe("manual_item");
    expect(manualCover.url).toContain("/api/items/");
  });

  test("should reject folder traversal", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-folder-path-"));
    const root = await libraryService.createRoot({ name: "path-root", path: rootPath });

    await expect(
      folderService.listFolders({
        rootId: root.id,
        parentRelPath: "../outside",
        page: 1,
        pageSize: 20
      })
    ).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR
    });
  });

  test("auto cover should use first image in current folder by natural name order", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-folder-auto-cover-"));
    const folderA = path.join(rootPath, "A");
    const folderB = path.join(folderA, "B");
    await fs.mkdir(folderB, { recursive: true });
    await fs.writeFile(path.join(folderA, "img10.jpg"), Buffer.from("img10"));
    await fs.writeFile(path.join(folderA, "img2.jpg"), Buffer.from("img2"));
    await fs.writeFile(path.join(folderA, "img1.jpg"), Buffer.from("img1"));
    await fs.writeFile(path.join(folderB, "img0.jpg"), Buffer.from("img0"));

    const root = await libraryService.createRoot({ name: "auto-cover-root", path: rootPath });
    const task = scanService.enqueueFullScan();
    await waitForScanTask(task.id);

    const listed = await folderService.listFolders({
      rootId: root.id,
      parentRelPath: "",
      page: 1,
      pageSize: 20
    });
    const folderAView = listed.items.find((item) => item.relPath === "A");
    expect(folderAView).toBeTruthy();

    const expectedItem = itemModel.getItemByPath(path.join(folderA, "img1.jpg"));
    expect(expectedItem).toBeTruthy();
    expect(folderAView?.cover.url).toBe(`/api/items/${encodeURIComponent(expectedItem!.id)}/thumbnail`);
  });

  test("auto cover should be empty when current folder has no image", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-folder-auto-empty-"));
    const folderA = path.join(rootPath, "A");
    const folderB = path.join(folderA, "B");
    await fs.mkdir(folderB, { recursive: true });
    await fs.writeFile(path.join(folderB, "child.jpg"), Buffer.from("img"));

    const root = await libraryService.createRoot({ name: "auto-cover-empty-root", path: rootPath });
    const task = scanService.enqueueFullScan();
    await waitForScanTask(task.id);

    const listed = await folderService.listFolders({
      rootId: root.id,
      parentRelPath: "",
      page: 1,
      pageSize: 20
    });
    const folderAView = listed.items.find((item) => item.relPath === "A");
    expect(folderAView).toBeTruthy();
    expect(folderAView?.cover.url).toBeNull();
  });
});
