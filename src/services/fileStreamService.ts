import type { Stats } from "fs";
import fs from "fs/promises";
import path from "path";
import type { Request } from "express";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";
import { detectMimeTypeFromExt, getExtensionFromPath, normalizeExtension } from "./fileSupportService";

export type StreamFileResponseData = {
  filePath: string;
  stat: Stats;
  mimeType: string;
  range: { start: number; end: number } | null;
  ext: string | null;
  displayName: string;
};

function getRangeBounds(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }
  const startText = match[1];
  const endText = match[2];
  let start: number;
  let end: number;

  if (startText === "" && endText === "") {
    return null;
  }
  if (startText === "") {
    const suffix = Number(endText);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return null;
    }
    start = Math.max(fileSize - suffix, 0);
    end = fileSize - 1;
    return { start, end };
  }

  start = Number(startText);
  if (!Number.isFinite(start) || start < 0 || start >= fileSize) {
    return null;
  }

  if (endText === "") {
    end = fileSize - 1;
  } else {
    end = Number(endText);
    if (!Number.isFinite(end) || end < start) {
      return null;
    }
  }

  end = Math.min(end, fileSize - 1);
  return { start, end };
}

export function buildInlineContentDisposition(fileName: string): string {
  const fallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[\r\n"%;\\]/g, "_")
    .trim() || "download";
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function ensureRegularFile(
  filePath: string,
  messages?: { notFound?: string; invalidType?: string }
): Promise<{ absolutePath: string; stat: Stats }> {
  const absolutePath = path.resolve(filePath);
  let stat: Stats;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    throw new AppError(404, ErrorCodes.ITEM_NOT_FOUND, messages?.notFound ?? "Target file not found.");
  }
  if (!stat.isFile()) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, messages?.invalidType ?? "Target path is not a file.");
  }
  return { absolutePath, stat };
}

export async function getStreamFileResponseData(
  filePath: string,
  req: Request,
  options?: {
    displayName?: string;
    ext?: string | null;
    allowedExtensions?: Set<string>;
    unsupportedMessage?: string;
    notFoundMessage?: string;
    invalidTypeMessage?: string;
  }
): Promise<StreamFileResponseData> {
  const { absolutePath, stat } = await ensureRegularFile(filePath, {
    notFound: options?.notFoundMessage,
    invalidType: options?.invalidTypeMessage
  });
  const ext = normalizeExtension(options?.ext ?? getExtensionFromPath(absolutePath));
  if (options?.allowedExtensions && (!ext || !options.allowedExtensions.has(ext))) {
    throw new AppError(415, ErrorCodes.VALIDATION_ERROR, options.unsupportedMessage ?? "This file type is not supported.");
  }

  const rangeHeader = req.header("range");
  const range = rangeHeader ? getRangeBounds(rangeHeader, stat.size) : null;
  if (rangeHeader && !range) {
    throw new AppError(416, ErrorCodes.VALIDATION_ERROR, "Invalid Range header.");
  }

  return {
    filePath: absolutePath,
    stat,
    mimeType: detectMimeTypeFromExt(ext),
    range,
    ext,
    displayName: options?.displayName ?? path.basename(absolutePath)
  };
}
