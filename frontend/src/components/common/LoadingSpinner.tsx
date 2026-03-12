import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message = '加载中...', className, fullScreen }: LoadingSpinnerProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} role="status" aria-live="polite">
      <ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
      {message ? <span className="text-sm font-medium text-muted-foreground">{message}</span> : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">{content}</div>
      </div>
    );
  }

  return content;
}
