import fs from "fs/promises";
import { spawn } from "child_process";
import { env } from "../config/env";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";
import type { ItemRecord } from "../models/itemModel";
import { ensureRegularFile } from "./fileStreamService";

export type ExternalOpenResult = {
  ok: true;
  openedWith: "quickviewer" | "system";
};

function isImageItem(item: ItemRecord): boolean {
  return item.type === "image";
}

async function ensureFile(filePath: string): Promise<string> {
  const { absolutePath } = await ensureRegularFile(filePath, {
    notFound: "Target file not found.",
    invalidType: "Target path is not a file."
  });
  return absolutePath;
}

async function canUseQuickViewer(): Promise<boolean> {
  if (!env.quickViewerPath) {
    return false;
  }
  try {
    const stat = await fs.stat(env.quickViewerPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function sanitizeProcessOutput(buffers: Buffer[]): string | null {
  if (buffers.length === 0) {
    return null;
  }
  const text = Buffer.concat(buffers).toString("utf8").replace(/\0/g, "").trim();
  if (!text || text.includes("\uFFFD")) {
    return null;
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }
  return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
}

function runCommand(file: string, args: string[], fallbackMessage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = sanitizeProcessOutput(stderrChunks) ?? sanitizeProcessOutput(stdoutChunks);
      reject(new Error(detail ? `${fallbackMessage}: ${detail}` : fallbackMessage));
    });
  });
}

function spawnDetached(file: string, args: string[], fallbackMessage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.once("error", (error) => reject(error));
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("close", (code) => {
      if (code && code !== 0) {
        reject(new Error(fallbackMessage));
      }
    });
  });
}

async function openWithSystem(filePath: string): Promise<void> {
  try {
    const escapedPath = filePath.replace(/"/g, "\"\"");
    await runCommand("cmd.exe", ["/d", "/s", "/c", `start "" "${escapedPath}"`], "Windows shell open failed");
  } catch (error) {
    throw new AppError(
      500,
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : "Failed to open file in Windows."
    );
  }
}

async function openWithQuickViewer(filePath: string): Promise<boolean> {
  if (!(await canUseQuickViewer()) || !env.quickViewerPath) {
    return false;
  }
  try {
    await spawnDetached(env.quickViewerPath, [filePath], "QuickViewer launch failed");
    return true;
  } catch {
    return false;
  }
}

export const systemOpenService = {
  async inspectQuickViewer(): Promise<{ configured: boolean; available: boolean; path: string | null }> {
    const configured = Boolean(env.quickViewerPath);
    const available = configured ? await canUseQuickViewer() : false;
    return {
      configured,
      available,
      path: env.quickViewerPath
    };
  },

  async openItem(item: ItemRecord): Promise<ExternalOpenResult> {
    return this.openPath(item.path, { preferQuickViewer: isImageItem(item) });
  },

  async openPath(filePath: string, options?: { preferQuickViewer?: boolean }): Promise<ExternalOpenResult> {
    if (process.platform !== "win32") {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "External open is only supported on Windows.");
    }
    const absolutePath = await ensureFile(filePath);
    if (options?.preferQuickViewer) {
      const opened = await openWithQuickViewer(absolutePath);
      if (opened) {
        return { ok: true, openedWith: "quickviewer" };
      }
    }
    await openWithSystem(absolutePath);
    return { ok: true, openedWith: "system" };
  }
};
