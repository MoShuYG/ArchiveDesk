import { resolvePreviewNavigation } from "../../frontend/src/utils/previewNavigation";

type Entry = {
  kind: "file" | "folder";
  id: string;
  type?: "image" | "audio" | "other";
  ext?: string;
  previewable?: boolean;
};

describe("preview navigation", () => {
  test("keeps every file type in one sequence while skipping folders", () => {
    const entries: Entry[] = [
      { kind: "folder", id: "folder" },
      { kind: "file", id: "cover", type: "image", ext: "jpg", previewable: true },
      { kind: "file", id: "notes", type: "other", ext: "txt", previewable: true },
      { kind: "file", id: "archive", type: "other", ext: "zip", previewable: false },
      { kind: "file", id: "music", type: "audio", ext: "mp3", previewable: true },
    ];

    const navigation = resolvePreviewNavigation(entries, "notes", {
      getKey: (entry) => entry.id,
      isCandidate: (entry) => entry.kind === "file",
    });

    expect(navigation).toEqual({
      previous: entries[1],
      next: entries[3],
      position: 2,
      total: 4,
    });
  });

  test("disables only the unavailable direction at sequence boundaries", () => {
    const entries: Entry[] = [
      { kind: "file", id: "first", ext: "txt" },
      { kind: "file", id: "last", ext: "pdf" },
    ];

    expect(
      resolvePreviewNavigation(entries, "first", {
        getKey: (entry) => entry.id,
        isCandidate: (entry) => entry.kind === "file",
      }),
    ).toEqual({ previous: null, next: entries[1], position: 1, total: 2 });

    expect(
      resolvePreviewNavigation(entries, "last", {
        getKey: (entry) => entry.id,
        isCandidate: (entry) => entry.kind === "file",
      }),
    ).toEqual({ previous: entries[0], next: null, position: 2, total: 2 });
  });
});
