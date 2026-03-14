import { create } from 'zustand';
import type { LibraryRoot } from '../types/api';
import { libraryService } from '../services/libraryService';
import { ApiRequestError } from '../services/apiService';

interface LibraryState {
  roots: LibraryRoot[];
  isLoading: boolean;
  error: string | null;

  fetchRoots: () => Promise<void>;
  addRoot: (name: string, path: string) => Promise<LibraryRoot>;
  updateRoot: (id: string, data: { name?: string; path?: string }) => Promise<LibraryRoot>;
  removeRoot: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  roots: [],
  isLoading: false,
  error: null,

  async fetchRoots() {
    set({ isLoading: true, error: null });
    try {
      const roots = await libraryService.listRoots();
      set({ roots, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to load library roots.';
      set({ isLoading: false, error: message });
    }
  },

  async addRoot(name: string, path: string) {
    set({ isLoading: true, error: null });
    try {
      const root = await libraryService.createRoot(name, path);
      set((state) => ({
        roots: [...state.roots, root],
        isLoading: false,
      }));
      return root;
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to add library root.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  async updateRoot(id: string, data: { name?: string; path?: string }) {
    set({ isLoading: true, error: null });
    try {
      const updated = await libraryService.updateRoot(id, data);
      set((state) => ({
        roots: state.roots.map((root) => (root.id === id ? updated : root)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to update library root.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  async removeRoot(id: string) {
    set({ isLoading: true, error: null });
    try {
      await libraryService.deleteRoot(id);
      set((state) => ({
        roots: state.roots.filter((root) => root.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to delete library root.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
