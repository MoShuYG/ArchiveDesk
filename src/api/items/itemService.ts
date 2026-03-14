import fs from "fs";
import { spawn } from "child_process";
import type { Request } from "express";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { historyModel } from "../../models/historyModel";
import { itemModel, type ItemRecord } from "../../models/itemModel";
import { ensureRegularFile, getStreamFileResponseData } from "../../services/fileStreamService";
import { systemOpenService } from "../../services/systemOpenService";

const THUMB_CACHE_TTL_MS = 5 * 60 * 1000;
const THUMB_CACHE_MAX = 300;
const thumbCache = new Map<string, { buffer: Buffer; contentType: string; expireAt: number }>();

function getThumbCacheKey(item: ItemRecord): string {
  return `${item.id}:${item.updatedAt}:${item.lastScannedAt}`;
}

function setCachedThumbnail(key: string, value: { buffer: Buffer; contentType: string }): void {
  const now = Date.now();
  if (thumbCache.size >= THUMB_CACHE_MAX) {
    // Prune expired first, then drop oldest.
    for (const [k, v] of thumbCache.entries()) {
      if (v.expireAt <= now) {
        thumbCache.delete(k);
      }
    }
    if (thumbCache.size >= THUMB_CACHE_MAX) {
      const firstKey = thumbCache.keys().next().value;
      if (firstKey) {
        thumbCache.delete(firstKey);
      }
    }
  }
  thumbCache.set(key, {
    ...value,
    expireAt: now + THUMB_CACHE_TTL_MS
  });
}

function getCachedThumbnail(key: string): { buffer: Buffer; contentType: string } | null {
  const cached = thumbCache.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expireAt <= Date.now()) {
    thumbCache.delete(key);
    return null;
  }
  return {
    buffer: cached.buffer,
    contentType: cached.contentType
  };
}

async function buildThumbnail(item: ItemRecord): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cacheKey = getThumbCacheKey(item);
  const cached = getCachedThumbnail(cacheKey);
  if (cached) {
    return cached;
  }

  if (item.type === "image") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require("sharp");
      const buffer = await sharp(item.path).resize(360, 360, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      const output = { buffer, contentType: "image/jpeg" as const };
      setCachedThumbnail(cacheKey, output);
      return output;
    } catch {
      return null;
    }
  }

  if (item.type !== "video") {
    return null;
  }

  const probes = ["00:00:01.000", "00:00:00.000"];
  for (const timestamp of probes) {
    const frame = await extractVideoFrame(item.path, timestamp);
    if (frame) {
      const output = {
        buffer: frame,
        contentType: "image/jpeg" as const
      };
      setCachedThumbnail(cacheKey, output);
      return output;
    }
  }

  return null;
}

async function extractVideoFrame(filePath: string, timestamp: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const args = [
      "-v",
      "error",
      "-ss",
      timestamp,
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-vf",
      "scale='min(360,iw)':-1:force_original_aspect_ratio=decrease",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1"
    ];
    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true
    });
    const chunks: Buffer[] = [];
    let total = 0;
    const maxBytes = 10 * 1024 * 1024;
    let settled = false;
    const finish = (value: Buffer | null): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, 8000);

    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        clearTimeout(timeout);
        child.kill("SIGKILL");
        finish(null);
        return;
      }
      chunks.push(chunk);
    });

    child.once("error", () => {
      clearTimeout(timeout);
      finish(null);
    });

    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 || chunks.length === 0) {
        finish(null);
        return;
      }
      finish(Buffer.concat(chunks));
    });
  });
}

export const itemService = {
  getItemById(itemId: string): ItemRecord {
    const item = itemModel.getItemById(itemId);
    if (!item || item.deleted) {
      throw new AppError(404, ErrorCodes.ITEM_NOT_FOUND, "Item not found.");
    }
    return item;
  },

  async getFileResponseData(itemId: string, req: Request): Promise<{
    item: ItemRecord;
    stat: fs.Stats;
    mimeType: string;
    range: { start: number; end: number } | null;
  }> {
    const item = this.getItemById(itemId);
    const file = await getStreamFileResponseData(item.path, req, {
      displayName: `${item.title}${item.ext ? `.${item.ext}` : ""}`,
      ext: item.ext,
      notFoundMessage: "Item file not found on disk."
    });
    return { item, stat: file.stat, mimeType: file.mimeType, range: file.range };
  },

  async getThumbnailDataByItem(item: ItemRecord): Promise<{ buffer: Buffer; contentType: string } | null> {
    const { stat } = await ensureRegularFile(item.path, {
      notFound: "Item file not found on disk.",
      invalidType: "Item path is not a file."
    });
    if (!stat.isFile()) {
      throw new AppError(404, ErrorCodes.ITEM_NOT_FOUND, "Item path is not a file.");
    }
    return buildThumbnail(item);
  },

  async getThumbnailData(itemId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const item = this.getItemById(itemId);
    return this.getThumbnailDataByItem(item);
  },

  async openItemExternally(itemId: string): Promise<{ ok: true; openedWith: "quickviewer" | "system" }> {
    const item = this.getItemById(itemId);
    const result = await systemOpenService.openItem(item);
    historyModel.recordView(item.id);
    return result;
  }
};
