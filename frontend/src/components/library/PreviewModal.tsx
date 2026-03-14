import { useEffect, useState } from 'react';
import { ArrowTopRightOnSquareIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { ItemType } from '../../types/api';
import { useFilePreview } from '../../hooks/useFilePreview';
import { itemService } from '../../services/itemService';
import { libraryService } from '../../services/libraryService';

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
};

export function PreviewModal({ isOpen, onClose, itemId, rootId, relPath, title, path, type, size, ext }: PreviewModalProps) {
  const [openError, setOpenError] = useState<string | null>(null);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const preview = useFilePreview({ itemId, rootId, relPath, type, size, ext });
  const isIndexed = Boolean(itemId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  async function openWindows() {
    if (!itemId && !(rootId && relPath)) return;

    setOpenError(null);
    setOpenInfo(null);
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
        throw firstError ?? new Error('打开文件失败。');
      }

      setOpenInfo('已使用 Windows 默认程序打开。');
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : '打开文件失败。');
    } finally {
      setOpening(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6" onClick={onClose}>
      <div
        className="flex h-[92vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{title ?? '预览'}</p>
            {path ? <p className="truncate text-xs text-muted-foreground">{path}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {itemId || (rootId && relPath) ? (
              <button
                type="button"
                onClick={() => void openWindows()}
                disabled={opening}
                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-secondary disabled:opacity-60"
              >
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                {opening ? '正在打开...' : '在 Windows 中打开'}
              </button>
            ) : null}
            <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-secondary" onClick={onClose}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-4">
          {preview.isLoading ? <Empty text="正在加载预览..." /> : null}
          {!preview.isLoading && preview.tooLarge ? <Empty text="该文件过大，无法在浏览器中预览，请改用 Windows 打开。" /> : null}
          {!preview.isLoading && preview.error ? <Empty text={preview.error} /> : null}
          {!preview.isLoading && !preview.error && !preview.tooLarge ? (
            <div className="h-full w-full">
              {preview.mode === 'image' && preview.src ? <img src={preview.src} alt={title ?? '预览'} className="h-full w-full object-contain" /> : null}
              {preview.mode === 'video' && preview.src ? <video src={preview.src} controls className="h-full w-full bg-black object-contain" /> : null}
              {preview.mode === 'audio' && preview.src ? <audio src={preview.src} controls className="w-full" /> : null}
              {preview.mode === 'pdf' && preview.src ? <iframe src={preview.src} title={title ?? '预览'} className="h-full w-full rounded border border-border" /> : null}
              {preview.mode === 'text' ? (
                <pre className="h-full w-full overflow-auto whitespace-pre-wrap rounded border border-border bg-secondary/20 p-3 text-xs text-foreground">
                  {preview.text ?? ''}
                </pre>
              ) : null}
              {preview.mode === 'unsupported' ? (
                <Empty
                  text={
                    isIndexed
                      ? '当前文件类型暂不支持浏览器预览，但仍可在 Windows 中打开。'
                      : '该文件尚未建立索引，暂不支持此类型的浏览器预览，但仍可在 Windows 中打开。'
                  }
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {!isIndexed && !preview.isLoading && !preview.error && !preview.tooLarge && preview.mode !== 'unsupported' ? (
          <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-700">
            该文件尚未建立索引，当前显示的是资源库路径的直接预览。
          </div>
        ) : null}
        {openInfo ? <div className="border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-700">{openInfo}</div> : null}
        {openError ? <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">{openError}</div> : null}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <DocumentTextIcon className="h-12 w-12 opacity-40" />
      <p className="max-w-md text-sm">{text}</p>
    </div>
  );
}
