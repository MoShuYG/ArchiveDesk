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
  trackTask: (taskId: string) => Promise<void>;
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
    try {
      const enqueued = await scanService.startFullScan();
      await get().trackTask(enqueued.taskId);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to start full scan.';
      set({ isScanning: false, error: message });
    }
  },

  async startIncrementalScan() {
    try {
      const enqueued = await scanService.startIncrementalScan();
      await get().trackTask(enqueued.taskId);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to start incremental scan.';
      set({ isScanning: false, error: message });
    }
  },

  async trackTask(taskId: string) {
    set({ isScanning: true, error: null });
    try {
      const task = await scanService.getTask(taskId);
      set({
        currentTask: task,
        isScanning: task.status === 'queued' || task.status === 'running',
      });
      if (task.status === 'success' || task.status === 'failed' || task.status === 'canceled') {
        get().stopPolling();
        return;
      }
      get().pollTask(taskId);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to load scan status.';
      set({ isScanning: false, error: message });
      throw err;
    }
  },

  pollTask(taskId: string) {
    get().stopPolling();
    set({ isScanning: true });

    const timer = setInterval(async () => {
      try {
        const task = await scanService.getTask(taskId);
        set({ currentTask: task });

        if (task.status === 'success' || task.status === 'failed' || task.status === 'canceled') {
          get().stopPolling();
          set({ isScanning: false });
        }
      } catch (err) {
        const message = err instanceof ApiRequestError ? err.message : 'Failed to load scan status.';
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
