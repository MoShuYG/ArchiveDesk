import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { scanJobService } from "../../services/scanJobService";

export const scanService = {
  enqueueFullScan() {
    return scanJobService.enqueue("full");
  },

  enqueueIncrementalScan() {
    return scanJobService.enqueue("incremental");
  },

  getTask(taskId: string) {
    const task = scanJobService.getTask(taskId);
    if (!task) {
      throw new AppError(404, ErrorCodes.SCAN_TASK_NOT_FOUND, "Scan task not found.");
    }
    return task;
  }
};

