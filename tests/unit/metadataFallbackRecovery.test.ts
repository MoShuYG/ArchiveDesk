import fs from "fs/promises";
import os from "os";
import path from "path";

jest.mock(
  "sharp",
  () =>
    jest.fn(() => ({
      metadata: jest.fn().mockRejectedValue(new Error("unsupported image"))
    })),
  { virtual: true }
);

import { extractMetadata } from "../../src/services/metadata/metadataService";

describe("image metadata fallback", () => {
  test("should not warn when fallback recovers image dimensions", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lsm-image-recovery-"));
    const imagePath = path.join(tempRoot, "recoverable.jpg");
    const jpegHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x20, 0x03, 0x01, 0x11, 0x00,
      0x02, 0x11, 0x00, 0x03, 0x11, 0x00
    ]);
    await fs.writeFile(imagePath, jpegHeader);

    try {
      const result = await extractMetadata(imagePath, "image");

      expect(result.metadata).toEqual({ width: 32, height: 16, format: "jpeg" });
      expect(result.warnings).toEqual([]);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
