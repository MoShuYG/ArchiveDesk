import fs from "fs/promises";
import path from "path";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { itemModel } from "../../models/itemModel";
import { libraryModel } from "../../models/libraryModel";
import { FolderCoverMode, folderCoverStore } from "../../services/folderCoverStore";

export type FolderCoverInfo = {
  mode: FolderCoverMode;
  url: string | null;
};

export type FolderNode = {
  rootId: string;
  relPath: string;
  name: string;
  depth: number;
  hasChildren: boolean;
  cover: FolderCoverInfo;
};

export type FolderCoverCandidate = {
  id: string;
  title: string;
  path: string;
  updatedAt: number;
  size: number;
  thumbnailUrl: string;
};

export type CoverBrowserSortBy = "name" | "updatedAt" | "size";
export type CoverBrowserOrder = "asc" | "desc";

export type CoverBrowserEntry = {
  kind: "folder" | "image";
  rootId: string;
  relPath: string;
  name: string;
  updatedAt: number;
  size?: number;
  hasChildren?: boolean;
  itemId?: string;
  thumbnailUrl?: string;
};

const ALLOWED_UPLOAD_MIME = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "avif"]);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function sanitizePagination(page: number, pageSize: number): { page: number; pageSize: number } {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 500) : 100;
  return {
    page: safePage,
    pageSize: safeSize
  };
}

function normalizeRelPath(input: string | undefined): string {
  if (!input || input.trim().length === 0 || input.trim() === ".") {
    return "";
  }
  if (path.isAbsolute(input)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Folder relative path must not be absolute.");
  }
  const segments = input
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.some((segment) => segment === "..")) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Folder relative path contains invalid segments.");
  }
  return segments.join("/");
}

function normalizeComparablePath(targetPath: string): string {
  const normalized = path.resolve(targetPath);
  if (process.platform === "win32") {
    return normalized.toLowerCase();
  }
  return normalized;
}

function getParentRelPath(relPath: string): string {
  if (!relPath) {
    return "";
  }
  const index = relPath.lastIndexOf("/");
  return index === -1 ? "" : relPath.slice(0, index);
}

function resolvePathWithinRoot(rootPath: string, relPath: string): string {
  const normalizedRoot = path.resolve(rootPath);
  const osRelativePath = relPath ? relPath.split("/").join(path.sep) : ".";
  const absolutePath = path.resolve(normalizedRoot, osRelativePath);
  const rootComparable = normalizeComparablePath(normalizedRoot);
  const absoluteComparable = normalizeComparablePath(absolutePath);
  if (absoluteComparable !== rootComparable && !absoluteComparable.startsWith(`${rootComparable}${path.sep}`)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Folder path escapes root directory.");
  }
  return absolutePath;
}

function ensureSubtreePrefix(folderAbsolutePath: string): string {
  const normalized = path.resolve(folderAbsolutePath);
  return normalized.endsWith(path.sep) ? normalized : `${normalized}${path.sep}`;
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

function findRootOrThrow(rootId: string) {
  const root = libraryModel.getRootById(rootId);
  if (!root) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Root not found.");
  }
  return root;
}

