import { create } from 'zustand';
import type { SessionInfo } from '../types/api';
import { authService } from '../services/authService';
import { getAccessToken, getRefreshToken, clearTokens } from '../services/apiService';
import { ApiRequestError } from '../services/apiService';
import type { LocalizedError } from '../i18n';

interface AuthState {
  session: SessionInfo | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  isLoading: boolean;
  needsSetup: boolean;
  error: LocalizedError | null;

  login: (password: string, username?: string) => Promise<void>;
  setupPassword: (password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  lock: () => Promise<void>;
  unlock: (password: string, username?: string) => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
  setLocked: (locked: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isAuthenticated: !!getAccessToken(),
  isLocked: false,
  isLoading: false,
  needsSetup: false,
  error: null,

  async login(password: string, username?: string) {
    set({ isLoading: true, error: null });
    try {
      await authService.login(password, username);
      const session = await authService.getSession();
      set({
        session,
        isAuthenticated: true,
        isLocked: session.locked,
        isLoading: false,
        needsSetup: false,
      });
    } catch (err) {
      set({ isLoading: false, error: { value: err, fallbackKey: 'errors.loginFailed' } });
      throw err;
    }
  },

  async setupPassword(password: string, username?: string) {
    set({ isLoading: true, error: null });
    try {
      await authService.setupPassword(password, username);
      await get().login(password, username);
    } catch (err) {
      set({ isLoading: false, error: { value: err, fallbackKey: 'errors.setupFailed' } });
      throw err;
    }
  },

  async logout() {
    set({ isLoading: true, error: null });
    try {
      await authService.logout();
    } finally {
      set({
        session: null,
        isAuthenticated: false,
        isLocked: false,
        isLoading: false,
        needsSetup: false,
      });
    }
  },

  async lock() {
    try {
      await authService.lock();
      set({ isLocked: true });
    } catch (err) {
      set({ error: { value: err, fallbackKey: 'errors.lockFailed' } });
    }
  },

  async unlock(password: string, username?: string) {
    set({ isLoading: true, error: null });
    try {
      await authService.login(password, username);
      const session = await authService.getSession();
      set({
        session,
        isLocked: false,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: { value: err, fallbackKey: 'errors.unlockFailed' } });
      throw err;
    }
  },

  async checkSession() {
    const token = getAccessToken();
    if (!token) {
      set({ isAuthenticated: false, session: null });
      return;
    }

    set({ isLoading: true });
    try {
      const session = await authService.getSession();
      set({
        session,
        isAuthenticated: true,
        isLocked: session.locked,
        isLoading: false,
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'AUTH_NOT_INITIALIZED') {
          set({ isAuthenticated: false, isLoading: false, needsSetup: true });
          return;
        }
        if (err.code === 'SESSION_LOCKED') {
          set({ isAuthenticated: true, isLocked: true, isLoading: false });
          return;
        }
        if (err.status === 401) {
          const rt = getRefreshToken();
          if (rt) {
            try {
              await authService.refresh(rt);
              const session = await authService.getSession();
              set({
                session,
                isAuthenticated: true,
                isLocked: session.locked,
                isLoading: false,
              });
              return;
            } catch {
              clearTokens();
            }
          }
        }
      }
      clearTokens();
      set({
        session: null,
        isAuthenticated: false,
        isLocked: false,
        isLoading: false,
      });
    }
  },

  clearError() {
    set({ error: null });
  },

  setLocked(locked: boolean) {
    set({ isLocked: locked });
  },
}));
