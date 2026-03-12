import { api } from './apiService';
import type { SearchEntriesResponse, SearchParams, SearchResponse } from '../types/api';

export const searchService = {
    async searchItems(params: SearchParams): Promise<SearchResponse> {
        const queryParams: Record<string, string | number | undefined> = {
            q: params.q,
            page: params.page,
            pageSize: params.pageSize,
            type: params.type,
            rootId: params.rootId,
            tag: params.tag,
            sortBy: params.sortBy ?? params.sort,
            sort: params.sort,
            order: params.order,
        };
        return api.get<SearchResponse>('/api/search/items', queryParams);
    },

    async searchEntries(params: SearchParams): Promise<SearchEntriesResponse> {
        const queryParams: Record<string, string | number | undefined> = {
            q: params.q,
            page: params.page,
            pageSize: params.pageSize,
            type: params.type,
            rootId: params.rootId,
            tag: params.tag,
            sortBy: params.sortBy ?? params.sort,
            order: params.order,
        };
        return api.get<SearchEntriesResponse>('/api/search/entries', queryParams);
    },
};
