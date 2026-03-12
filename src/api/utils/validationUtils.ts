import fs from "fs/promises";
import path from "path";
import { ZodTypeAny } from "zod";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";

export function validateSchema<TSchema extends ZodTypeAny>(schema: TSchema, payload: unknown): ReturnType<TSchema["parse"]> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Validation failed", result.error.flatten());
  }
  return result.data;
}

export async function validateRootPath(rawPath: string): Promise<{ normalizedPath: string; absolutePath: string }> {
  if (!path.isAbsolute(rawPath)) {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "Path must be absolute.");
  }
  let stat;
  try {
    stat = await fs.stat(rawPath);
  } catch {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "Path does not exist.");
  }
  if (!stat.isDirectory()) {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "Path must be a directory.");
  }
  try {
    await fs.access(rawPath);
  } catch {
    throw new AppError(400, ErrorCodes.ROOT_PATH_INVALID, "Path is not readable.");
  }
  const absolutePath = await fs.realpath(rawPath);
  const normalizedPath = process.platform === "win32" ? absolutePath.toLowerCase() : absolutePath;
  return { normalizedPath, absolutePath };
}

export function ensureNoPathConflict(candidate: string, existing: string[]): void {
  for (const normalized of existing) {
    if (candidate === normalized) {
      throw new AppError(409, ErrorCodes.ROOT_PATH_CONFLICT, "Path already exists.");
    }
    const leftPrefix = normalized.endsWith(path.sep) ? normalized : `${normalized}${path.sep}`;
    const rightPrefix = candidate.endsWith(path.sep) ? candidate : `${candidate}${path.sep}`;
    if (candidate.startsWith(leftPrefix) || normalized.startsWith(rightPrefix)) {
      throw new AppError(409, ErrorCodes.ROOT_PATH_CONFLICT, "Root paths cannot contain each other.");
    }
  }
}
