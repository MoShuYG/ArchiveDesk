import type { ItemType } from "../types/api";
import type { MessageKey } from "./messages";

export const ITEM_TYPE_LABEL_KEYS: Record<ItemType, MessageKey> = {
  video: "itemType.video",
  image: "itemType.image",
  audio: "itemType.audio",
  voice: "itemType.voice",
  novel: "itemType.novel",
  booklet: "itemType.booklet",
  other: "itemType.other",
};
