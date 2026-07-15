import { create } from 'zustand';
import type { ScanTask } from '../types/api';
import { scanService } from '../services/scanService';
import type { LocalizedError } from '../i18n';

interface ScanState {
  currentTask: ScanTask | null;
  isScanning: boolean;
  error: LocalizedError | null;
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
      set({ isScanning: false, error: { value: err, fallbackKey: 'errors.startFullScanFailed' } });
    }
  },

  async startIncrementalScan() {
    try {
      const enqueued = await scanService.startIncrementalScan();
      await get().trackTask(enqueued.taskId);
    } catch (err) {
      set({ isScanning: false, error: { value: err, fallbackKey: 'errors.startIncrementalScanFailed' } });
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
      set({ isScanning: false, error: { value: err, fallbackKey: 'errors.loadScanFailed' } });
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
        set({ error: { value: err, fallbackKey: 'errors.loadScanFailed' } });
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
