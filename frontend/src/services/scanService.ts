import { api } from './apiService';
import type { ScanEnqueueResponse, ScanTask } from '../types/api';

export const scanService = {
    async startFullScan(): Promise<ScanEnqueueResponse> {
        return api.post<ScanEnqueueResponse>('/api/scan/full');
    },

    async startIncrementalScan(): Promise<ScanEnqueueResponse> {
        return api.post<ScanEnqueueResponse>('/api/scan/incremental');
    },

    async getTask(taskId: string): Promise<ScanTask> {
        return api.get<ScanTask>(`/api/scan/tasks/${taskId}`);
    },
};
