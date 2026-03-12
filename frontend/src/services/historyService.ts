import { api } from './apiService';
import type {
    HistoryEntry,
    HistoryListParams,
    HistoryListResponse,
} from '../types/api';

export const historyService = {
    async listHistory(params?: HistoryListParams): Promise<HistoryListResponse> {
        const queryParams: Record<string, string | number | undefined> = {
            page: params?.page,
            pageSize: params?.pageSize,
            type: params?.type,
            rootId: params?.rootId,
            category: params?.category,
            sortBy: params?.sortBy,
            order: params?.order,
        };
        return api.get<HistoryListResponse>('/api/history/items', queryParams);
    },

    async updateProgress(
        itemId: string,
        progress: Record<string, unknown>
    ): Promise<HistoryEntry> {
        return api.put<HistoryEntry>(`/api/history/items/${itemId}/progress`, {
            progress,
        });
    },

    async recordView(itemId: string): Promise<HistoryEntry> {
        return api.post<HistoryEntry>(`/api/history/items/${itemId}/view`);
    },
};
