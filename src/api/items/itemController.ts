import fs from "fs";
import type { Request, Response } from "express";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { itemService } from "./itemService";
import { buildInlineContentDisposition } from "../../services/fileStreamService";

export const itemController = {
  getItemById(req: Request, res: Response): void {
    const item = itemService.getItemById(req.params.itemId);
    res.status(200).json(item);
  },

  async streamItemFile(req: Request, res: Response): Promise<void> {
    const { item, stat, mimeType, range } = await itemService.getFileResponseData(req.params.itemId, req);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", buildInlineContentDisposition(`${item.title}${item.ext ? `.${item.ext}` : ""}`));

    if (range) {
      const { start, end } = range;
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      res.setHeader("Content-Length", String(chunkSize));
      const stream = fs.createReadStream(item.path, { start, end });
      stream.pipe(res);
      return;
    }

    res.status(200);
    res.setHeader("Content-Length", String(stat.size));
    fs.createReadStream(item.path).pipe(res);
  },

  async getThumbnail(req: Request, res: Response): Promise<void> {
    const item = itemService.getItemById(req.params.itemId);
    const thumbnail = await itemService.getThumbnailDataByItem(item);
    if (!thumbnail) {
      if (item.type === "image") {
        // Fall back to file stream so image items still have preview even if sharp is unavailable.
        await this.streamItemFile(req, res);
        return;
      }
      throw new AppError(404, ErrorCodes.NOT_FOUND, "Thumbnail not available for this item.");
    }
    res.status(200).setHeader("Content-Type", thumbnail.contentType).send(thumbnail.buffer);
  },

  async openItem(req: Request, res: Response): Promise<void> {
    const result = await itemService.openItemExternally(req.params.itemId);
    res.status(200).json(result);
  }
};
