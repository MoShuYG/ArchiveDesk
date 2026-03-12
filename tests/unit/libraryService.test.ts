import fs from "fs/promises";
import os from "os";
import path from "path";
import { libraryService } from "../../src/api/library/libraryService";
import { ErrorCodes } from "../../src/errors/errorCodes";

describe("libraryService", () => {
  test("should create root and reject duplicate path", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-lib-"));
    const created = await libraryService.createRoot({ name: "root-a", path: tempRoot });
    expect(created.name).toBe("root-a");

    await expect(libraryService.createRoot({ name: "root-b", path: tempRoot })).rejects.toMatchObject({
      code: ErrorCodes.ROOT_PATH_CONFLICT
    });
  });

  test("should reject nested roots", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-lib-nested-"));
    const child = path.join(tempRoot, "child");
    await fs.mkdir(child, { recursive: true });

    await libraryService.createRoot({ name: "parent", path: tempRoot });
    await expect(libraryService.createRoot({ name: "child", path: child })).rejects.toMatchObject({
      code: ErrorCodes.ROOT_PATH_CONFLICT
    });
  });
});

