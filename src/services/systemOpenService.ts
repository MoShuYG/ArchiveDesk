import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { env } from "../config/env";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";
import type { ItemRecord } from "../models/itemModel";

export type ExternalOpenResult = {
  ok: true;
  openedWith: "quickviewer" | "system";
};

function isImageItem(item: ItemRecord): boolean {
  return item.type === "image";
}

async function ensureFile(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    throw new AppError(404, ErrorCodes.ITEM_NOT_FOUND, "Target file not found.");
  }
  if (!stat.isFile()) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Target path is not a file.");
  }
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

function runPowerShell(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const message = stderr.trim() || `PowerShell exited with code ${code ?? -1}`;
      reject(new Error(message));
    });
  });
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

async function openWithSystem(filePath: string): Promise<void> {
  try {
    const command = `$ErrorActionPreference='Stop'; try { Start-Process -FilePath '${escapePowerShellSingleQuoted(filePath)}' -ErrorAction Stop | Out-Null; exit 0 } catch { Write-Error $_.Exception.Message; exit 1 }`;
    await runPowerShell(command);
  } catch (error) {
    throw new AppError(
      500,
      ErrorCodes.INTERNAL_ERROR,
      `Failed to open file with system handler: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

async function openWithQuickViewer(filePath: string): Promise<boolean> {
  if (!(await canUseQuickViewer()) || !env.quickViewerPath) {
    return false;
  }
  try {
    const command = `$ErrorActionPreference='Stop'; try { Start-Process -FilePath '${escapePowerShellSingleQuoted(env.quickViewerPath)}' -ArgumentList @('${escapePowerShellSingleQuoted(filePath)}') -ErrorAction Stop | Out-Null; exit 0 } catch { Write-Error $_.Exception.Message; exit 1 }`;
    await runPowerShell(command);
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
