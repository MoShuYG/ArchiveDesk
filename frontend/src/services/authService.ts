import { api, setTokens, clearTokens } from './apiService';
import type {
    LoginResponse,
    SetupPasswordResponse,
    SessionInfo,
} from '../types/api';

export const authService = {
    async setupPassword(password: string, username?: string): Promise<SetupPasswordResponse> {
        return api.postNoAuth<SetupPasswordResponse>('/api/auth/setup-password', {
            password,
            ...(username ? { username } : {}),
        });
    },

    async login(password: string, username?: string): Promise<LoginResponse> {
        const data = await api.postNoAuth<LoginResponse>('/api/auth/login', {
            password,
            ...(username ? { username } : {}),
        });
        setTokens(data.accessToken, data.refreshToken);
        return data;
    },

    async refresh(refreshTokenValue: string): Promise<LoginResponse> {
        const data = await api.postNoAuth<LoginResponse>('/api/auth/refresh', {
            refreshToken: refreshTokenValue,
        });
        setTokens(data.accessToken, data.refreshToken);
        return data;
    },

    async lock(): Promise<{ locked: boolean }> {
        return api.post<{ locked: boolean }>('/api/auth/lock');
    },

    async logout(): Promise<void> {
        try {
            await api.post<{ ok: boolean }>('/api/auth/logout');
        } finally {
            clearTokens();
        }
    },

    async getSession(): Promise<SessionInfo> {
        return api.get<SessionInfo>('/api/auth/session');
    },
};
