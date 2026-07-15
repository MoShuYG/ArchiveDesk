import { create } from 'zustand';
import type { LibraryRoot } from '../types/api';
import { libraryService } from '../services/libraryService';
import type { LocalizedError } from '../i18n';

interface LibraryState {
  roots: LibraryRoot[];
  isLoading: boolean;
  error: LocalizedError | null;

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
      set({ isLoading: false, error: { value: err, fallbackKey: 'errors.loadLibraryFailed' } });
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
      set({ isLoading: false, error: { value: err, fallbackKey: 'errors.addLibraryFailed' } });
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
      set({ isLoading: false, error: { value: err, fallbackKey: 'errors.updateLibraryFailed' } });
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
      set({ isLoading: false, error: { value: err, fallbackKey: 'errors.deleteLibraryFailed' } });
      throw err;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
