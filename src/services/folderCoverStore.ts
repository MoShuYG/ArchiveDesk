import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";

export type FolderCoverMode = "auto" | "none" | "manual_item" | "manual_upload";

export type FolderCoverEntry = {
  rootId: string;
  relPath: string;
  mode: FolderCoverMode;
  itemId?: string;
  uploadedFile?: string;
  updatedAt: number;
};

type FolderCoverDocument = {
  version: number;
  updatedAt: number;
  entries: FolderCoverEntry[];
};

const CURRENT_VERSION = 1;

function getDataDirectory(): string {
  if (env.dbPath === ":memory:") {
    return path.resolve(process.cwd(), ".runtime-data");
  }
  return path.dirname(env.dbPath);
}

function normalizeRelPath(relPath: string): string {
  const trimmed = relPath.trim();
  if (!trimmed || trimmed === ".") {
    return "";
  }
  const segments = trimmed
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");
  return segments.join("/");
}

class FolderCoverStore {
  private readonly dataDir = getDataDirectory();
  private readonly coverJsonPath = path.join(this.dataDir, "folder-covers.json");
  private readonly uploadDir = path.join(this.dataDir, "folder-covers-assets");
  private cache: FolderCoverDocument | null = null;

  getUploadRootDir(rootId: string): string {
    return path.join(this.uploadDir, rootId);
  }

  getUploadedFileAbsolutePath(rootId: string, uploadedFileName: string): string {
    return path.join(this.getUploadRootDir(rootId), uploadedFileName);
  }

  async ensureUploadRoot(rootId: string): Promise<string> {
    const rootDir = this.getUploadRootDir(rootId);
    await fs.mkdir(rootDir, { recursive: true });
    return rootDir;
  }

  async getEntry(rootId: string, relPath: string): Promise<FolderCoverEntry | null> {
    const doc = await this.readDocument();
    const normalizedRelPath = normalizeRelPath(relPath);
    const entry = doc.entries.find((item) => item.rootId === rootId && item.relPath === normalizedRelPath);
    return entry ?? null;
  }

  async upsertEntry(input: Omit<FolderCoverEntry, "updatedAt">): Promise<FolderCoverEntry> {
    const doc = await this.readDocument();
    const now = Date.now();
    const normalizedRelPath = normalizeRelPath(input.relPath);
    const nextEntry: FolderCoverEntry = {
      rootId: input.rootId,
      relPath: normalizedRelPath,
      mode: input.mode,
      itemId: input.itemId,
      uploadedFile: input.uploadedFile,
      updatedAt: now
    };
    const nextEntries = doc.entries.filter((entry) => !(entry.rootId === input.rootId && entry.relPath === normalizedRelPath));
    nextEntries.push(nextEntry);
    await this.writeDocument({
      ...doc,
      updatedAt: now,
      entries: nextEntries
    });
    return nextEntry;
  }

  async removeEntry(rootId: string, relPath: string): Promise<void> {
    const doc = await this.readDocument();
    const normalizedRelPath = normalizeRelPath(relPath);
    const target = doc.entries.find((entry) => entry.rootId === rootId && entry.relPath === normalizedRelPath);
    if (target?.mode === "manual_upload" && target.uploadedFile) {
      await fs.rm(this.getUploadedFileAbsolutePath(rootId, target.uploadedFile), { force: true });
    }
    const nextEntries = doc.entries.filter((entry) => !(entry.rootId === rootId && entry.relPath === normalizedRelPath));
    await this.writeDocument({
      ...doc,
      updatedAt: Date.now(),
      entries: nextEntries
    });
  }

  async removeRoot(rootId: string): Promise<void> {
    const doc = await this.readDocument();
    const nextEntries = doc.entries.filter((entry) => entry.rootId !== rootId);
    await this.writeDocument({
      ...doc,
      updatedAt: Date.now(),
      entries: nextEntries
    });
    await fs.rm(this.getUploadRootDir(rootId), { recursive: true, force: true });
  }

  async createUploadedFileName(extension: string): Promise<string> {
    const normalized = extension.replace(/^\./, "").toLowerCase();
    const random = crypto.randomBytes(10).toString("hex");
    return `${Date.now()}-${random}.${normalized}`;
  }

  async clearAllForTests(): Promise<void> {
    this.cache = null;
    await fs.rm(this.coverJsonPath, { force: true });
    await fs.rm(this.uploadDir, { recursive: true, force: true });
  }

  private async readDocument(): Promise<FolderCoverDocument> {
    if (this.cache) {
      return this.cache;
    }
    await fs.mkdir(this.dataDir, { recursive: true });
    try {
      const raw = await fs.readFile(this.coverJsonPath, "utf8");
      const parsed = JSON.parse(raw) as FolderCoverDocument;
      if (!Array.isArray(parsed.entries)) {
        throw new Error("Invalid folder cover data.");
      }
      this.cache = {
        version: CURRENT_VERSION,
        updatedAt: parsed.updatedAt ?? Date.now(),
        entries: parsed.entries.map((entry) => ({
          rootId: entry.rootId,
          relPath: normalizeRelPath(entry.relPath),
          mode: entry.mode,
          itemId: entry.itemId,
          uploadedFile: entry.uploadedFile,
          updatedAt: entry.updatedAt ?? Date.now()
        }))
      };
      return this.cache;
    } catch (error) {
      const defaultDoc: FolderCoverDocument = {
        version: CURRENT_VERSION,
        updatedAt: Date.now(),
        entries: []
      };
      this.cache = defaultDoc;
      await this.writeDocument(defaultDoc);
      return defaultDoc;
    }
  }

  private async writeDocument(doc: FolderCoverDocument): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tempPath = `${this.coverJsonPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(doc, null, 2), "utf8");
    await fs.rename(tempPath, this.coverJsonPath);
    this.cache = doc;
  }
}

export const folderCoverStore = new FolderCoverStore();
