import type { ItemType } from '../types/api';

const TEXT_PREVIEW_EXTENSIONS = new Set(['txt', 'md', 'json', 'csv']);
const IMAGE_PREVIEW_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif']);
const VIDEO_PREVIEW_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);
const AUDIO_PREVIEW_EXTENSIONS = new Set(['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac']);
const DOCUMENT_PREVIEW_EXTENSIONS = new Set(['pdf', 'docx']);

const DIRECT_PREVIEW_EXTENSIONS = new Set([
  ...IMAGE_PREVIEW_EXTENSIONS,
  ...VIDEO_PREVIEW_EXTENSIONS,
  ...AUDIO_PREVIEW_EXTENSIONS,
  ...TEXT_PREVIEW_EXTENSIONS,
  ...DOCUMENT_PREVIEW_EXTENSIONS,
]);

export type PreviewMode = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'docx' | 'unsupported';
export type PreviewLoadStrategy = 'stream' | 'blob' | 'arrayBuffer' | 'none';

export function normalizePreviewExtension(ext?: string | null): string | null {
  if (!ext) return null;
  const normalized = ext.replace(/^\./, '').trim().toLowerCase();
  return normalized || null;
}

export function isDirectPreviewExtension(ext?: string | null): boolean {
  const normalizedExt = normalizePreviewExtension(ext);
  return normalizedExt ? DIRECT_PREVIEW_EXTENSIONS.has(normalizedExt) : false;
}

export function resolvePreviewMode(type: ItemType, mimeType: string, ext?: string | null): PreviewMode {
  const normalizedExt = normalizePreviewExtension(ext);
  if (normalizedExt === 'tga') return 'unsupported';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || normalizedExt === 'pdf') return 'pdf';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalizedExt === 'docx'
  ) {
    return 'docx';
  }
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('yaml')) return 'text';
  if (normalizedExt && TEXT_PREVIEW_EXTENSIONS.has(normalizedExt)) return 'text';
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio' || type === 'voice') return 'audio';
  if (type === 'novel') return 'text';
  return 'unsupported';
}

export function resolvePreviewModeFromMetadata(type?: ItemType, ext?: string | null): PreviewMode {
  const normalizedExt = normalizePreviewExtension(ext);
  if (normalizedExt === 'tga') return 'unsupported';
  if (normalizedExt === 'pdf') return 'pdf';
  if (normalizedExt === 'docx') return 'docx';
  if (normalizedExt && TEXT_PREVIEW_EXTENSIONS.has(normalizedExt)) return 'text';
  if (normalizedExt && VIDEO_PREVIEW_EXTENSIONS.has(normalizedExt)) return 'video';
  if (normalizedExt && AUDIO_PREVIEW_EXTENSIONS.has(normalizedExt)) return 'audio';
  if (normalizedExt && IMAGE_PREVIEW_EXTENSIONS.has(normalizedExt)) return 'image';
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio' || type === 'voice') return 'audio';
  if (type === 'novel') return 'text';
  return 'unsupported';
}

export function getPreviewLoadStrategy(mode: PreviewMode): PreviewLoadStrategy {
  if (mode === 'audio' || mode === 'video') return 'stream';
  if (mode === 'pdf' || mode === 'docx') return 'arrayBuffer';
  if (mode === 'image' || mode === 'text') return 'blob';
  return 'none';
}
