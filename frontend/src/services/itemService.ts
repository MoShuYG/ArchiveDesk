import { api } from './apiService';
import type { Item, OpenExternalResponse } from '../types/api';

export const itemService = {
  async getItemById(itemId: string): Promise<Item> {
    return api.get<Item>(`/api/items/${itemId}`);
  },

  async openItemExternally(itemId: string): Promise<OpenExternalResponse> {
    return api.post<OpenExternalResponse>(`/api/items/${itemId}/open`);
  },
};
