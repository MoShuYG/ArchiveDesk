import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useScanStore } from '../../state/scanStore';
import { cn } from '../../utils/cn';
import { useI18n } from '../../hooks/useI18n';
import type { ScanTaskStatus } from '../../types/api';

export function ScanProgress() {
  const currentTask = useScanStore((s) => s.currentTask);
  const isScanning = useScanStore((s) => s.isScanning);
  const error = useScanStore((s) => s.error);
  const startFullScan = useScanStore((s) => s.startFullScan);
  const startIncrementalScan = useScanStore((s) => s.startIncrementalScan);
  const { locale, t, localizeError, localizeExternalMessage } = useI18n();

  const isSuccess = currentTask?.status === 'success';
  const isFailed = currentTask?.status === 'failed';
  const progressPercent =
    currentTask?.totalFiles && currentTask.totalFiles > 0 ? Math.round((currentTask.processedFiles / currentTask.totalFiles) * 100) : 0;

  const startedAt = currentTask?.startedAt ? new Date(Number(currentTask.startedAt)) : null;
  const finishedAt = currentTask?.finishedAt ? new Date(Number(currentTask.finishedAt)) : null;

  return (
    <section className="app-surface overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowPathIcon className={cn('h-5 w-5', isScanning && 'animate-spin')} />
            </span>
            {t('scan.title')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('scan.description')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <button
            type="button"
            onClick={startIncrementalScan}
            disabled={isScanning}
            className="app-button-secondary"
          >
            {t('scan.incremental')}
          </button>
          <button
            type="button"
            onClick={startFullScan}
            disabled={isScanning}
            className="app-button-primary"
          >
            {t('scan.full')}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 bg-destructive/10 px-6 py-4">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm text-destructive">{localizeError(error.value, error.fallbackKey)}</div>
        </div>
      ) : null}

      {currentTask ? (
        <div className="p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{currentTask.type === 'full' ? t('scan.full') : t('scan.incremental')}</span>
              <StatusBadge status={currentTask.status} />
            </div>
            {isScanning ? <span className="text-sm font-semibold text-primary">{progressPercent}%</span> : null}
          </div>

          <div
            className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-inset ring-border/60"
            role="progressbar"
            aria-label={t('scan.progress')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div
              className={cn('h-full transition-all duration-500 ease-out', isFailed ? 'bg-destructive' : isSuccess ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${Math.max(progressPercent, 5)}%` }}
            >
              {isScanning ? <div className="h-full w-full animate-[progress-pulse_1s_ease-in-out_infinite] bg-white/20" /> : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label={t('scan.processed')} value={`${currentTask.processedFiles} / ${currentTask.totalFiles}`} />
            <StatBox label={t('scan.created')} value={currentTask.createdFiles} color="text-emerald-500" />
            <StatBox label={t('scan.updated')} value={currentTask.updatedFiles} color="text-amber-500" />
            <StatBox label={t('scan.deleted')} value={currentTask.deletedFiles} color="text-destructive" />
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row">
            {startedAt ? <span>{t('scan.startedAt', { time: startedAt.toLocaleString(locale) })}</span> : null}
            {finishedAt ? <span>{t('scan.finishedAt', { time: finishedAt.toLocaleString(locale) })}</span> : null}
            {currentTask.errorMessage ? (
              <span className="text-destructive sm:ml-auto">
                {t('scan.error', { message: localizeExternalMessage(currentTask.errorMessage, 'errors.generic') })}
              </span>
            ) : null}
          </div>

          {currentTask.warnings.length > 0 ? (
            <div className="mt-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-500">
                <InformationCircleIcon className="h-4 w-4" />
                {t('scan.warnings', { count: currentTask.warnings.length })}
              </h4>
              <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 pr-2 text-sm text-muted-foreground">
                {currentTask.warnings.map((warning, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                    <span className="break-all">{localizeExternalMessage(warning, 'warnings.generic')}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function StatBox({ label, value, color = 'text-foreground' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary/35 p-3 text-center">
      <span className="mb-1 text-xs text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-xl font-bold tracking-tight', color)}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ScanTaskStatus }) {
  const { t } = useI18n();
  const styles: Record<string, string> = {
    queued: 'border-border bg-secondary text-secondary-foreground',
    running: 'border-primary/20 bg-primary/10 text-primary',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    failed: 'border-destructive/20 bg-destructive/10 text-destructive',
    canceled: 'border-border bg-secondary text-muted-foreground',
  };

  const icons: Record<string, ReactNode> = {
    running: <ArrowPathIcon className="mr-1 inline-block h-3 w-3 animate-spin" />,
    success: <CheckCircleIcon className="mr-1 inline-block h-3 w-3" />,
    failed: <ExclamationTriangleIcon className="mr-1 inline-block h-3 w-3" />,
  };

  const labels: Record<ScanTaskStatus, ReturnType<typeof t>> = {
    queued: t('scan.status.queued'),
    running: t('scan.status.running'),
    success: t('scan.status.success'),
    failed: t('scan.status.failed'),
    canceled: t('scan.status.canceled'),
  };

  return (
    <span className={cn('flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', styles[status] || styles.queued)}>
      {icons[status] || null}
      {labels[status] || t('scan.status.unknown')}
    </span>
  );
}
