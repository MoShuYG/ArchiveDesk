import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";
import { HistorySortBy, HistorySortOrder, historyModel } from "../../models/historyModel";
import { itemModel } from "../../models/itemModel";

function mapCategoryToType(category?: "all" | "image" | "video" | "novel" | "audio"): string | undefined {
  if (!category || category === "all") {
    return undefined;
  }
  return category;
}

export const historyService = {
  recordView(itemId: string) {
    const item = itemModel.getItemById(itemId);
    if (!item || item.deleted) {
      throw new AppError(404, ErrorCodes.ITEM_NOT_FOUND, "Item not found.");
    }
    return historyModel.recordView(itemId);
  },

  upsertProgress(itemId: string, progress: Record<string, unknown>) {
    const item = itemModel.getItemById(itemId);
    if (!item || item.deleted) {
      throw new AppError(404, ErrorCodes.ITEM_NOT_FOUND, "Item not found.");
    }
    return historyModel.upsertProgress(itemId, progress);
  },

  listHistory(input: {
    page: number;
    pageSize: number;
    type?: string;
    category?: "all" | "image" | "video" | "novel" | "audio";
    rootId?: string;
    sortBy?: HistorySortBy;
    order?: HistorySortOrder;
  }) {
    const effectiveType = input.type ?? mapCategoryToType(input.category);
    return historyModel.listHistory({
      page: input.page,
      pageSize: input.pageSize,
      type: effectiveType,
      rootId: input.rootId,
      sortBy: input.sortBy ?? "lastAccessedAt",
      order: input.order ?? "desc"
    });
  }
};
