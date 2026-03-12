export interface ApiError {
  code: string;
  message: string;
  details: unknown | null;
  requestId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface SetupPasswordResponse {
  user: {
    userId: number;
    username: string;
  };
}

export interface SessionInfo {
  sessionId: string;
  userId: number;
  username: string;
  locked: boolean;
  lastActivity: number;
  expiresAt: number;
}

export interface LibraryRoot {
  id: string;
  name: string;
  path: string;
  normalizedPath: string;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryRootsResponse {
  items: LibraryRoot[];
}

export type FolderCoverMode = 'auto' | 'none' | 'manual_item' | 'manual_upload';

export interface FolderCoverInfo {
  mode: FolderCoverMode;
  url: string | null;
}

export interface FolderNode {
  rootId: string;
  relPath: string;
  name: string;
  depth: number;
  hasChildren: boolean;
  cover: FolderCoverInfo;
}

export interface FolderListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: FolderNode[];
}

export interface FolderCoverCandidate {
  id: string;
  title: string;
  path: string;
  updatedAt: number;
  size: number;
  thumbnailUrl: string;
}

export interface FolderCoverCandidatesResponse {
  page: number;
  pageSize: number;
  total: number;
  items: FolderCoverCandidate[];
}

export type CoverBrowserSortBy = 'name' | 'updatedAt' | 'size';

export interface CoverBrowserEntry {
  kind: 'folder' | 'image';
  rootId: string;
  relPath: string;
  name: string;
  updatedAt: number;
  size?: number;
  hasChildren?: boolean;
  itemId?: string;
  thumbnailUrl?: string;
}

export interface CoverBrowserResponse {
  page: number;
  pageSize: number;
  total: number;
  items: CoverBrowserEntry[];
}

export type SortOrder = 'asc' | 'desc';
export type ExplorerSortBy = 'name' | 'type' | 'updatedAt' | 'size';

export interface ExplorerEntry {
  kind: 'folder' | 'file';
  rootId: string;
  relPath: string;
  name: string;
  ext?: string | null;
  size?: number;
  updatedAt: number;
  hasChildren?: boolean;
  cover?: FolderCoverInfo;
  itemId?: string;
  previewable: boolean;
  type?: ItemType;
}

export interface ExplorerEntriesResponse {
  page: number;
  pageSize: number;
  total: number;
  items: ExplorerEntry[];
}

export interface RootEntry {
  kind: 'root';
  rootId: string;
  relPath: '';
  name: string;
  updatedAt: number;
  hasChildren: boolean;
  cover: FolderCoverInfo;
}

export interface RootEntriesResponse {
  page: number;
  pageSize: number;
  total: number;
  items: RootEntry[];
}

export type ItemType = 'video' | 'audio' | 'image' | 'novel' | 'booklet' | 'voice' | 'other';

export interface Item {
  id: string;
  rootId: string;
  path: string;
  title: string;
  type: ItemType;
  ext: string | null;
  size: number;
  mtimeMs: number;
  ctimeMs: number | null;
  inode: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  contentText: string;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
  lastScannedAt: number;
}

export type SearchSort = 'relevance' | 'name' | 'type' | 'updatedAt' | 'size';

export interface SearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
  type?: ItemType;
  rootId?: string;
  tag?: string;
  sort?: SearchSort;
  sortBy?: SearchSort;
  order?: SortOrder;
}

export interface SearchResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Item[];
}

export interface SearchFolderEntry {
  kind: 'folder';
  rootId: string;
  relPath: string;
  name: string;
  updatedAt: number;
  hasChildren: boolean;
  previewable: false;
}

export interface SearchFileEntry {
  kind: 'file';
  rootId: string;
  relPath: string;
  name: string;
  updatedAt: number;
  size: number;
  ext: string | null;
  type: ItemType;
  itemId: string;
  previewable: boolean;
}

export type SearchEntry = SearchFolderEntry | SearchFileEntry;

export interface SearchEntriesResponse {
  page: number;
  pageSize: number;
  total: number;
  items: SearchEntry[];
}

export type ScanTaskType = 'full' | 'incremental';
export type ScanTaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'canceled';

export interface ScanTask {
  id: string;
  type: ScanTaskType;
  status: ScanTaskStatus;
  startedAt: number | null;
  finishedAt: number | null;
  totalFiles: number;
  processedFiles: number;
  createdFiles: number;
  updatedFiles: number;
  deletedFiles: number;
  warnings: string[];
  errorMessage: string | null;
  createdAt: number;
}

export interface ScanEnqueueResponse {
  taskId: string;
  status: ScanTaskStatus;
  type: ScanTaskType;
}

export interface HistoryItem {
  id: string;
  rootId: string;
  title: string;
  path: string;
  type: ItemType;
  metadata: Record<string, unknown>;
}

export interface HistoryEntry {
  itemId: string;
  progress: Record<string, unknown>;
  lastAccessedAt: number;
  updatedAt: number;
  item: HistoryItem;
}

export interface HistoryListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: HistoryEntry[];
}

export interface HistoryListParams {
  page?: number;
  pageSize?: number;
  type?: ItemType;
  rootId?: string;
  category?: 'all' | 'image' | 'video' | 'novel' | 'audio';
  sortBy?: 'lastAccessedAt' | 'name' | 'type' | 'updatedAt' | 'size';
  order?: SortOrder;
}
