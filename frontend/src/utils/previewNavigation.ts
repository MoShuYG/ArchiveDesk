export type ResolvedPreviewNavigation<T> = {
  previous: T | null;
  next: T | null;
  position: number;
  total: number;
};

export function resolvePreviewNavigation<T>(
  entries: readonly T[],
  currentKey: string,
  options: {
    getKey: (entry: T) => string;
    isCandidate?: (entry: T) => boolean;
  },
): ResolvedPreviewNavigation<T> | null {
  const candidates = options.isCandidate ? entries.filter(options.isCandidate) : [...entries];
  const currentIndex = candidates.findIndex((entry) => options.getKey(entry) === currentKey);

  if (currentIndex < 0) {
    return null;
  }

  return {
    previous: candidates[currentIndex - 1] ?? null,
    next: candidates[currentIndex + 1] ?? null,
    position: currentIndex + 1,
    total: candidates.length,
  };
}
