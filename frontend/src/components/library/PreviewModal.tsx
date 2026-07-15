import { useEffect, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { ItemType } from '../../types/api';
import { useFilePreview } from '../../hooks/useFilePreview';
import { itemService } from '../../services/itemService';
import { libraryService } from '../../services/libraryService';
import { DocxPreview } from './DocxPreview';
import { PdfPreview } from './PdfPreview';
import { useI18n } from '../../hooks/useI18n';

type PreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  rootId?: string;
  relPath?: string;
  title?: string;
  path?: string;
  type?: ItemType;
  size?: number;
  ext?: string | null;
  navigation?: {
    position: number;
    total: number;
    onPrevious?: () => void;
    onNext?: () => void;
  };
};

function shouldIgnoreArrowNavigation(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, button, audio, video, [contenteditable="true"], [data-preview-interactive]'));
}

export function PreviewModal({
  isOpen,
  onClose,
  itemId,
  rootId,
  relPath,
  title,
  path,
  type,
  size,
  ext,
  navigation,
}: PreviewModalProps) {
  const { t, localizeError } = useI18n();
  const [openError, setOpenError] = useState<unknown | null>(null);
  const [openInfo, setOpenInfo] = useState(false);
  const [opening, setOpening] = useState(false);
  const preview = useFilePreview({ itemId, rootId, relPath, type, size, ext });
  const isIndexed = Boolean(itemId);

  useEffect(() => {
    setOpenError(null);
    setOpenInfo(false);
  }, [itemId, relPath, rootId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || shouldIgnoreArrowNavigation(event.target)) {
        return;
      }
      if (event.key === 'ArrowLeft' && navigation?.onPrevious) {
        event.preventDefault();
        navigation.onPrevious();
      }
      if (event.key === 'ArrowRight' && navigation?.onNext) {
        event.preventDefault();
        navigation.onNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, navigation, onClose]);

  async function openWindows() {
    if (!itemId && !(rootId && relPath)) return;

    setOpenError(null);
    setOpenInfo(false);
    setOpening(true);
    try {
      let result: { ok: true } | null = null;
      let firstError: unknown;

      if (itemId) {
        try {
          result = await itemService.openItemExternally(itemId);
        } catch (error) {
          firstError = error;
        }
      }

      if (!result && rootId && relPath) {
        result = await libraryService.openExplorerEntry({ rootId, relPath });
      }

      if (!result) {
        throw firstError ?? new Error();
      }

      setOpenInfo(true);
    } catch (error) {
      setOpenError(error);
    } finally {
      setOpening(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        className="flex h-[calc(100dvh-1.5rem)] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:h-[92vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{title ?? t('preview.title')}</p>
            {path ? <p className="truncate text-xs text-muted-foreground">{path}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {itemId || (rootId && relPath) ? (
              <button
                type="button"
                onClick={() => void openWindows()}
                disabled={opening}
                className="app-button-secondary min-h-9 px-3 text-xs"
              >
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                {opening ? t('preview.opening') : t('preview.openInWindows')}
              </button>
            ) : null}
            <button type="button" className="app-icon-button" onClick={onClose} aria-label={t('preview.close')}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-secondary/15 p-3 sm:p-4">
          {preview.isLoading ? <Empty text={t('preview.loading')} /> : null}
          {!preview.isLoading && preview.tooLarge ? <Empty text={t('preview.tooLarge')} /> : null}
          {!preview.isLoading && preview.error ? <Empty text={preview.error} /> : null}
          {!preview.isLoading && !preview.error && !preview.tooLarge ? (
            <div className="h-full w-full">
              {preview.mode === 'image' && preview.src ? <img src={preview.src} alt={title ?? t('preview.title')} className="h-full w-full object-contain" /> : null}
              {preview.mode === 'video' && preview.src ? <video src={preview.src} controls className="h-full w-full bg-black object-contain" /> : null}
              {preview.mode === 'audio' && preview.src ? <audio src={preview.src} controls className="w-full" /> : null}
              {preview.mode === 'pdf' && preview.data ? <PdfPreview data={preview.data} title={title ?? t('preview.title')} /> : null}
              {preview.mode === 'docx' && preview.data ? <DocxPreview data={preview.data} title={title ?? t('preview.title')} /> : null}
              {preview.mode === 'text' ? (
                <pre className="h-full w-full overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-xs leading-6 text-foreground">
                  {preview.text ?? ''}
                </pre>
              ) : null}
              {preview.mode === 'unsupported' ? (
                <Empty
                  text={
                    isIndexed
                      ? t('preview.unsupportedIndexed')
                      : t('preview.unsupportedDirect')
                  }
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {navigation ? (
          <nav className="flex items-center justify-between gap-3 border-t border-border bg-card px-3 py-2.5 sm:px-5" aria-label={t('preview.navigation')}>
            <button
              type="button"
              className="app-button-secondary min-h-9 px-3 text-xs sm:min-w-28"
              onClick={navigation.onPrevious}
              disabled={!navigation.onPrevious}
              aria-label={t('preview.previousFile')}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span>{t('preview.previous')}</span>
            </button>
            <div className="min-w-0 text-center" aria-live="polite">
              <p className="text-xs font-semibold text-foreground">
                {t('preview.position', { position: navigation.position, total: navigation.total })}
              </p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">{t('preview.navigationHint')}</p>
            </div>
            <button
              type="button"
              className="app-button-secondary min-h-9 px-3 text-xs sm:min-w-28"
              onClick={navigation.onNext}
              disabled={!navigation.onNext}
              aria-label={t('preview.nextFile')}
            >
              <span>{t('preview.next')}</span>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </nav>
        ) : null}

        {!isIndexed && !preview.isLoading && !preview.error && !preview.tooLarge && preview.mode !== 'unsupported' ? (
          <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-700">
            {t('preview.directNotice')}
          </div>
        ) : null}
        {openInfo ? <div className="border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-700">{t('preview.openedInWindows')}</div> : null}
        {openError ? <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">{localizeError(openError, 'errors.openFileFailed')}</div> : null}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 px-4 text-center text-muted-foreground">
      <DocumentTextIcon className="h-10 w-10 opacity-50" />
      <p className="max-w-md text-sm">{text}</p>
    </div>
  );
}
