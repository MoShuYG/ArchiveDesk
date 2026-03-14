import fs from "fs/promises";
import path from "path";
import type { Request } from "express";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { historyModel } from "../../models/historyModel";
import { itemModel, ItemType } from "../../models/itemModel";
import { libraryModel } from "../../models/libraryModel";
import { folderCoverStore } from "../../services/folderCoverStore";
import { getStreamFileResponseData, type StreamFileResponseData } from "../../services/fileStreamService";
import { classifyItemTypeFromExt, isBrowserPreviewableExtension } from "../../services/fileSupportService";
import { systemOpenService } from "../../services/systemOpenService";

export type ExplorerSortBy = "name" | "type" | "updatedAt" | "size";
export type ExplorerSortOrder = "asc" | "desc";

export type ExplorerEntry = {
  kind: "folder" | "file";
  rootId: string;
  relPath: string;
  name: string;
  ext?: string | null;
  size?: number;
  updatedAt: number;
  hasChildren?: boolean;
  cover?: {
    mode: "auto" | "none" | "manual_item" | "manual_upload";
    url: string | null;
  };
  itemId?: string;
  previewable: boolean;
  type?: ItemType;
};

export type RootEntry = {
  kind: "root";
  rootId: string;
  relPath: "";
  name: string;
  updatedAt: number;
  hasChildren: boolean;
  cover: {
    mode: "auto" | "none" | "manual_item" | "manual_upload";
    url: string | null;
  };
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const COVER_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"]);

function normalizeComparablePath(targetPath: string): string {
  const normalized = path.resolve(targetPath);
  if (process.platform === "win32") {
    return normalized.toLowerCase();
  }
  return normalized;
}

function normalizeRelPath(input: string | undefined): string {
  if (!input || input.trim().length === 0 || input.trim() === ".") {
    return "";
  }
  if (path.isAbsolute(input)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Relative path must not be absolute.");
  }
  const segments = input
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.some((segment) => segment === "..")) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Relative path contains invalid segments.");
  }
  return segments.join("/");
}

function resolvePathWithinRoot(rootPath: string, relPath: string): string {
  const normalizedRoot = path.resolve(rootPath);
  const osRelativePath = relPath ? relPath.split("/").join(path.sep) : ".";
  const absolutePath = path.resolve(normalizedRoot, osRelativePath);
  const rootComparable = normalizeComparablePath(normalizedRoot);
  const absoluteComparable = normalizeComparablePath(absolutePath);
  if (absoluteComparable !== rootComparable && !absoluteComparable.startsWith(`${rootComparable}${path.sep}`)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Path escapes root directory.");
  }
  return absolutePath;
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  let stat;
  try {
    stat = await fs.stat(dirPath);
  } catch {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Folder not found.");
  }
  if (!stat.isDirectory()) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Folder not found.");
  }
}

async function detectHasChildren(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.some((entry) => entry.isDirectory());
  } catch {
    return false;
  }
}

function buildUploadedCoverUrl(rootId: string, relPath: string): string {
  return `/api/library/roots/${encodeURIComponent(rootId)}/folders/cover/uploaded?relPath=${encodeURIComponent(relPath)}`;
}

function buildItemCoverUrl(itemId: string): string {
  return `/api/items/${encodeURIComponent(itemId)}/thumbnail`;
}

function isPreviewableByExt(ext: string | null | undefined): boolean {
  return isBrowserPreviewableExtension(ext);
}

async function resolveFolderCover(rootId: string, folderAbsolutePath: string, relPath: string): Promise<{
  mode: "auto" | "none" | "manual_item" | "manual_upload";
  url: string | null;
}> {
  const entry = await folderCoverStore.getEntry(rootId, relPath);

  if (entry?.mode === "none") {
    return { mode: "none", url: null };
  }
  if (entry?.mode === "manual_upload") {
    return { mode: "manual_upload", url: buildUploadedCoverUrl(rootId, relPath) };
  }
  if (entry?.mode === "manual_item" && entry.itemId) {
    const item = itemModel.getItemById(entry.itemId);
    if (item && !item.deleted && item.type === "image" && item.rootId === rootId) {
      return { mode: "manual_item", url: buildItemCoverUrl(item.id) };
    }
  }

  try {
    const entries = await fs.readdir(folderAbsolutePath, { withFileTypes: true });
    const imageFileNames = entries
      .filter((item) => item.isFile())
      .map((item) => item.name)
      .filter((name) => COVER_IMAGE_EXT.has(path.extname(name).replace(".", "").toLowerCase()))
      .sort((a, b) => collator.compare(a, b));
    for (const fileName of imageFileNames) {
      const absPath = path.join(folderAbsolutePath, fileName);
      const item = itemModel.getItemByPath(absPath);
      if (item && !item.deleted && item.type === "image" && item.rootId === rootId) {
        return { mode: "auto", url: buildItemCoverUrl(item.id) };
      }
    }
  } catch {
    // ignore and fallback to no cover
  }
  return { mode: "auto", url: null };
}

function findRootOrThrow(rootId: string) {
  const root = libraryModel.getRootById(rootId);
  if (!root) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Root not found.");
  }
  return root;
}

