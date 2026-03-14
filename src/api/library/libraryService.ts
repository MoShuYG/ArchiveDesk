import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { libraryModel } from "../../models/libraryModel";
import { scanJobService } from "../../services/scanJobService";
import { searchService } from "../search/searchService";
import { folderService } from "./folderService";
import { ensureNoPathConflict, validateRootPath } from "../utils/validationUtils";

export const libraryService = {
  listRoots() {
    return libraryModel.listRoots();
  },

  async createRoot(input: { name: string; path: string }) {
    const { normalizedPath, absolutePath } = await validateRootPath(input.path);
    const existing = libraryModel.listRoots();
    ensureNoPathConflict(
      normalizedPath,
      existing.map((root) => root.normalizedPath)
    );
    const created = libraryModel.createRoot({
      name: input.name,
      path: absolutePath,
      normalizedPath
    });
    searchService.invalidateFolderIndex(created.id);
    scanJobService.refreshWatchers();
    const scanTask = scanJobService.enqueue("full");
    return {
      ...created,
      scanTaskId: scanTask.id
    };
  },

  async updateRoot(rootId: string, input: { name?: string; path?: string }) {
    const existingRoot = libraryModel.getRootById(rootId);
    if (!existingRoot) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Root not found.");
    }
    let targetPath = existingRoot.path;
    let targetNormalized = existingRoot.normalizedPath;
    if (input.path) {
      const validated = await validateRootPath(input.path);
      targetPath = validated.absolutePath;
      targetNormalized = validated.normalizedPath;
    }
    const others = libraryModel
      .listRoots()
      .filter((root) => root.id !== rootId)
      .map((root) => root.normalizedPath);
    ensureNoPathConflict(targetNormalized, others);
    const updated = libraryModel.updateRoot(rootId, {
      name: input.name ?? existingRoot.name,
      path: targetPath,
      normalizedPath: targetNormalized
    });
    if (!updated) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Root not found.");
    }
    searchService.invalidateFolderIndex(rootId);
    scanJobService.refreshWatchers();
    if (input.path && targetNormalized !== existingRoot.normalizedPath) {
      const scanTask = scanJobService.enqueue("full");
      return {
        ...updated,
        scanTaskId: scanTask.id
      };
    }
    return updated;
  },

  async deleteRoot(rootId: string) {
    const deleted = libraryModel.deleteRoot(rootId);
    if (deleted === 0) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Root not found.");
    }
    await folderService.removeRootData(rootId);
    searchService.invalidateFolderIndex(rootId);
    scanJobService.refreshWatchers();
    return { deleted: true };
  }
};
