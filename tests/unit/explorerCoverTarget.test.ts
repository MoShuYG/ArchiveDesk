import { createExplorerCoverTarget } from "../../frontend/src/utils/explorerCoverTarget";
import type { ExplorerEntry, RootEntry } from "../../frontend/src/types/api";

describe("explorer cover management target", () => {
  test("allows a root card to open cover management", () => {
    const root: RootEntry = {
      kind: "root",
      rootId: "root-1",
      relPath: "",
      name: "Long root title",
      updatedAt: 1,
      hasChildren: true,
      cover: { mode: "auto", url: null },
    };

    expect(createExplorerCoverTarget(root)).toEqual({
      rootId: "root-1",
      relPath: "",
      name: "Long root title",
      cover: { mode: "auto", url: null },
    });
  });

  test("allows a folder card to open cover management", () => {
    const folder: ExplorerEntry = {
      kind: "folder",
      rootId: "root-1",
      relPath: "nested-folder",
      name: "Nested folder",
      updatedAt: 1,
      previewable: false,
      cover: { mode: "manual_item", url: "/cover" },
    };

    expect(createExplorerCoverTarget(folder)).toEqual({
      rootId: "root-1",
      relPath: "nested-folder",
      name: "Nested folder",
      cover: { mode: "manual_item", url: "/cover" },
    });
  });

  test("does not offer folder cover management for files", () => {
    const file: ExplorerEntry = {
      kind: "file",
      rootId: "root-1",
      relPath: "image.png",
      name: "image.png",
      updatedAt: 1,
      previewable: true,
      type: "image",
    };

    expect(createExplorerCoverTarget(file)).toBeNull();
  });
});