function compareEntries(a: ExplorerEntry, b: ExplorerEntry, input: { sortBy: ExplorerSortBy; order: ExplorerSortOrder; foldersFirst: boolean }): number {
  const direction = input.order === "asc" ? 1 : -1;
  if (input.foldersFirst && a.kind !== b.kind) {
    return a.kind === "folder" ? -1 : 1;
  }

  let cmp = 0;
  if (input.sortBy === "name") {
    cmp = collator.compare(a.name, b.name);
  } else if (input.sortBy === "type") {
    const aType = a.kind === "folder" ? "folder" : a.type ?? "other";
    const bType = b.kind === "folder" ? "folder" : b.type ?? "other";
    cmp = collator.compare(aType, bType);
  } else if (input.sortBy === "updatedAt") {
    cmp = (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
  } else if (input.sortBy === "size") {
    cmp = (a.size ?? 0) - (b.size ?? 0);
  }

  if (cmp !== 0) {
    return cmp * direction;
  }
  return collator.compare(a.name, b.name) * direction;
}

function compareRootEntries(a: RootEntry, b: RootEntry, sortBy: "name" | "updatedAt", order: "asc" | "desc"): number {
  const direction = order === "asc" ? 1 : -1;
  let cmp = 0;
  if (sortBy === "updatedAt") {
    cmp = (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
  } else {
    cmp = collator.compare(a.name, b.name);
  }
  if (cmp !== 0) {
    return cmp * direction;
  }
  return collator.compare(a.name, b.name) * direction;
}

export const explorerService = {
  async listRootEntries(input: {
    page: number;
    pageSize: number;
    sortBy: "name" | "updatedAt";
    order: "asc" | "desc";
  }): Promise<{ page: number; pageSize: number; total: number; items: RootEntry[] }> {
    const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
    const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 500) : 100;
    const roots = libraryModel.listRoots();
    const allItems: RootEntry[] = [];

    for (const root of roots) {
      const stat = await fs.stat(root.path);
      const rootEntries = await fs.readdir(root.path, { withFileTypes: true });
      allItems.push({
        kind: "root",
        rootId: root.id,
        relPath: "",
        name: root.name,
        updatedAt: stat.mtimeMs,
        hasChildren: rootEntries.length > 0,
        cover: await resolveFolderCover(root.id, root.path, "")
      });
    }

    allItems.sort((a, b) => compareRootEntries(a, b, input.sortBy, input.order));
    const total = allItems.length;
    const offset = (page - 1) * pageSize;
    const items = allItems.slice(offset, offset + pageSize);
    return { page, pageSize, total, items };
  },

  async listEntries(input: {
    rootId: string;
    relPath?: string;
    page: number;
    pageSize: number;
    sortBy: ExplorerSortBy;
    order: ExplorerSortOrder;
    foldersFirst: boolean;
  }): Promise<{ page: number; pageSize: number; total: number; items: ExplorerEntry[] }> {
    const root = findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
    const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 500) : 100;

    const currentDir = resolvePathWithinRoot(root.path, relPath);
    await ensureDirectoryExists(currentDir);

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const absolutePaths = entries.filter((entry) => entry.isFile()).map((entry) => path.join(currentDir, entry.name));
    const itemByPath = itemModel.listItemsByPaths(absolutePaths);
    const allItems: ExplorerEntry[] = [];

    for (const entry of entries) {
      const childRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        const stat = await fs.stat(absolutePath);
        allItems.push({
          kind: "folder",
          rootId: root.id,
          relPath: childRelPath,
          name: entry.name,
          updatedAt: stat.mtimeMs,
          hasChildren: await detectHasChildren(absolutePath),
          cover: await resolveFolderCover(root.id, absolutePath, childRelPath),
          previewable: false
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).replace(".", "").toLowerCase() || null;
        const stat = await fs.stat(absolutePath);
        const item = itemByPath.get(path.resolve(absolutePath));
        allItems.push({
          kind: "file",
          rootId: root.id,
          relPath: childRelPath,
          name: entry.name,
          ext,
          size: stat.size,
          updatedAt: stat.mtimeMs,
          itemId: item?.id,
          previewable: isPreviewableByExt(ext),
          type: item?.type ?? classifyItemTypeFromExt(ext)
        });
      }
    }

    allItems.sort((a, b) => compareEntries(a, b, input));
    const total = allItems.length;
    const offset = (page - 1) * pageSize;
    const items = allItems.slice(offset, offset + pageSize);
    return { page, pageSize, total, items };
  },

  async openEntry(input: { rootId: string; relPath: string }): Promise<{ ok: true }> {
    const root = findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const absolutePath = resolvePathWithinRoot(root.path, relPath);
    const result = await systemOpenService.openPath(absolutePath);
    const item = itemModel.getItemByPath(absolutePath);
    if (item && !item.deleted) {
      historyModel.recordView(item.id);
    }
    return result;
  },

  async getEntryFileResponseData(
    input: { rootId: string; relPath: string },
    req: Request
  ): Promise<StreamFileResponseData> {
    const root = findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const absolutePath = resolvePathWithinRoot(root.path, relPath);
    return getStreamFileResponseData(absolutePath, req, {
      displayName: path.basename(absolutePath),
      allowedExtensions: new Set([
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "bmp",
        "pdf",
        "txt",
        "md",
        "json",
        "csv",
        "mp3",
        "mp4",
        "webm",
        "wav",
        "flac",
        "ogg",
        "avif",
        "m4a",
        "aac"
      ]),
      unsupportedMessage: "当前文件类型暂不支持浏览器预览。",
      notFoundMessage: "未找到可预览文件。"
    });
  }
};
