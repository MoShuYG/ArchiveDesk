import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useScanStore } from '../../state/scanStore';
import { cn } from '../../utils/cn';

export function ScanProgress() {
  const currentTask = useScanStore((s) => s.currentTask);
  const isScanning = useScanStore((s) => s.isScanning);
  const error = useScanStore((s) => s.error);
  const startFullScan = useScanStore((s) => s.startFullScan);
  const startIncrementalScan = useScanStore((s) => s.startIncrementalScan);

  const isSuccess = currentTask?.status === 'success';
  const isFailed = currentTask?.status === 'failed';
  const progressPercent =
    currentTask?.totalFiles && currentTask.totalFiles > 0 ? Math.round((currentTask.processedFiles / currentTask.totalFiles) * 100) : 0;

  const startedAt = currentTask?.startedAt ? new Date(Number(currentTask.startedAt)) : null;
  const finishedAt = currentTask?.finishedAt ? new Date(Number(currentTask.finishedAt)) : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-border bg-secondary/30 px-6 py-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ArrowPathIcon className={cn('h-5 w-5', isScanning && 'animate-spin text-primary')} />
            扫描资源库
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">同步本地文件系统中的资源与元数据。</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={startIncrementalScan}
            disabled={isScanning}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            增量扫描
          </button>
          <button
            type="button"
            onClick={startFullScan}
            disabled={isScanning}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            全量扫描
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 bg-destructive/10 px-6 py-4">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm text-destructive">{error}</div>
        </div>
      ) : null}

      {currentTask ? (
        <div className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{currentTask.type === 'full' ? '全量扫描' : '增量扫描'}</span>
              <StatusBadge status={currentTask.status} />
            </div>
            {isScanning ? <span className="text-sm font-semibold text-primary">{progressPercent}%</span> : null}
          </div>

          <div className="mb-4 h-3 w-full overflow-hidden rounded-full border border-border/50 bg-secondary">
            <div
              className={cn('h-full transition-all duration-500 ease-out', isFailed ? 'bg-destructive' : isSuccess ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${Math.max(progressPercent, 5)}%` }}
            >
              {isScanning ? <div className="h-full w-full animate-[progress-pulse_1s_ease-in-out_infinite] bg-white/20" /> : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBox label="已处理" value={`${currentTask.processedFiles} / ${currentTask.totalFiles}`} />
            <StatBox label="新增" value={currentTask.createdFiles} color="text-emerald-500" />
            <StatBox label="更新" value={currentTask.updatedFiles} color="text-amber-500" />
            <StatBox label="删除" value={currentTask.deletedFiles} color="text-destructive" />
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row">
            {startedAt ? <span>开始：{startedAt.toLocaleString()}</span> : null}
            {finishedAt ? <span>结束：{finishedAt.toLocaleString()}</span> : null}
            {currentTask.errorMessage ? <span className="text-destructive sm:ml-auto">错误：{currentTask.errorMessage}</span> : null}
          </div>

          {currentTask.warnings.length > 0 ? (
            <div className="mt-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-500">
                <InformationCircleIcon className="h-4 w-4" />
                扫描警告 ({currentTask.warnings.length})
              </h4>
              <ul className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/50 bg-secondary/20 p-3 pr-2 text-sm text-muted-foreground">
                {currentTask.warnings.map((warning, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                    <span className="break-all">{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatBox({ label, value, color = 'text-foreground' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-secondary/40 p-3 text-center">
      <span className="mb-1 text-xs text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-xl font-bold tracking-tight', color)}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: 'border-border bg-secondary text-secondary-foreground',
    running: 'border-primary/20 bg-primary/10 text-primary',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    failed: 'border-destructive/20 bg-destructive/10 text-destructive',
  };

  const icons: Record<string, ReactNode> = {
    running: <ArrowPathIcon className="mr-1 inline-block h-3 w-3 animate-spin" />,
    success: <CheckCircleIcon className="mr-1 inline-block h-3 w-3" />,
    failed: <ExclamationTriangleIcon className="mr-1 inline-block h-3 w-3" />,
  };

  const labels: Record<string, string> = {
    queued: '排队中',
    running: '扫描中',
    success: '已完成',
    failed: '失败',
  };

  return (
    <span className={cn('flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', styles[status] || styles.queued)}>
      {icons[status] || null}
      {labels[status] || status}
    </span>
  );
}
