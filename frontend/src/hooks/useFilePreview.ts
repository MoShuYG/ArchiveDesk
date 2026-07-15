import { useEffect, useState } from 'react';
import type { ItemType } from '../types/api';
import { api, getAccessToken } from '../services/apiService';
import {
  getPreviewLoadStrategy,
  isDirectPreviewExtension,
  normalizePreviewExtension,
  resolvePreviewMode,
  resolvePreviewModeFromMetadata,
  type PreviewMode,
} from '../utils/filePreview';
import { useI18n } from './useI18n';

const MAX_TEXT_PREVIEW_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PREVIEW_BYTES = 64 * 1024 * 1024;
const MAX_DOCX_PREVIEW_BYTES = 20 * 1024 * 1024;

export type FilePreviewState = {
  mode: PreviewMode;
  src: string | null;
  text: string | null;
  data: ArrayBuffer | null;
  isLoading: boolean;
  tooLarge: boolean;
  error: string | null;
};

function getPreviewByteLimit(mode: PreviewMode): number | null {
  if (mode === 'text') return MAX_TEXT_PREVIEW_BYTES;
  if (mode === 'pdf') return MAX_PDF_PREVIEW_BYTES;
  if (mode === 'docx') return MAX_DOCX_PREVIEW_BYTES;
  return null;
}

function isOverPreviewLimit(mode: PreviewMode, size?: number | null): boolean {
  const limit = getPreviewByteLimit(mode);
  return limit !== null && typeof size === 'number' && size > limit;
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

function emptyState(overrides?: Partial<FilePreviewState>): FilePreviewState {
  return {
    mode: 'unsupported',
    src: null,
    text: null,
    data: null,
    isLoading: false,
    tooLarge: false,
    error: null,
    ...overrides,
  };
}

export function useFilePreview(input: {
  itemId?: string | null;
  rootId?: string | null;
  relPath?: string | null;
  type?: ItemType;
  size?: number | null;
  ext?: string | null;
}): FilePreviewState {
  const { t, localizeError } = useI18n();
  const [state, setState] = useState<FilePreviewState>(() => emptyState());

  const metadataMode = resolvePreviewModeFromMetadata(input.type, input.ext);
  const loadStrategy = getPreviewLoadStrategy(metadataMode);
  const directPreviewAvailable = Boolean(!input.itemId && input.rootId && input.relPath && isDirectPreviewExtension(input.ext));
  const canAttemptPreview = input.itemId ? normalizePreviewExtension(input.ext) !== 'tga' : directPreviewAvailable;
  const tooLarge = isOverPreviewLimit(metadataMode, input.size);
  const streamUrl = canAttemptPreview && !tooLarge && loadStrategy === 'stream' ? buildProtectedPreviewUrl(input) : null;

  useEffect(() => {
    if (!canAttemptPreview || tooLarge || loadStrategy === 'stream' || loadStrategy === 'none') {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setState(
        emptyState({
          mode: metadataMode,
          isLoading: true,
        }),
      );

      try {
        const blob = input.itemId
          ? await api.getBlob(`/api/items/${input.itemId}/file`)
          : await api.getBlob(`/api/library/roots/${input.rootId}/file`, { relPath: input.relPath ?? '' });
        if (cancelled) return;

        const mode = resolvePreviewMode(input.type ?? 'other', blob.type || 'application/octet-stream', input.ext);
        if (isOverPreviewLimit(mode, blob.size)) {
          setState(emptyState({ tooLarge: true }));
          return;
        }

        if (mode === 'text') {
          const text = await blob.text();
          if (cancelled) return;
          setState(
            emptyState({
              mode: 'text',
              text: text.slice(0, 200_000),
            }),
          );
          return;
        }

        if (mode === 'pdf' || mode === 'docx') {
          const data = await blob.arrayBuffer();
          if (cancelled) return;
          setState(
            emptyState({
              mode,
              data,
            }),
          );
          return;
        }

        if (mode === 'unsupported') {
          setState(emptyState());
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setState(
          emptyState({
            mode,
            src: objectUrl,
          }),
        );
      } catch (error) {
        if (cancelled) return;
        setState(
          emptyState({
            error: localizeError(error, 'errors.loadPreviewFailed'),
          }),
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [canAttemptPreview, input.ext, input.itemId, input.relPath, input.rootId, input.type, loadStrategy, localizeError, metadataMode, tooLarge]);

  if (!canAttemptPreview) {
    return emptyState();
  }

  if (tooLarge) {
    return emptyState({ tooLarge: true });
  }

  if (loadStrategy === 'none') {
    return emptyState();
  }

  if (loadStrategy === 'stream') {
    return emptyState({
      mode: streamUrl ? metadataMode : 'unsupported',
      src: streamUrl,
      error: streamUrl ? null : t('errors.previewSessionExpired'),
    });
  }

  return state;
}
