import { useState } from 'react';
import { ArrowTopRightOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { ItemType } from '../../types/api';
import { useFilePreview } from '../../hooks/useFilePreview';
import { itemService } from '../../services/itemService';

type PreviewPanelProps = {
  itemId?: string;
  title?: string;
  path?: string;
  type?: ItemType;
  size?: number;
  ext?: string | null;
  emptyText?: string;
};

export function PreviewPanel({ itemId, title, path, type, size, ext, emptyText = 'Please select a file to preview.' }: PreviewPanelProps) {
  const [openError, setOpenError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const preview = useFilePreview({ itemId, type, size, ext });

  async function openExternal() {
    if (!itemId) return;
    setOpening(true);
    setOpenError(null);
    try {
      await itemService.openItemExternally(itemId);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : 'Failed to open file.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <section className="flex h-full min-h-[380px] flex-col rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title ?? 'Preview'}</p>
          {path ? <p className="truncate text-xs text-muted-foreground">{path}</p> : null}
        </div>
        {itemId ? (
          <button
            type="button"
            onClick={() => void openExternal()}
            disabled={opening}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            {opening ? 'Opening...' : 'Open in Windows'}
          </button>
        ) : null}
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        {!itemId ? <Empty text={emptyText} /> : null}
        {itemId && preview.isLoading ? <Empty text="Loading preview..." /> : null}
        {itemId && preview.tooLarge ? <Empty text="This file is too large for browser preview. Open it in Windows instead." /> : null}
        {itemId && preview.error ? <Empty text={preview.error} /> : null}
        {itemId && !preview.isLoading && !preview.error && !preview.tooLarge ? (
          <div className="flex h-full w-full items-center justify-center">
            {preview.mode === 'image' && preview.src ? <img src={preview.src} alt={title ?? 'preview'} className="h-full w-full object-contain" /> : null}
            {preview.mode === 'video' && preview.src ? <video src={preview.src} controls className="h-full w-full bg-black object-contain" /> : null}
            {preview.mode === 'audio' && preview.src ? <audio src={preview.src} controls className="w-full" /> : null}
            {preview.mode === 'pdf' && preview.src ? <iframe src={preview.src} title={title ?? 'pdf-preview'} className="h-full w-full rounded border border-border" /> : null}
            {preview.mode === 'text' ? (
              <pre className="h-full w-full overflow-auto whitespace-pre-wrap rounded border border-border bg-secondary/20 p-3 text-xs text-foreground">
                {preview.text ?? ''}
              </pre>
            ) : null}
            {preview.mode === 'unsupported' ? <Empty text="Browser preview is not supported for this file type." /> : null}
          </div>
        ) : null}
      </div>

      {openError ? <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">{openError}</div> : null}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
      <DocumentTextIcon className="h-10 w-10 opacity-40" />
      <p className="max-w-sm text-sm">{text}</p>
    </div>
  );
}
