import type { Request } from "express";
import { AppError } from "../../errors/appError";
import { ErrorCodes } from "../../errors/errorCodes";

type MultipartParseResult = {
  fields: Record<string, string>;
  file: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
  };
};

function parseContentTypeBoundary(contentTypeHeader: string | undefined): string {
  if (!contentTypeHeader || !contentTypeHeader.toLowerCase().startsWith("multipart/form-data")) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Content-Type must be multipart/form-data.");
  }
  const match = /boundary=([^;]+)/i.exec(contentTypeHeader);
  if (!match) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Multipart boundary is missing.");
  }
  return match[1].trim().replace(/^"|"$/g, "");
}

async function readRequestBuffer(req: Request, maxBytes: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        reject(new AppError(400, ErrorCodes.VALIDATION_ERROR, "Multipart payload too large."));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (error) => reject(error));
  });
}

function parseHeaderLines(rawHeader: string): Record<string, string> {
  const lines = rawHeader.split("\r\n").map((line) => line.trim()).filter(Boolean);
  const result: Record<string, string> = {};
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

export async function parseSingleFileMultipart(req: Request, maxBytes = 6 * 1024 * 1024): Promise<MultipartParseResult> {
  const boundary = parseContentTypeBoundary(req.header("content-type"));
  const rawBuffer = await readRequestBuffer(req, maxBytes);
  const rawText = rawBuffer.toString("latin1");
  const boundaryToken = `--${boundary}`;
  const parts = rawText
    .split(boundaryToken)
    .slice(1, -1)
    .map((part) => {
      let normalized = part;
      if (normalized.startsWith("\r\n")) {
        normalized = normalized.slice(2);
      }
      if (normalized.endsWith("\r\n")) {
        normalized = normalized.slice(0, -2);
      }
      return normalized;
    })
    .filter((part) => part.length > 0);

  const fields: Record<string, string> = {};
  let parsedFile: MultipartParseResult["file"] | null = null;

  for (const part of parts) {
    const splitIndex = part.indexOf("\r\n\r\n");
    if (splitIndex < 0) {
      continue;
    }
    const headerText = part.slice(0, splitIndex);
    const contentText = part.slice(splitIndex + 4);
    const headers = parseHeaderLines(headerText);
    const disposition = headers["content-disposition"] ?? "";
    const nameMatch = /name="([^"]+)"/i.exec(disposition);
    if (!nameMatch) {
      continue;
    }
    const fieldName = nameMatch[1];
    const filenameMatch = /filename="([^"]*)"/i.exec(disposition);
    if (!filenameMatch || filenameMatch[1].length === 0) {
      const textValue = Buffer.from(contentText, "latin1").toString("utf8");
      fields[fieldName] = textValue;
      continue;
    }

    if (parsedFile) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Only one file upload is supported.");
    }
    parsedFile = {
      filename: filenameMatch[1],
      mimeType: (headers["content-type"] ?? "application/octet-stream").toLowerCase(),
      buffer: Buffer.from(contentText, "latin1")
    };
  }

  if (!parsedFile) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Multipart file field is required.");
  }

  return {
    fields,
    file: parsedFile
  };
}
