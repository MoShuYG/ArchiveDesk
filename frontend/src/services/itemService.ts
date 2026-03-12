import { api } from './apiService';
import type { Item } from '../types/api';

export const itemService = {
  async getItemById(itemId: string): Promise<Item> {
    return api.get<Item>(`/api/items/${itemId}`);
  },

  async openItemExternally(itemId: string): Promise<{ ok: true; openedWith: 'quickviewer' | 'system' }> {
    return api.post<{ ok: true; openedWith: 'quickviewer' | 'system' }>(`/api/items/${itemId}/open`);
  },
};
