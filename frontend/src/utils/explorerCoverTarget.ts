import type { ExplorerEntry, FolderCoverInfo, RootEntry } from '../types/api';

export type ExplorerCoverTarget = {
  rootId: string;
  relPath: string;
  name: string;
  cover: FolderCoverInfo;
};

export function createExplorerCoverTarget(entry: ExplorerEntry | RootEntry): ExplorerCoverTarget | null {
  if (entry.kind === 'file') {
    return null;
  }

  return {
    rootId: entry.rootId,
    relPath: entry.relPath,
    name: entry.name,
    cover: entry.cover ?? { mode: 'auto', url: null },
  };
}
