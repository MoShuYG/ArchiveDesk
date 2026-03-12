import { create } from 'zustand';
import type { Item, ItemType, SearchSort } from '../types/api';
import { searchService } from '../services/searchService';
import { ApiRequestError } from '../services/apiService';

interface SearchState {
    // Query state
    query: string;
    type: ItemType | undefined;
    rootId: string | undefined;
    tag: string | undefined;
    sort: SearchSort;
    order: 'asc' | 'desc';
    page: number;
    pageSize: number;

    // Results
    results: Item[];
    total: number;
    isLoading: boolean;
    error: string | null;

    // Actions
    setQuery: (query: string) => void;
    setType: (type: ItemType | undefined) => void;
    setRootId: (rootId: string | undefined) => void;
    setTag: (tag: string | undefined) => void;
    setSort: (sort: SearchSort) => void;
    setOrder: (order: 'asc' | 'desc') => void;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    search: () => Promise<void>;
    reset: () => void;
    clearError: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

export const useSearchStore = create<SearchState>((set, get) => ({
    query: '',
    type: undefined,
    rootId: undefined,
    tag: undefined,
    sort: 'relevance',
    order: 'asc',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,

    results: [],
    total: 0,
    isLoading: false,
    error: null,

    setQuery(query: string) {
        set({ query, page: 1 });
    },

    setType(type: ItemType | undefined) {
        set({ type, page: 1 });
    },

    setRootId(rootId: string | undefined) {
        set({ rootId, page: 1 });
    },

    setTag(tag: string | undefined) {
        set({ tag, page: 1 });
    },

    setSort(sort: SearchSort) {
        set((state) => ({
            sort,
            order: sort === 'relevance' ? 'asc' : state.order,
            page: 1,
        }));
    },

    setOrder(order: 'asc' | 'desc') {
        set({ order, page: 1 });
    },

    setPage(page: number) {
        set({ page });
    },

    setPageSize(pageSize: number) {
        set({ pageSize, page: 1 });
    },

    async search() {
        const { query, type, rootId, tag, sort, order, page, pageSize } = get();
        set({ isLoading: true, error: null });
        try {
            const response = await searchService.searchItems({
                q: query || undefined,
                page,
                pageSize,
                type,
                rootId,
                tag,
                sortBy: sort,
                order,
            });
            set({
                results: response.items,
                total: response.total,
                isLoading: false,
            });
        } catch (err) {
            const message = err instanceof ApiRequestError ? err.message : '搜索失败';
            set({ isLoading: false, error: message });
        }
    },

    reset() {
        set({
            query: '',
            type: undefined,
            rootId: undefined,
            tag: undefined,
            sort: 'relevance',
            order: 'asc',
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            results: [],
            total: 0,
            error: null,
        });
    },

    clearError() {
        set({ error: null });
    },
}));
