import fs from "fs/promises";
import os from "os";
import path from "path";
import { explorerService } from "../../src/api/library/explorerService";
import { libraryService } from "../../src/api/library/libraryService";
import { ErrorCodes } from "../../src/errors/errorCodes";

describe("explorerService", () => {
  test("should list mixed entries with folders first and natural name sorting", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-explorer-unit-"));
    await fs.mkdir(path.join(rootPath, "FolderB"), { recursive: true });
    await fs.mkdir(path.join(rootPath, "FolderA"), { recursive: true });
    await fs.writeFile(path.join(rootPath, "file10.txt"), "10");
    await fs.writeFile(path.join(rootPath, "file2.txt"), "2");

    const root = await libraryService.createRoot({ name: "explorer-root", path: rootPath });
    const response = await explorerService.listEntries({
      rootId: root.id,
      relPath: "",
      page: 1,
      pageSize: 50,
      sortBy: "name",
      order: "asc",
      foldersFirst: true
    });

    expect(response.total).toBe(4);
    expect(response.items[0].kind).toBe("folder");
    expect(response.items[1].kind).toBe("folder");
    const fileNames = response.items.filter((item) => item.kind === "file").map((item) => item.name);
    expect(fileNames).toEqual(["file2.txt", "file10.txt"]);
  });

  test("should block traversal path", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-explorer-traversal-"));
    const root = await libraryService.createRoot({ name: "explorer-root", path: rootPath });

    await expect(
      explorerService.listEntries({
        rootId: root.id,
        relPath: "../outside",
        page: 1,
        pageSize: 20,
        sortBy: "name",
        order: "asc",
        foldersFirst: true
      })
    ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
  });
});

