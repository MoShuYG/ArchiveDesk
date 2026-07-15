import { useState } from 'react';
import { ArrowTopRightOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { ItemType } from '../../types/api';
import { useFilePreview } from '../../hooks/useFilePreview';
import { itemService } from '../../services/itemService';
import { DocxPreview } from './DocxPreview';
import { PdfPreview } from './PdfPreview';
import { useI18n } from '../../hooks/useI18n';

type PreviewPanelProps = {
  itemId?: string;
  title?: string;
  path?: string;
  type?: ItemType;
  size?: number;
  ext?: string | null;
  emptyText?: string;
};

export function PreviewPanel({ itemId, title, path, type, size, ext, emptyText }: PreviewPanelProps) {
  const { t, localizeError } = useI18n();
  const [openError, setOpenError] = useState<unknown | null>(null);
  const [opening, setOpening] = useState(false);
  const preview = useFilePreview({ itemId, type, size, ext });
  const resolvedEmptyText = emptyText ?? t('preview.selectFile');

  async function openExternal() {
    if (!itemId) return;
    setOpening(true);
    setOpenError(null);
    try {
      await itemService.openItemExternally(itemId);
    } catch (error) {
      setOpenError(error);
    } finally {
      setOpening(false);
    }
  }

  return (
    <section className="app-surface flex h-full min-h-[380px] flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title ?? t('preview.title')}</p>
          {path ? <p className="truncate text-xs text-muted-foreground">{path}</p> : null}
        </div>
        {itemId ? (
          <button
            type="button"
            onClick={() => void openExternal()}
            disabled={opening}
            className="app-button-secondary min-h-9 px-3 text-xs"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            {opening ? t('preview.opening') : t('preview.openInWindows')}
          </button>
        ) : null}
      </header>

      <div className="flex flex-1 items-center justify-center bg-secondary/15 p-4">
        {!itemId ? <Empty text={resolvedEmptyText} /> : null}
        {itemId && preview.isLoading ? <Empty text={t('preview.loading')} /> : null}
        {itemId && preview.tooLarge ? <Empty text={t('preview.tooLarge')} /> : null}
        {itemId && preview.error ? <Empty text={preview.error} /> : null}
        {itemId && !preview.isLoading && !preview.error && !preview.tooLarge ? (
          <div className="flex h-full w-full items-center justify-center">
            {preview.mode === 'image' && preview.src ? <img src={preview.src} alt={title ?? t('preview.title')} className="h-full w-full object-contain" /> : null}
            {preview.mode === 'video' && preview.src ? <video src={preview.src} controls className="h-full w-full bg-black object-contain" /> : null}
            {preview.mode === 'audio' && preview.src ? <audio src={preview.src} controls className="w-full" /> : null}
            {preview.mode === 'pdf' && preview.data ? <PdfPreview data={preview.data} title={title ?? t('preview.pdfTitle')} /> : null}
            {preview.mode === 'docx' && preview.data ? <DocxPreview data={preview.data} title={title ?? t('preview.docxTitle')} /> : null}
            {preview.mode === 'text' ? (
              <pre className="h-full w-full overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-xs leading-6 text-foreground">
                {preview.text ?? ''}
              </pre>
            ) : null}
            {preview.mode === 'unsupported' ? <Empty text={t('preview.unsupported')} /> : null}
          </div>
        ) : null}
      </div>

      {openError ? <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">{localizeError(openError, 'errors.openFileFailed')}</div> : null}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
      <DocumentTextIcon className="h-10 w-10 opacity-50" />
      <p className="max-w-sm text-sm">{text}</p>
    </div>
  );
}
