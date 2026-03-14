import fs from "fs/promises";
import path from "path";
import { itemModel, type ItemType, type SearchItemRecord, type SearchSortBy, type SortOrder } from "../../models/itemModel";
import { libraryModel } from "../../models/libraryModel";
import { isBrowserPreviewableExtension } from "../../services/fileSupportService";

type FolderSearchEntry = {
  kind: "folder";
  rootId: string;
  relPath: string;
  name: string;
  updatedAt: number;
  hasChildren: boolean;
  previewable: false;
  score: number;
};

type FileSearchEntry = {
  kind: "file";
  rootId: string;
  relPath: string;
  name: string;
  updatedAt: number;
  size: number;
  ext: string | null;
  type: ItemType;
  itemId: string;
  previewable: boolean;
  score: number;
};

export type SearchEntry = FolderSearchEntry | FileSearchEntry;

type FolderIndexItem = {
  relPath: string;
  name: string;
  updatedAt: number;
  hasChildren: boolean;
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const folderIndexCache = new Map<string, { builtAt: number; items: FolderIndexItem[] }>();
const FOLDER_INDEX_TTL_MS = 60_000;

function isPreviewable(ext: string | null): boolean {
  return isBrowserPreviewableExtension(ext);
}

function getFileName(filePath: string): string {
  return path.basename(filePath);
}

function getRelPath(rootPath: string, absolutePath: string): string {
  return path.relative(rootPath, absolutePath).replace(/\\/g, "/");
}

function normalizeSearchSortBy(hasQuery: boolean, sortBy?: SearchSortBy): SearchSortBy {
  const resolved = sortBy ?? (hasQuery ? "relevance" : "updatedAt");
  if (!hasQuery && resolved === "relevance") {
    return "updatedAt";
  }
  return resolved;
}

function normalizeSearchOrder(sortBy: SearchSortBy, order?: SortOrder): SortOrder {
  return order ?? (sortBy === "relevance" ? "asc" : "desc");
}

async function walkDirectories(rootPath: string, parentRelPath: string, output: FolderIndexItem[]): Promise<void> {
  const currentPath = parentRelPath ? path.join(rootPath, ...parentRelPath.split("/")) : rootPath;
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory());

  for (const folder of folders) {
    const relPath = parentRelPath ? `${parentRelPath}/${folder.name}` : folder.name;
    const folderAbsolutePath = path.join(currentPath, folder.name);
    const stat = await fs.stat(folderAbsolutePath);
    const children = await fs.readdir(folderAbsolutePath, { withFileTypes: true });
    output.push({
      relPath,
      name: folder.name,
      updatedAt: stat.mtimeMs,
      hasChildren: children.some((child) => child.isDirectory() || child.isFile())
    });
    await walkDirectories(rootPath, relPath, output);
  }
}

async function getFolderIndex(rootId: string, rootPath: string): Promise<FolderIndexItem[]> {
  const cached = folderIndexCache.get(rootId);
  if (cached && Date.now() - cached.builtAt < FOLDER_INDEX_TTL_MS) {
    return cached.items;
  }
  const items: FolderIndexItem[] = [];
  await walkDirectories(rootPath, "", items);
  folderIndexCache.set(rootId, { builtAt: Date.now(), items });
  return items;
}

async function fetchAllMatchedFiles(input: {
  q?: string;
  type?: ItemType;
  rootId?: string;
  tag?: string;
  sortBy: SearchSortBy;
  order: SortOrder;
}): Promise<{ total: number; rows: SearchItemRecord[] }> {
  const first = itemModel.searchWithScore({
    query: input.q,
    page: 1,
    pageSize: 1,
    type: input.type,
    rootId: input.rootId,
    tag: input.tag,
    sortBy: input.sortBy,
    order: input.order
  });

  if (first.total === 0) {
    return { total: 0, rows: [] };
  }

  const chunkSize = 3000;
  const rows: SearchItemRecord[] = [];
  const pageCount = Math.ceil(first.total / chunkSize);
  for (let page = 1; page <= pageCount; page += 1) {
    const chunk = itemModel.searchWithScore({
      query: input.q,
      page,
      pageSize: chunkSize,
      type: input.type,
      rootId: input.rootId,
      tag: input.tag,
      sortBy: input.sortBy,
      order: input.order
    });
    rows.push(...chunk.rows);
  }
  return { total: first.total, rows };
}

function scoreFolderName(name: string, query: string): number {
  const normalizedName = name.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  if (normalizedName === normalizedQuery) {
    return 0;
  }
  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }
  const index = normalizedName.indexOf(normalizedQuery);
  return index === -1 ? Number.MAX_SAFE_INTEGER : 2 + index;
}

