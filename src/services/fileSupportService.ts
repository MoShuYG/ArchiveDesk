import path from "path";
import type { ItemType } from "../models/itemModel";

export const VIDEO_EXTENSIONS = new Set(["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm"]);
export const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "flac", "m4a", "aac", "ogg"]);
export const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "avif", "tga"]);
export const NOVEL_EXTENSIONS = new Set(["txt", "md", "epub", "pdf"]);
export const BOOKLET_EXTENSIONS = new Set(["cbz", "cbr"]);
export const VOICE_EXTENSIONS = new Set(["pt", "pth", "safetensors", "onnx"]);
export const TEXT_PREVIEW_EXTENSIONS = new Set(["txt", "md", "json", "csv"]);
export const BROWSER_PREVIEW_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "avif",
  "pdf",
  "txt",
  "md",
  "json",
  "csv",
  "mp3",
  "mp4",
  "webm",
  "wav",
  "flac",
  "ogg",
  "m4a",
  "aac"
]);

export const MIME_BY_EXT: Record<string, string> = {
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  json: "application/json; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  yaml: "application/x-yaml; charset=utf-8",
  yml: "application/x-yaml; charset=utf-8",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  tga: "image/x-tga",
  avif: "image/avif",
  mp4: "video/mp4",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  epub: "application/epub+zip",
  cbz: "application/zip",
  cbr: "application/vnd.rar"
};

export function normalizeExtension(ext: string | null | undefined): string | null {
  if (!ext) {
    return null;
  }
  const normalized = ext.replace(/^\./, "").trim().toLowerCase();
  return normalized || null;
}

export function getExtensionFromPath(filePath: string): string | null {
  return normalizeExtension(path.extname(filePath));
}

export function classifyItemTypeFromExt(ext: string | null | undefined): ItemType {
  const normalized = normalizeExtension(ext);
  if (!normalized) {
    return "other";
  }
  if (VIDEO_EXTENSIONS.has(normalized)) {
    return "video";
  }
  if (AUDIO_EXTENSIONS.has(normalized)) {
    return "audio";
  }
  if (IMAGE_EXTENSIONS.has(normalized)) {
    return "image";
  }
  if (NOVEL_EXTENSIONS.has(normalized)) {
    return "novel";
  }
  if (BOOKLET_EXTENSIONS.has(normalized)) {
    return "booklet";
  }
  if (VOICE_EXTENSIONS.has(normalized)) {
    return "voice";
  }
  return "other";
}

export function isImageLikeExtension(ext: string | null | undefined): boolean {
  const normalized = normalizeExtension(ext);
  return normalized ? IMAGE_EXTENSIONS.has(normalized) : false;
}

export function isBrowserPreviewableExtension(ext: string | null | undefined): boolean {
  const normalized = normalizeExtension(ext);
  return normalized ? BROWSER_PREVIEW_EXTENSIONS.has(normalized) : false;
}

export function isTextPreviewExtension(ext: string | null | undefined): boolean {
  const normalized = normalizeExtension(ext);
  return normalized ? TEXT_PREVIEW_EXTENSIONS.has(normalized) : false;
}

export function detectMimeTypeFromExt(ext: string | null | undefined): string {
  const normalized = normalizeExtension(ext);
  if (!normalized) {
    return "application/octet-stream";
  }
  return MIME_BY_EXT[normalized] ?? "application/octet-stream";
}
