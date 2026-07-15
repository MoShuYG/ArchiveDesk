import fs from "fs/promises";
import path from "path";
import { ZodTypeAny } from "zod";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";

export function validateSchema<TSchema extends ZodTypeAny>(schema: TSchema, payload: unknown): ReturnType<TSchema["parse"]> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "请求参数验证失败。", result.error.flatten());
  }
  return result.data;
}

export async function validateRootPath(rawPath: string): Promise<{ normalizedPath: string; absolutePath: string }> {
  if (!path.isAbsolute(rawPath)) {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "路径必须为绝对路径。");
  }
  let stat;
  try {
    stat = await fs.stat(rawPath);
  } catch {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "路径不存在。");
  }
  if (!stat.isDirectory()) {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "路径必须指向目录。");
  }
  try {
    await fs.access(rawPath);
  } catch {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "无法读取该路径。");
  }
  const absolutePath = await fs.realpath(rawPath);
  const normalizedPath = process.platform === "win32" ? absolutePath.toLowerCase() : absolutePath;
  return { normalizedPath, absolutePath };
}

export function ensureNoPathConflict(candidate: string, existing: string[]): void {
  for (const normalized of existing) {
    if (candidate === normalized) {
      throw new AppError(409, ErrorCodes.ROOT_PATH_CONFLICT, "该路径已存在。");
    }
    const leftPrefix = normalized.endsWith(path.sep) ? normalized : `${normalized}${path.sep}`;
    const rightPrefix = candidate.endsWith(path.sep) ? candidate : `${candidate}${path.sep}`;
    if (candidate.startsWith(leftPrefix) || normalized.startsWith(rightPrefix)) {
      throw new AppError(409, ErrorCodes.ROOT_PATH_CONFLICT, "资源库路径之间不能互相包含。");
    }
  }
}