function compareSearchEntries(a: SearchEntry, b: SearchEntry, sortBy: SearchSortBy, order: SortOrder): number {
  const direction = order === "asc" ? 1 : -1;
  let cmp = 0;

  if (sortBy === "updatedAt") {
    cmp = a.updatedAt - b.updatedAt;
  } else if (sortBy === "relevance") {
    cmp = a.score - b.score;
  } else if (sortBy === "type") {
    const aType = a.kind === "folder" ? "folder" : a.type;
    const bType = b.kind === "folder" ? "folder" : b.type;
    cmp = collator.compare(aType, bType);
  } else if (sortBy === "size") {
    cmp = (a.kind === "file" ? a.size : 0) - (b.kind === "file" ? b.size : 0);
  } else {
    cmp = collator.compare(a.name, b.name);
  }

  if (cmp !== 0) {
    return cmp * direction;
  }

  const nameCmp = collator.compare(a.name, b.name);
  if (nameCmp !== 0) {
    return nameCmp * direction;
  }

  return collator.compare(a.relPath, b.relPath) * direction;
}

function toFileEntryWithRoot(record: SearchItemRecord, rootPath: string): FileSearchEntry {
  const fileName = getFileName(record.item.path);
  return {
    kind: "file",
    rootId: record.item.rootId,
    relPath: getRelPath(rootPath, record.item.path),
    name: fileName,
    updatedAt: record.item.updatedAt,
    size: record.item.size,
    ext: record.item.ext,
    type: record.item.type,
    itemId: record.item.id,
    previewable: isPreviewable(record.item.ext),
    score: record.score
  };
}

export const searchService = {
  search(input: {
    q?: string;
    page: number;
    pageSize: number;
    type?: ItemType;
    rootId?: string;
    tag?: string;
    sortBy?: SearchSortBy;
    order?: SortOrder;
  }) {
    const hasQuery = Boolean(input.q && input.q.trim().length > 0);
    const sortBy = normalizeSearchSortBy(hasQuery, input.sortBy);
    const order = normalizeSearchOrder(sortBy, input.order);

    const result = itemModel.search({
      query: input.q,
      page: input.page,
      pageSize: input.pageSize,
      type: input.type,
      rootId: input.rootId,
      tag: input.tag,
      sortBy,
      order
    });
    return {
      page: input.page,
      pageSize: input.pageSize,
      total: result.total,
      items: result.rows
    };
  },

  async searchEntries(input: {
    q?: string;
    page: number;
    pageSize: number;
    type?: ItemType;
    rootId?: string;
    tag?: string;
    sortBy?: SearchSortBy;
    order?: SortOrder;
  }): Promise<{ page: number; pageSize: number; total: number; items: SearchEntry[] }> {
    const hasQuery = Boolean(input.q && input.q.trim().length > 0);
    const sortBy = normalizeSearchSortBy(hasQuery, input.sortBy);
    const order = normalizeSearchOrder(sortBy, input.order);

    const roots = libraryModel
      .listRoots()
      .filter((root) => (input.rootId ? root.id === input.rootId : true));

    const folderMatches: FolderSearchEntry[] = [];
    if (hasQuery && input.q) {
      const normalizedQuery = input.q.trim().toLowerCase();
      for (const root of roots) {
        const rootScore = scoreFolderName(root.name, normalizedQuery);
        if (rootScore !== Number.MAX_SAFE_INTEGER) {
          folderMatches.push({
            kind: "folder",
            rootId: root.id,
            relPath: "",
            name: root.name,
            updatedAt: root.updatedAt,
            hasChildren: true,
            previewable: false,
            score: rootScore
          });
        }

        const folderIndex = await getFolderIndex(root.id, root.path);
        for (const folder of folderIndex) {
          const score = scoreFolderName(folder.name, normalizedQuery);
          if (score === Number.MAX_SAFE_INTEGER) {
            continue;
          }
          folderMatches.push({
            kind: "folder",
            rootId: root.id,
            relPath: folder.relPath,
            name: folder.name,
            updatedAt: folder.updatedAt,
            hasChildren: folder.hasChildren,
            previewable: false,
            score
          });
        }
      }
    }

    const fileRows = await fetchAllMatchedFiles({
      q: input.q,
      type: input.type,
      rootId: input.rootId,
      tag: input.tag,
      sortBy,
      order
    });
    const rootPathById = new Map(roots.map((root) => [root.id, root.path]));
    const fileEntries = fileRows.rows
      .map((row) => {
        const rootPath = rootPathById.get(row.item.rootId);
        if (!rootPath) {
          return null;
        }
        return toFileEntryWithRoot(row, rootPath);
      })
      .filter(Boolean) as FileSearchEntry[];

    const merged: SearchEntry[] = [...folderMatches, ...fileEntries];
    merged.sort((a, b) => compareSearchEntries(a, b, sortBy, order));

    const total = merged.length;
    const offset = (input.page - 1) * input.pageSize;
    const paged = merged.slice(offset, offset + input.pageSize);

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      items: paged
    };
  },

  invalidateFolderIndex(rootId?: string): void {
    if (rootId) {
      folderIndexCache.delete(rootId);
      return;
    }
    folderIndexCache.clear();
  }
};
