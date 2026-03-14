import { useEffect, useState } from 'react';
import type { ItemType } from '../types/api';
import { api, getAccessToken } from '../services/apiService';

const MAX_TEXT_PREVIEW_BYTES = 10 * 1024 * 1024;
const TEXT_PREVIEW_EXTENSIONS = new Set(['txt', 'md', 'json', 'csv']);
const DIRECT_PREVIEW_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'avif',
  'pdf',
  'txt',
  'md',
  'json',
  'csv',
  'mp3',
  'mp4',
  'mov',
  'webm',
  'wav',
  'flac',
  'ogg',
  'm4a',
  'aac',
]);

export type PreviewMode = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'unsupported';

export type FilePreviewState = {
  mode: PreviewMode;
  src: string | null;
  text: string | null;
  isLoading: boolean;
  tooLarge: boolean;
  error: string | null;
};

function normalizeExt(ext?: string | null): string | null {
  if (!ext) return null;
  const normalized = ext.replace(/^\./, '').trim().toLowerCase();
  return normalized || null;
}

function canDirectPreview(ext?: string | null): boolean {
  const normalizedExt = normalizeExt(ext);
  return normalizedExt ? DIRECT_PREVIEW_EXTENSIONS.has(normalizedExt) : false;
}

function deriveMode(type: ItemType, mimeType: string, ext?: string | null): PreviewMode {
  const normalizedExt = normalizeExt(ext);
  if (normalizedExt === 'tga') return 'unsupported';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('yaml')) return 'text';
  if (normalizedExt === 'pdf') return 'pdf';
  if (normalizedExt && TEXT_PREVIEW_EXTENSIONS.has(normalizedExt)) return 'text';
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio' || type === 'voice') return 'audio';
  if (type === 'novel') return 'text';
  return 'unsupported';
}

function deriveModeFromMetadata(type?: ItemType, ext?: string | null): PreviewMode {
  const normalizedExt = normalizeExt(ext);
  if (normalizedExt === 'tga') return 'unsupported';
  if (normalizedExt === 'pdf') return 'pdf';
  if (normalizedExt && TEXT_PREVIEW_EXTENSIONS.has(normalizedExt)) return 'text';
  if (normalizedExt && ['mp4', 'mov', 'webm'].includes(normalizedExt)) return 'video';
  if (normalizedExt && ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'].includes(normalizedExt)) return 'audio';
  if (normalizedExt && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'].includes(normalizedExt)) return 'image';
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio' || type === 'voice') return 'audio';
  if (type === 'novel') return 'text';
  return 'unsupported';
}

function isStreamableMode(mode: PreviewMode): boolean {
  return mode === 'video' || mode === 'audio' || mode === 'pdf';
}

function buildProtectedPreviewUrl(input: {
  itemId?: string | null;
  rootId?: string | null;
  relPath?: string | null;
}): string | null {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return null;
  }

  if (input.itemId) {
    return `/api/items/${input.itemId}/file?accessToken=${encodeURIComponent(accessToken)}`;
  }

  if (input.rootId && input.relPath) {
    return `/api/library/roots/${input.rootId}/file?relPath=${encodeURIComponent(input.relPath)}&accessToken=${encodeURIComponent(accessToken)}`;
  }

  return null;
}

export function useFilePreview(input: {
  itemId?: string | null;
  rootId?: string | null;
  relPath?: string | null;
  type?: ItemType;
  size?: number | null;
  ext?: string | null;
}): FilePreviewState {
  const [state, setState] = useState<FilePreviewState>({
    mode: 'unsupported',
    src: null,
    text: null,
    isLoading: false,
    tooLarge: false,
    error: null,
  });

  const metadataMode = deriveModeFromMetadata(input.type, input.ext);
  const directPreviewAvailable = Boolean(!input.itemId && input.rootId && input.relPath && canDirectPreview(input.ext));
  const canAttemptPreview = input.itemId ? normalizeExt(input.ext) !== 'tga' : directPreviewAvailable;
  const tooLargeForText = metadataMode === 'text' && typeof input.size === 'number' && input.size > MAX_TEXT_PREVIEW_BYTES;
  const streamUrl = canAttemptPreview && !tooLargeForText && isStreamableMode(metadataMode) ? buildProtectedPreviewUrl(input) : null;

  useEffect(() => {
    if (!canAttemptPreview || tooLargeForText) {
      return;
    }

    if (streamUrl || isStreamableMode(metadataMode)) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        tooLarge: false,
      }));
      try {
        const blob = input.itemId
          ? await api.getBlob(`/api/items/${input.itemId}/file`)
          : await api.getBlob(`/api/library/roots/${input.rootId}/file`, { relPath: input.relPath ?? '' });
        if (cancelled) return;
        const mimeType = blob.type || 'application/octet-stream';
        const mode = deriveMode(input.type ?? 'other', mimeType, input.ext);

        if (mode === 'text') {
          const text = await blob.text();
          if (cancelled) return;
          setState({
            mode: 'text',
            src: null,
            text: text.slice(0, 200_000),
            isLoading: false,
            tooLarge: false,
            error: null,
          });
          return;
        }

        if (mode === 'unsupported') {
          setState({
            mode: 'unsupported',
            src: null,
            text: null,
            isLoading: false,
            tooLarge: false,
            error: null,
          });
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setState({
          mode,
          src: objectUrl,
          text: null,
          isLoading: false,
          tooLarge: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          mode: 'unsupported',
          src: null,
          text: null,
          isLoading: false,
          tooLarge: false,
          error: error instanceof Error ? error.message : '加载预览失败。',
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [canAttemptPreview, input.ext, input.itemId, input.relPath, input.rootId, input.type, metadataMode, streamUrl, tooLargeForText]);

  if (!canAttemptPreview) {
    return {
      mode: 'unsupported',
      src: null,
      text: null,
      isLoading: false,
      tooLarge: false,
      error: null,
    };
  }

  if (tooLargeForText) {
    return {
      mode: 'unsupported',
      src: null,
      text: null,
      isLoading: false,
      tooLarge: true,
      error: null,
    };
  }

  if (isStreamableMode(metadataMode)) {
    return {
      mode: streamUrl ? metadataMode : 'unsupported',
      src: streamUrl,
      text: null,
      isLoading: false,
      tooLarge: false,
      error: streamUrl ? null : '当前预览会话已失效，请重新登录后再试。',
    };
  }

  return state;
}
