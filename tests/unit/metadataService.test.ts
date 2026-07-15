import { spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

jest.mock("child_process", () => ({
  spawnSync: jest.fn(() => ({ error: new Error("ffprobe unavailable") }))
}));

jest.mock(
  "sharp",
  () =>
    jest.fn(() => ({
      metadata: jest.fn().mockRejectedValue(new Error("unsupported image"))
    })),
  { virtual: true }
);

import { extractMetadata } from "../../src/services/metadata/metadataService";

describe("metadata service", () => {
  test("should bound the time spent probing a single media file", async () => {
    const spawnSyncMock = jest.mocked(spawnSync);
    spawnSyncMock.mockClear();

    await extractMetadata("missing-video.mp4", "video");

    const [command] = spawnSyncMock.mock.calls[0];
    const [, args] = spawnSyncMock.mock.calls[0];
    expect(command).not.toBe("ffprobe");
    expect(path.isAbsolute(command as string)).toBe(true);
    expect(path.basename(command as string).toLowerCase()).toMatch(/^ffprobe(?:\.exe)?$/);
    expect(args).toEqual(
      expect.arrayContaining([
        "-show_entries",
        "format=duration,bit_rate,format_name:stream=codec_type,codec_name,duration,bit_rate,width,height,avg_frame_rate,sample_rate,channels"
      ])
    );
    expect(spawnSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ timeout: 10_000, maxBuffer: 4 * 1024 * 1024 })
    );
  });

  test("should distinguish a single image parse failure from Sharp being unavailable", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-image-metadata-"));
    const imagePath = path.join(tempRoot, "broken.jpg");
    await fs.writeFile(imagePath, "not an image");

    try {
      const result = await extractMetadata(imagePath, "image");

      expect(result.metadata).toEqual({});
      expect(result.warnings).toEqual(["部分图片无法解析，已跳过其详细元数据。"]);
      expect(result.warnings.join(" ")).not.toContain("Sharp 不可用");
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("should avoid reading the entire image when metadata extraction falls back", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-image-header-"));
    const imagePath = path.join(tempRoot, "broken.jpg");
    await fs.writeFile(imagePath, Buffer.alloc(1024 * 1024, 0));
    const readFileSpy = jest.spyOn(fs, "readFile");

    try {
      await extractMetadata(imagePath, "image");
      expect(readFileSpy).not.toHaveBeenCalled();
    } finally {
      readFileSpy.mockRestore();
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
