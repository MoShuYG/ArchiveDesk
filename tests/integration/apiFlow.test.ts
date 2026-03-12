import fs from "fs/promises";
import os from "os";
import path from "path";
import request from "supertest";
import { createApp } from "../../src/app";
import { ErrorCodes } from "../../src/errors/errorCodes";
import { systemOpenService } from "../../src/services/systemOpenService";

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function waitTask(app: ReturnType<typeof createApp>, token: string, taskId: string): Promise<any> {
  const timeoutAt = Date.now() + 10_000;
  while (Date.now() < timeoutAt) {
    const res = await request(app).get(`/api/scan/tasks/${taskId}`).set(authHeader(token));
    if (res.body.status === "success" || res.body.status === "failed") {
      return res.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("scan timeout");
}

describe("integration api flow", () => {
  const app = createApp();

  test("unauthorized requests should be blocked", async () => {
    const res = await request(app).get("/api/library/roots");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(ErrorCodes.UNAUTHORIZED);
  });

  test("should complete setup/login/library/scan/search/history/lock flow", async () => {
    await request(app).post("/api/auth/setup-password").send({ password: "password123" }).expect(201);
    const login = await request(app).post("/api/auth/login").send({ password: "password123" }).expect(200);
    const accessToken = login.body.accessToken as string;
    expect(accessToken).toBeTruthy();

    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-int-"));
    await fs.writeFile(path.join(tempRoot, "book.md"), "# title\nbook content");

    const rootRes = await request(app)
      .post("/api/library/roots")
      .set(authHeader(accessToken))
      .send({ name: "test-root", path: tempRoot })
      .expect(201);
    expect(rootRes.body.id).toBeTruthy();

    const scan = await request(app).post("/api/scan/full").set(authHeader(accessToken)).expect(202);
    const task = await waitTask(app, accessToken, scan.body.taskId);
    expect(task.status).toBe("success");

    const search = await request(app)
      .get("/api/search/items")
      .query({ q: "book", page: 1, pageSize: 20, sort: "relevance" })
      .set(authHeader(accessToken))
      .expect(200);
    expect(search.body.total).toBeGreaterThanOrEqual(1);
    const itemId = search.body.items[0].id as string;

    await request(app)
      .put(`/api/history/items/${itemId}/progress`)
      .set(authHeader(accessToken))
      .send({ progress: { position: 12 } })
      .expect(200);

    const history = await request(app).get("/api/history/items").set(authHeader(accessToken)).expect(200);
    expect(history.body.total).toBe(1);

    await request(app).post("/api/auth/lock").set(authHeader(accessToken)).expect(200);
    const sessionLocked = await request(app).get("/api/auth/session").set(authHeader(accessToken)).expect(200);
    expect(sessionLocked.body.locked).toBe(true);
    const blocked = await request(app).get("/api/library/roots").set(authHeader(accessToken)).expect(423);
    expect(blocked.body.code).toBe(ErrorCodes.SESSION_LOCKED);
  });

  test("invalid fts query should return validation error instead of 500", async () => {
    await request(app).post("/api/auth/setup-password").send({ password: "password123" }).expect(201);
    const login = await request(app).post("/api/auth/login").send({ password: "password123" }).expect(200);
    const accessToken = login.body.accessToken as string;

    const badSearch = await request(app).get("/api/search/items").set(authHeader(accessToken)).query({ q: "-" }).expect(400);
    expect(badSearch.body.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  test("should support folder listing and cover management endpoints", async () => {
    await request(app).post("/api/auth/setup-password").send({ password: "password123" }).expect(201);
    const login = await request(app).post("/api/auth/login").send({ password: "password123" }).expect(200);
    const accessToken = login.body.accessToken as string;

    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-folder-api-"));
    const folderA = path.join(tempRoot, "A");
    const nested = path.join(folderA, "B");
    await fs.mkdir(nested, { recursive: true });
    await fs.writeFile(path.join(folderA, "cover-a.jpg"), Buffer.from("image-a"));
    await fs.writeFile(path.join(nested, "cover-b.png"), Buffer.from("image-b"));

    const rootRes = await request(app)
      .post("/api/library/roots")
      .set(authHeader(accessToken))
      .send({ name: "folder-root", path: tempRoot })
      .expect(201);
    const rootId = rootRes.body.id as string;

    const scan = await request(app).post("/api/scan/full").set(authHeader(accessToken)).expect(202);
    await waitTask(app, accessToken, scan.body.taskId);

    const unauthorized = await request(app).get(`/api/library/roots/${rootId}/folders`).expect(401);
    expect(unauthorized.body.code).toBe(ErrorCodes.UNAUTHORIZED);

    const listed = await request(app)
      .get(`/api/library/roots/${rootId}/folders`)
      .set(authHeader(accessToken))
      .query({ parentRelPath: "" })
      .expect(200);
    expect(listed.body.total).toBeGreaterThanOrEqual(1);
    expect(listed.body.items[0].name).toBe("A");

    const browser = await request(app)
      .get(`/api/library/roots/${rootId}/folders/cover-browser`)
      .set(authHeader(accessToken))
      .query({ relPath: "A", sortBy: "name", order: "asc", foldersFirst: true })
      .expect(200);
    expect(browser.body.items.some((item: any) => item.kind === "folder" && item.name === "B")).toBe(true);
    expect(browser.body.items.some((item: any) => item.kind === "image")).toBe(true);

    const candidates = await request(app)
      .get(`/api/library/roots/${rootId}/folders/cover-candidates`)
      .set(authHeader(accessToken))
      .query({ relPath: "A" })
      .expect(200);
    expect(candidates.body.total).toBeGreaterThanOrEqual(1);
    const firstImageId = candidates.body.items[0].id as string;

    const noneCover = await request(app)
      .put(`/api/library/roots/${rootId}/folders/cover`)
      .set(authHeader(accessToken))
      .send({ relPath: "A", mode: "none" })
      .expect(200);
    expect(noneCover.body.mode).toBe("none");
    expect(noneCover.body.url).toBeNull();

    const itemCover = await request(app)
      .put(`/api/library/roots/${rootId}/folders/cover`)
      .set(authHeader(accessToken))
      .send({ relPath: "A", mode: "manual_item", itemId: firstImageId })
      .expect(200);
    expect(itemCover.body.mode).toBe("manual_item");
    expect(itemCover.body.url).toContain("/api/items/");

    await request(app)
      .post(`/api/library/roots/${rootId}/folders/cover/upload`)
      .set(authHeader(accessToken))
      .field("relPath", "A")
      .attach("file", Buffer.from("fake-png"), "cover.png")
      .expect(200);

    const uploaded = await request(app)
      .get(`/api/library/roots/${rootId}/folders/cover/uploaded`)
      .set(authHeader(accessToken))
      .query({ relPath: "A" })
      .expect(200);
    expect(uploaded.header["content-type"]).toContain("image/png");
  });

  test("should support explorer entries and external open endpoints", async () => {
    const openItemSpy = jest.spyOn(systemOpenService, "openItem").mockResolvedValue({ ok: true, openedWith: "system" });
    const openPathSpy = jest.spyOn(systemOpenService, "openPath").mockResolvedValue({ ok: true, openedWith: "system" });
    try {
      await request(app).post("/api/auth/setup-password").send({ password: "password123" }).expect(201);
      const login = await request(app).post("/api/auth/login").send({ password: "password123" }).expect(200);
      const accessToken = login.body.accessToken as string;

      const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-explorer-api-"));
      await fs.mkdir(path.join(tempRoot, "FolderA"), { recursive: true });
      await fs.writeFile(path.join(tempRoot, "cover.jpg"), Buffer.from("img"));

      const rootRes = await request(app)
        .post("/api/library/roots")
        .set(authHeader(accessToken))
        .send({ name: "explorer-root", path: tempRoot })
        .expect(201);
      const rootId = rootRes.body.id as string;

      const scan = await request(app).post("/api/scan/full").set(authHeader(accessToken)).expect(202);
      await waitTask(app, accessToken, scan.body.taskId);

      const unauth = await request(app).get(`/api/library/roots/${rootId}/entries`).expect(401);
      expect(unauth.body.code).toBe(ErrorCodes.UNAUTHORIZED);

      const rootEntries = await request(app).get("/api/library/roots/entries").set(authHeader(accessToken)).expect(200);
      expect(rootEntries.body.items.some((item: any) => item.rootId === rootId)).toBe(true);

      const list = await request(app)
        .get(`/api/library/roots/${rootId}/entries`)
        .set(authHeader(accessToken))
        .query({ relPath: "", sortBy: "name", order: "asc" })
        .expect(200);
      expect(list.body.total).toBeGreaterThanOrEqual(2);
      expect(list.body.items.some((item: any) => item.kind === "folder")).toBe(true);
      expect(list.body.items.some((item: any) => item.kind === "file")).toBe(true);

      const search = await request(app)
        .get("/api/search/items")
        .set(authHeader(accessToken))
        .query({ q: "cover", page: 1, pageSize: 20, sortBy: "relevance", order: "asc" })
        .expect(200);
      const itemId = search.body.items[0].id as string;

      const mixedSearch = await request(app)
        .get("/api/search/entries")
        .set(authHeader(accessToken))
        .query({ q: "cover", page: 1, pageSize: 20, sortBy: "relevance", order: "asc" })
        .expect(200);
      expect(mixedSearch.body.items.length).toBeGreaterThanOrEqual(1);

      const itemOpen = await request(app).post(`/api/items/${itemId}/open`).set(authHeader(accessToken)).expect(200);
      expect(itemOpen.body.openedWith).toBe("system");
      expect(openItemSpy).toHaveBeenCalled();

      await request(app).post(`/api/history/items/${itemId}/view`).set(authHeader(accessToken)).expect(200);
      const filteredHistory = await request(app)
        .get("/api/history/items")
        .set(authHeader(accessToken))
        .query({ rootId })
        .expect(200);
      expect(filteredHistory.body.total).toBeGreaterThanOrEqual(1);

      const entryOpen = await request(app)
        .post(`/api/library/roots/${rootId}/entries/open`)
        .set(authHeader(accessToken))
        .send({ relPath: "cover.jpg" })
        .expect(200);
      expect(entryOpen.body.openedWith).toBe("system");
      expect(openPathSpy).toHaveBeenCalled();
    } finally {
      openItemSpy.mockRestore();
      openPathSpy.mockRestore();
    }
  });
});
