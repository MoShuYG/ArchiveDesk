import fs from "fs/promises";
import { folderCoverStore } from "../../src/services/folderCoverStore";

describe("folderCoverStore", () => {
  test("should upsert and read cover entries", async () => {
    const upserted = await folderCoverStore.upsertEntry({
      rootId: "root-1",
      relPath: "A/B",
      mode: "manual_item",
      itemId: "item-123"
    });
    expect(upserted.mode).toBe("manual_item");
    const loaded = await folderCoverStore.getEntry("root-1", "A/B");
    expect(loaded?.itemId).toBe("item-123");
  });

  test("should cleanup uploaded files when removing root", async () => {
    const rootId = "root-upload";
    const uploadRoot = await folderCoverStore.ensureUploadRoot(rootId);
    const fileName = await folderCoverStore.createUploadedFileName("jpg");
    const absolutePath = folderCoverStore.getUploadedFileAbsolutePath(rootId, fileName);
    await fs.writeFile(absolutePath, Buffer.from("fake-image"));

    await folderCoverStore.upsertEntry({
      rootId,
      relPath: "album",
      mode: "manual_upload",
      uploadedFile: fileName
    });

    await folderCoverStore.removeRoot(rootId);
    const entry = await folderCoverStore.getEntry(rootId, "album");
    expect(entry).toBeNull();
    await expect(fs.stat(uploadRoot)).rejects.toBeTruthy();
  });
});
