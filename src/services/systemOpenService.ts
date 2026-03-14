import { spawn } from "child_process";
import { AppError } from "../errors/appError";
import { ErrorCodes } from "../errors/errorCodes";
import type { ItemRecord } from "../models/itemModel";
import { ensureRegularFile } from "./fileStreamService";

export type ExternalOpenResult = {
  ok: true;
};

async function ensureFile(filePath: string): Promise<string> {
  const { absolutePath } = await ensureRegularFile(filePath, {
    notFound: "未找到目标文件。",
    invalidType: "目标路径不是文件。"
  });
  return absolutePath;
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

function runCommand(file: string, args: string[], fallbackMessage: string, extraEnv?: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env
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

async function openWithSystem(filePath: string): Promise<void> {
  try {
    await runCommand(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Start-Process -FilePath $env:ARCHIVEDESK_OPEN_TARGET"
      ],
      "调用 Windows 默认方式打开文件失败",
      { ARCHIVEDESK_OPEN_TARGET: filePath }
    );
  } catch (error) {
    throw new AppError(
      500,
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : "在 Windows 中打开文件失败。"
    );
  }
}

export const systemOpenService = {
  async openItem(item: ItemRecord): Promise<ExternalOpenResult> {
    return this.openPath(item.path);
  },

  async openPath(filePath: string): Promise<ExternalOpenResult> {
    if (process.platform !== "win32") {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "仅支持在 Windows 环境中执行外部打开。");
    }
    const absolutePath = await ensureFile(filePath);
    await openWithSystem(absolutePath);
    return { ok: true };
  }
};
