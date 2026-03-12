import type { Request, Response } from "express";
import { scanService } from "./scanService";

export const scanController = {
  startFullScan(_req: Request, res: Response): void {
    const task = scanService.enqueueFullScan();
    res.status(202).json({ taskId: task.id, status: task.status, type: task.type });
  },

  startIncrementalScan(_req: Request, res: Response): void {
    const task = scanService.enqueueIncrementalScan();
    res.status(202).json({ taskId: task.id, status: task.status, type: task.type });
  },

  getTask(req: Request, res: Response): void {
    const task = scanService.getTask(req.params.taskId);
    res.status(200).json(task);
  }
};

