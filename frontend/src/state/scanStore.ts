import { create } from 'zustand';
import type { ScanTask } from '../types/api';
import { scanService } from '../services/scanService';
import { ApiRequestError } from '../services/apiService';

interface ScanState {
    currentTask: ScanTask | null;
    isScanning: boolean;
    error: string | null;
    _pollTimer: ReturnType<typeof setInterval> | null;

    startFullScan: () => Promise<void>;
    startIncrementalScan: () => Promise<void>;
    pollTask: (taskId: string) => void;
    stopPolling: () => void;
    clearError: () => void;
}

const POLL_INTERVAL = 2000;

export const useScanStore = create<ScanState>((set, get) => ({
    currentTask: null,
    isScanning: false,
    error: null,
    _pollTimer: null,

    async startFullScan() {
        set({ isScanning: true, error: null });
        try {
            const enqueued = await scanService.startFullScan();
            const task = await scanService.getTask(enqueued.taskId);
            set({ currentTask: task });
            get().pollTask(enqueued.taskId);
        } catch (err) {
            const message = err instanceof ApiRequestError ? err.message : '启动全量扫描失败';
            set({ isScanning: false, error: message });
        }
    },

    async startIncrementalScan() {
        set({ isScanning: true, error: null });
        try {
            const enqueued = await scanService.startIncrementalScan();
            const task = await scanService.getTask(enqueued.taskId);
            set({ currentTask: task });
            get().pollTask(enqueued.taskId);
        } catch (err) {
            const message = err instanceof ApiRequestError ? err.message : '启动增量扫描失败';
            set({ isScanning: false, error: message });
        }
    },

    pollTask(taskId: string) {
        // Clear any existing poll
        get().stopPolling();

        const timer = setInterval(async () => {
            try {
                const task = await scanService.getTask(taskId);
                set({ currentTask: task });

                // Stop polling when task is done
                if (task.status === 'success' || task.status === 'failed' || task.status === 'canceled') {
                    get().stopPolling();
                    set({ isScanning: false });
                }
            } catch (err) {
                const message = err instanceof ApiRequestError ? err.message : '获取扫描状态失败';
                set({ error: message });
                get().stopPolling();
                set({ isScanning: false });
            }
        }, POLL_INTERVAL);

        set({ _pollTimer: timer });
    },

    stopPolling() {
        const timer = get()._pollTimer;
        if (timer) {
            clearInterval(timer);
            set({ _pollTimer: null });
        }
    },

    clearError() {
        set({ error: null });
    },
}));
