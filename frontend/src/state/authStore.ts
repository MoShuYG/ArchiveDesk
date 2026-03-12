import { create } from 'zustand';
import type { SessionInfo } from '../types/api';
import { authService } from '../services/authService';
import { getAccessToken, getRefreshToken, clearTokens } from '../services/apiService';
import { ApiRequestError } from '../services/apiService';

interface AuthState {
    session: SessionInfo | null;
    isAuthenticated: boolean;
    isLocked: boolean;
    isLoading: boolean;
    needsSetup: boolean;
    error: string | null;

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
            const message = err instanceof ApiRequestError ? err.message : '登录失败';
            set({ isLoading: false, error: message });
            throw err;
        }
    },

    async setupPassword(password: string, username?: string) {
        set({ isLoading: true, error: null });
        try {
            await authService.setupPassword(password, username);
            await get().login(password, username);
        } catch (err) {
            const message = err instanceof ApiRequestError ? err.message : '初始化密码失败';
            set({ isLoading: false, error: message });
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
            const message = err instanceof ApiRequestError ? err.message : '锁屏失败';
            set({ error: message });
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
            const message = err instanceof ApiRequestError ? err.message : '解锁失败';
            set({ isLoading: false, error: message });
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
