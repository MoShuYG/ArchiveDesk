import { useEffect, useRef, type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { useI18n } from '../../hooks/useI18n';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleClose() {
      onClose();
    }

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto w-[calc(100%_-_2rem)] max-w-lg rounded-xl bg-transparent p-0 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm',
        'open:animate-in open:zoom-in-95 open:fade-in-90 duration-150',
        className
      )}
    >
      <div className="flex h-full max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
        {title ? (
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="app-icon-button -mr-2"
              aria-label={t('common.close')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="app-icon-button absolute right-4 top-4 z-10"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </dialog>
  );
}
