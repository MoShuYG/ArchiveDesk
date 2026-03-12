import fs from "fs/promises";
import { spawnSync } from "child_process";
import type { ItemType } from "../../models/itemModel";

export type MetadataResult = {
  metadata: Record<string, unknown>;
  warnings: string[];
};

let sharpModule: null | { metadata: (filePath: string) => Promise<Record<string, unknown>> } = null;
let sharpInitialized = false;
let sharpUnavailableWarningEmitted = false;

function runFfprobe(filePath: string): { data: any | null; warning?: string } {
  const args = ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath];
  const result = spawnSync("ffprobe", args, { encoding: "utf8" });
  if (result.error) {
    return { data: null, warning: "ffprobe unavailable, metadata extraction downgraded." };
  }
  if (result.status !== 0) {
    return { data: null, warning: "ffprobe failed to parse this media file." };
  }
  try {
    return { data: JSON.parse(result.stdout) };
  } catch {
    return { data: null, warning: "ffprobe output parse failed." };
  }
}

function pickVideoMetadata(probe: any): Record<string, unknown> {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const format = probe?.format ?? {};
  const stream = streams.find((s: any) => s.codec_type === "video") ?? {};
  return {
    duration: Number(format.duration ?? stream.duration ?? 0),
    codec: stream.codec_name ?? null,
    bitRate: Number(format.bit_rate ?? stream.bit_rate ?? 0),
    width: stream.width ?? null,
    height: stream.height ?? null,
    frameRate: stream.avg_frame_rate ?? null,
    formatName: format.format_name ?? null
  };
}

function pickAudioMetadata(probe: any): Record<string, unknown> {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const format = probe?.format ?? {};
  const stream = streams.find((s: any) => s.codec_type === "audio") ?? {};
  return {
    duration: Number(format.duration ?? stream.duration ?? 0),
    codec: stream.codec_name ?? null,
    bitRate: Number(format.bit_rate ?? stream.bit_rate ?? 0),
    sampleRate: Number(stream.sample_rate ?? 0),
    channels: Number(stream.channels ?? 0),
    formatName: format.format_name ?? null
  };
}

function parsePngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) {
    return null;
  }
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function parseGifSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 10) {
    return null;
  }
  const signature = buffer.subarray(0, 6).toString("ascii");
  if (signature !== "GIF87a" && signature !== "GIF89a") {
    return null;
  }
  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8)
  };
}

function parseJpegSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const markerLength = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    if (markerLength < 2) {
      break;
    }
    offset += markerLength + 2;
  }
  return null;
}

async function extractImageMetadataFallback(filePath: string): Promise<Record<string, unknown>> {
  try {
    const buffer = await fs.readFile(filePath);
    const png = parsePngSize(buffer);
    if (png) {
      return { width: png.width, height: png.height, format: "png" };
    }
    const jpeg = parseJpegSize(buffer);
    if (jpeg) {
      return { width: jpeg.width, height: jpeg.height, format: "jpeg" };
    }
    const gif = parseGifSize(buffer);
    if (gif) {
      return { width: gif.width, height: gif.height, format: "gif" };
    }
    return {};
  } catch {
    return {};
  }
}

function emitSharpUnavailableWarningOnce(): string[] {
  if (sharpUnavailableWarningEmitted) {
    return [];
  }
  sharpUnavailableWarningEmitted = true;
  return ["sharp unavailable or failed, image metadata extraction downgraded."];
}

async function ensureSharpModule(): Promise<boolean> {
  if (sharpInitialized) {
    return Boolean(sharpModule);
  }
  sharpInitialized = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require("sharp");
    sharpModule = {
      metadata: async (filePath: string) => sharp(filePath).metadata()
    };
    return true;
  } catch {
    sharpModule = null;
    return false;
  }
}

async function extractImageMetadata(filePath: string): Promise<MetadataResult> {
  const hasSharp = await ensureSharpModule();
  if (hasSharp && sharpModule) {
    try {
      const info = await sharpModule.metadata(filePath);
      return {
        metadata: {
          width: info.width ?? null,
          height: info.height ?? null,
          format: info.format ?? null,
          space: info.space ?? null,
          channels: info.channels ?? null,
          density: info.density ?? null
        },
        warnings: []
      };
    } catch {
      const fallback = await extractImageMetadataFallback(filePath);
      return {
        metadata: fallback,
        warnings: emitSharpUnavailableWarningOnce()
      };
    }
  }

  const fallback = await extractImageMetadataFallback(filePath);
  return {
    metadata: fallback,
    warnings: emitSharpUnavailableWarningOnce()
  };
}

export async function extractMetadata(filePath: string, type: ItemType): Promise<MetadataResult> {
  if (type === "video") {
    const result = runFfprobe(filePath);
    return {
      metadata: result.data ? pickVideoMetadata(result.data) : {},
      warnings: result.warning ? [result.warning] : []
    };
  }
  if (type === "audio" || type === "voice") {
    const result = runFfprobe(filePath);
    return {
      metadata: result.data ? pickAudioMetadata(result.data) : {},
      warnings: result.warning ? [result.warning] : []
    };
  }
  if (type === "image") {
    return extractImageMetadata(filePath);
  }
  return {
    metadata: {},
    warnings: []
  };
}

const TEXT_FILE_EXTENSIONS = new Set(["txt", "md", "log", "json", "csv", "yaml", "yml"]);
const MAX_TEXT_BYTES = 1024 * 1024;

export async function extractTextContent(filePath: string, extension: string | null): Promise<string> {
  if (!extension) {
    return "";
  }
  if (!TEXT_FILE_EXTENSIONS.has(extension.toLowerCase())) {
    return "";
  }
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_TEXT_BYTES) {
    return "";
  }
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

