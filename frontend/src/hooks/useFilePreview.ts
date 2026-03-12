import { useEffect, useState } from 'react';
import type { ItemType } from '../types/api';
import { api } from '../services/apiService';

const MAX_PREVIEW_BYTES = 200 * 1024 * 1024;

export type PreviewMode = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'unsupported';

export type FilePreviewState = {
  mode: PreviewMode;
  src: string | null;
  text: string | null;
  isLoading: boolean;
  tooLarge: boolean;
  error: string | null;
};

function deriveMode(type: ItemType, mimeType: string): PreviewMode {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('yaml')) return 'text';
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio' || type === 'voice') return 'audio';
  if (type === 'novel') return 'text';
  return 'unsupported';
}

export function useFilePreview(input: { itemId?: string | null; type?: ItemType; size?: number | null }): FilePreviewState {
  const [state, setState] = useState<FilePreviewState>({
    mode: 'unsupported',
    src: null,
    text: null,
    isLoading: false,
    tooLarge: false,
    error: null,
  });

  useEffect(() => {
    const isTooLarge = typeof input.size === 'number' && input.size > MAX_PREVIEW_BYTES;
    if (!input.itemId || isTooLarge) {
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
        const blob = await api.getBlob(`/api/items/${input.itemId}/file`);
        if (cancelled) return;
        const mimeType = blob.type || 'application/octet-stream';
        const mode = deriveMode(input.type ?? 'other', mimeType);

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
          error: error instanceof Error ? error.message : '加载预览失败',
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
  }, [input.itemId, input.size, input.type]);

  if (!input.itemId) {
    return {
      mode: 'unsupported',
      src: null,
      text: null,
      isLoading: false,
      tooLarge: false,
      error: null,
    };
  }

  if (typeof input.size === 'number' && input.size > MAX_PREVIEW_BYTES) {
    return {
      mode: 'unsupported',
      src: null,
      text: null,
      isLoading: false,
      tooLarge: true,
      error: null,
    };
  }

  return state;
}