async function resolveFolderCover(rootId: string, folderAbsolutePath: string, relPath: string): Promise<FolderCoverInfo> {
  const entry = await folderCoverStore.getEntry(rootId, relPath);

  if (entry?.mode === "none") {
    return { mode: "none", url: null };
  }
  if (entry?.mode === "manual_upload") {
    const coverUrl = buildUploadedCoverUrl(rootId, relPath);
    return { mode: "manual_upload", url: coverUrl };
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
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => IMAGE_EXT.has(path.extname(name).replace(".", "").toLowerCase()))
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

function ensureItemInFolderSubtree(rootId: string, folderPrefixPath: string, itemId: string): void {
  const item = itemModel.getItemById(itemId);
  if (!item || item.deleted || item.type !== "image" || item.rootId !== rootId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Selected item cannot be used as a cover.");
  }
  const folderComparable = normalizeComparablePath(folderPrefixPath);
  const itemComparable = normalizeComparablePath(item.path);
  if (!itemComparable.startsWith(folderComparable)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Selected item is outside the folder subtree.");
  }
}

export const folderService = {
  async listFolders(input: {
    rootId: string;
    parentRelPath?: string;
    page: number;
    pageSize: number;
  }): Promise<{ page: number; pageSize: number; total: number; items: FolderNode[] }> {
    const root = findRootOrThrow(input.rootId);
    const parentRelPath = normalizeRelPath(input.parentRelPath);
    const { page, pageSize } = sanitizePagination(input.page, input.pageSize);
    const parentAbsolutePath = resolvePathWithinRoot(root.path, parentRelPath);
    await ensureDirectoryExists(parentAbsolutePath);

    const entries = await fs.readdir(parentAbsolutePath, { withFileTypes: true });
    const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
    const total = dirs.length;
    const offset = (page - 1) * pageSize;
    const selected = dirs.slice(offset, offset + pageSize);

    const items: FolderNode[] = [];
    for (const name of selected) {
      const relPath = parentRelPath ? `${parentRelPath}/${name}` : name;
      const absolutePath = path.join(parentAbsolutePath, name);
      const hasChildren = await detectHasChildren(absolutePath);
      const cover = await resolveFolderCover(root.id, absolutePath, relPath);
      items.push({
        rootId: root.id,
        relPath,
        name,
        depth: relPath.split("/").length,
        hasChildren,
        cover
      });
    }

    return {
      page,
      pageSize,
      total,
      items
    };
  },

  async listCoverCandidates(input: {
    rootId: string;
    relPath: string;
    page: number;
    pageSize: number;
  }): Promise<{ page: number; pageSize: number; total: number; items: FolderCoverCandidate[] }> {
    const root = findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const folderAbsolutePath = resolvePathWithinRoot(root.path, relPath);
    await ensureDirectoryExists(folderAbsolutePath);
    const subtreePrefix = ensureSubtreePrefix(folderAbsolutePath);
    const { page, pageSize } = sanitizePagination(input.page, input.pageSize);

    const result = itemModel.listImageByRootAndPrefix({
      rootId: root.id,
      absolutePrefixPath: subtreePrefix,
      page,
      pageSize
    });

    return {
      page,
      pageSize,
      total: result.total,
      items: result.rows.map((item) => ({
        id: item.id,
        title: item.title,
        path: item.path,
        size: item.size,
        updatedAt: item.updatedAt,
        thumbnailUrl: buildItemCoverUrl(item.id)
      }))
    };
  },

  async listCoverBrowser(input: {
    rootId: string;
    relPath: string;
    page: number;
    pageSize: number;
    sortBy: CoverBrowserSortBy;
    order: CoverBrowserOrder;
    foldersFirst: boolean;
  }): Promise<{ page: number; pageSize: number; total: number; items: CoverBrowserEntry[] }> {
    const root = findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const currentAbsolutePath = resolvePathWithinRoot(root.path, relPath);
    await ensureDirectoryExists(currentAbsolutePath);
    const { page, pageSize } = sanitizePagination(input.page, input.pageSize);
    const direction = input.order === "asc" ? 1 : -1;
    const rawEntries = await fs.readdir(currentAbsolutePath, { withFileTypes: true });

    const folderEntries = rawEntries.filter((entry) => entry.isDirectory());
    const fileEntries = rawEntries.filter((entry) => entry.isFile());
    const fileAbsolutePaths = fileEntries.map((entry) => path.join(currentAbsolutePath, entry.name));
    const itemByPath = itemModel.listItemsByPaths(fileAbsolutePaths);

    const mappedFolders = await Promise.all(
      folderEntries.map(async (entry) => {
        const folderRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;
        const folderAbsolutePath = path.join(currentAbsolutePath, entry.name);
        const stat = await fs.stat(folderAbsolutePath);
        return {
          kind: "folder" as const,
          rootId: root.id,
          relPath: folderRelPath,
          name: entry.name,
          updatedAt: stat.mtimeMs,
          hasChildren: await detectHasChildren(folderAbsolutePath)
        };
      })
    );

    const mappedImages = await Promise.all(
      fileEntries.map(async (entry) => {
        const ext = path.extname(entry.name).replace(".", "").toLowerCase();
        if (!IMAGE_EXT.has(ext)) {
          return null;
        }
        const absPath = path.join(currentAbsolutePath, entry.name);
        const item = itemByPath.get(path.resolve(absPath));
        if (!item || item.type !== "image" || item.deleted) {
          return null;
        }
        const stat = await fs.stat(absPath);
        const fileRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;
        return {
          kind: "image" as const,
          rootId: root.id,
          relPath: fileRelPath,
          name: entry.name,
          updatedAt: stat.mtimeMs,
          size: stat.size,
          itemId: item.id,
          thumbnailUrl: buildItemCoverUrl(item.id)
        };
      })
    );

    const allItems: CoverBrowserEntry[] = [...mappedFolders, ...mappedImages.filter(Boolean) as CoverBrowserEntry[]];
    allItems.sort((a, b) => {
      if (input.foldersFirst && a.kind !== b.kind) {
        return a.kind === "folder" ? -1 : 1;
      }
      let cmp = 0;
      if (input.sortBy === "updatedAt") {
        cmp = (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
      } else if (input.sortBy === "size") {
        cmp = (a.size ?? 0) - (b.size ?? 0);
      } else {
        cmp = collator.compare(a.name, b.name);
      }
      if (cmp !== 0) {
        return cmp * direction;
      }
      return collator.compare(a.name, b.name) * direction;
    });

    const total = allItems.length;
    const offset = (page - 1) * pageSize;
    return {
      page,
      pageSize,
      total,
      items: allItems.slice(offset, offset + pageSize)
    };
  },

  async setFolderCover(input: {
    rootId: string;
    relPath: string;
    mode: "auto" | "none" | "manual_item";
    itemId?: string;
  }): Promise<FolderCoverInfo> {
    const root = findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const folderAbsolutePath = resolvePathWithinRoot(root.path, relPath);
    await ensureDirectoryExists(folderAbsolutePath);

    if (input.mode === "manual_item") {
      if (!input.itemId) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "itemId is required for manual_item cover.");
      }
      ensureItemInFolderSubtree(root.id, ensureSubtreePrefix(folderAbsolutePath), input.itemId);
      await folderCoverStore.upsertEntry({
        rootId: root.id,
        relPath,
        mode: "manual_item",
        itemId: input.itemId
      });
    } else if (input.mode === "none") {
      await folderCoverStore.upsertEntry({
        rootId: root.id,
        relPath,
        mode: "none"
      });
    } else {
      await folderCoverStore.upsertEntry({
        rootId: root.id,
        relPath,
        mode: "auto"
      });
    }
    return resolveFolderCover(root.id, folderAbsolutePath, relPath);
  },

  async uploadFolderCover(input: {
    rootId: string;
    relPath: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<FolderCoverInfo> {
    const root = findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const folderAbsolutePath = resolvePathWithinRoot(root.path, relPath);
    await ensureDirectoryExists(folderAbsolutePath);

    const extension = ALLOWED_UPLOAD_MIME.get(input.mimeType.toLowerCase());
    if (!extension) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Unsupported cover mime type.");
    }
    if (input.buffer.length === 0 || input.buffer.length > 5 * 1024 * 1024) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Cover file size is invalid.");
    }

    const previous = await folderCoverStore.getEntry(root.id, relPath);
    const rootDir = await folderCoverStore.ensureUploadRoot(root.id);
    const fileName = await folderCoverStore.createUploadedFileName(extension);
    const filePath = path.join(rootDir, fileName);
    await fs.writeFile(filePath, input.buffer);

    if (previous?.mode === "manual_upload" && previous.uploadedFile && previous.uploadedFile !== fileName) {
      await fs.rm(folderCoverStore.getUploadedFileAbsolutePath(root.id, previous.uploadedFile), { force: true });
    }

    await folderCoverStore.upsertEntry({
      rootId: root.id,
      relPath,
      mode: "manual_upload",
      uploadedFile: fileName
    });
    return resolveFolderCover(root.id, folderAbsolutePath, relPath);
  },

  async getUploadedCover(input: { rootId: string; relPath: string }): Promise<{ filePath: string; contentType: string }> {
    findRootOrThrow(input.rootId);
    const relPath = normalizeRelPath(input.relPath);
    const entry = await folderCoverStore.getEntry(input.rootId, relPath);
    if (!entry || entry.mode !== "manual_upload" || !entry.uploadedFile) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Uploaded cover not found.");
    }
    const filePath = folderCoverStore.getUploadedFileAbsolutePath(input.rootId, entry.uploadedFile);
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Uploaded cover not found.");
    }
    if (!stat.isFile()) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Uploaded cover not found.");
    }

    const ext = path.extname(entry.uploadedFile).replace(".", "").toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";
    return { filePath, contentType };
  },

  async removeRootData(rootId: string): Promise<void> {
    await folderCoverStore.removeRoot(rootId);
  }
};
