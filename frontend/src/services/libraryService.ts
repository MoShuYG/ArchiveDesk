import { api } from './apiService';
import type {
  CoverBrowserResponse,
  ExplorerEntriesResponse,
  ExplorerSortBy,
  FolderCoverCandidatesResponse,
  FolderCoverInfo,
  FolderCoverMode,
  FolderListResponse,
  LibraryRoot,
  LibraryRootsResponse,
  OpenExternalResponse,
  RootEntriesResponse,
} from '../types/api';

export const libraryService = {
  async listRoots(): Promise<LibraryRoot[]> {
    const data = await api.get<LibraryRootsResponse>('/api/library/roots');
    return data.items;
  },

  async listRootEntries(input?: {
    page?: number;
    pageSize?: number;
    sortBy?: 'name' | 'updatedAt';
    order?: 'asc' | 'desc';
  }): Promise<RootEntriesResponse> {
    return api.get<RootEntriesResponse>('/api/library/roots/entries', {
      page: input?.page,
      pageSize: input?.pageSize,
      sortBy: input?.sortBy,
      order: input?.order,
    });
  },

  async createRoot(name: string, path: string): Promise<LibraryRoot> {
    return api.post<LibraryRoot>('/api/library/roots', { name, path });
  },

  async updateRoot(id: string, data: { name?: string; path?: string }): Promise<LibraryRoot> {
    return api.put<LibraryRoot>(`/api/library/roots/${id}`, data);
  },

  async deleteRoot(id: string): Promise<LibraryRoot> {
    return api.delete<LibraryRoot>(`/api/library/roots/${id}`);
  },

  async listFolders(input: {
    rootId: string;
    parentRelPath?: string;
    page?: number;
    pageSize?: number;
  }): Promise<FolderListResponse> {
    return api.get<FolderListResponse>(`/api/library/roots/${input.rootId}/folders`, {
      parentRelPath: input.parentRelPath,
      page: input.page,
      pageSize: input.pageSize,
    });
  },

  async listFolderCoverCandidates(input: {
    rootId: string;
    relPath: string;
    page?: number;
    pageSize?: number;
  }): Promise<FolderCoverCandidatesResponse> {
    return api.get<FolderCoverCandidatesResponse>(`/api/library/roots/${input.rootId}/folders/cover-candidates`, {
      relPath: input.relPath,
      page: input.page,
      pageSize: input.pageSize,
    });
  },

  async listCoverBrowser(input: {
    rootId: string;
    relPath?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'name' | 'updatedAt' | 'size';
    order?: 'asc' | 'desc';
    foldersFirst?: boolean;
  }): Promise<CoverBrowserResponse> {
    return api.get<CoverBrowserResponse>(`/api/library/roots/${input.rootId}/folders/cover-browser`, {
      relPath: input.relPath,
      page: input.page,
      pageSize: input.pageSize,
      sortBy: input.sortBy,
      order: input.order,
      foldersFirst: input.foldersFirst === undefined ? undefined : String(input.foldersFirst),
    });
  },

  async setFolderCover(input: {
    rootId: string;
    relPath: string;
    mode: Exclude<FolderCoverMode, 'manual_upload'>;
    itemId?: string;
  }): Promise<FolderCoverInfo> {
    return api.put<FolderCoverInfo>(`/api/library/roots/${input.rootId}/folders/cover`, {
      relPath: input.relPath,
      mode: input.mode,
      itemId: input.itemId,
    });
  },

  async uploadFolderCover(input: { rootId: string; relPath: string; file: File }): Promise<FolderCoverInfo> {
    const formData = new FormData();
    formData.set('relPath', input.relPath);
    formData.set('file', input.file);
    return api.postForm<FolderCoverInfo>(`/api/library/roots/${input.rootId}/folders/cover/upload`, formData);
  },

  async listExplorerEntries(input: {
    rootId: string;
    relPath?: string;
    page?: number;
    pageSize?: number;
    sortBy?: ExplorerSortBy;
    order?: 'asc' | 'desc';
    foldersFirst?: boolean;
  }): Promise<ExplorerEntriesResponse> {
    return api.get<ExplorerEntriesResponse>(`/api/library/roots/${input.rootId}/entries`, {
      relPath: input.relPath,
      page: input.page,
      pageSize: input.pageSize,
      sortBy: input.sortBy,
      order: input.order,
      foldersFirst: input.foldersFirst === undefined ? undefined : String(input.foldersFirst),
    });
  },

  async openExplorerEntry(input: { rootId: string; relPath: string }): Promise<OpenExternalResponse> {
    return api.post<OpenExternalResponse>(`/api/library/roots/${input.rootId}/entries/open`, {
      relPath: input.relPath,
    });
  },

  async getExplorerEntryFileBlob(input: { rootId: string; relPath: string }): Promise<Blob> {
    return api.getBlob(`/api/library/roots/${input.rootId}/file`, {
      relPath: input.relPath,
    });
  },
};
