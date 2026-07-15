import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { useI18n } from '../../hooks/useI18n';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message, className, fullScreen }: LoadingSpinnerProps) {
  const { t } = useI18n();
  const resolvedMessage = message ?? t('common.loading');
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} role="status" aria-live="polite">
      <ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
      {resolvedMessage ? <span className="text-sm font-medium text-muted-foreground">{resolvedMessage}</span> : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="app-surface p-6">{content}</div>
      </div>
    );
  }

  return content;
}
