import { useEffect, useState } from 'react';
import { api } from '../services/apiService';

type UseAuthenticatedImageResult = {
  src: string | null;
  isLoading: boolean;
  error: string | null;
};

const blobCache = new Map<string, Blob>();
const inFlightCache = new Map<string, Promise<Blob>>();
const failedAtCache = new Map<string, number>();
const FAILURE_COOLDOWN_MS = 20_000;

async function fetchImageBlob(url: string): Promise<Blob> {
  const cached = blobCache.get(url);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightCache.get(url);
  if (inFlight) {
    return inFlight;
  }

  const task = api.getBlob(url).then((blob) => {
    blobCache.set(url, blob);
    failedAtCache.delete(url);
    return blob;
  });
  inFlightCache.set(url, task);

  try {
    return await task;
  } finally {
    inFlightCache.delete(url);
  }
}

export function useAuthenticatedImage(url: string | null | undefined): UseAuthenticatedImageResult {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const requestUrl = url;

    async function loadImage() {
      const failedAt = failedAtCache.get(requestUrl);
      if (failedAt && Date.now() - failedAt < FAILURE_COOLDOWN_MS) {
        setIsLoading(false);
        setSrc(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const blob = await fetchImageBlob(requestUrl);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (err) {
        if (cancelled) return;
        setSrc(null);
        failedAtCache.set(requestUrl, Date.now());
        setError(err instanceof Error ? err.message : '加载图片失败');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  return { src, isLoading, error };
}
