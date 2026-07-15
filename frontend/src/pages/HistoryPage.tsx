import { useEffect, useMemo, useState } from 'react';
import { ClockIcon, BarsArrowDownIcon, PhotoIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, DocumentIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Pagination } from '../components/common/Pagination';
import { PreviewModal } from '../components/library/PreviewModal';
import { historyService } from '../services/historyService';
import { libraryService } from '../services/libraryService';
import { itemService } from '../services/itemService';
import type { HistoryEntry, ItemType } from '../types/api';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';
import { resolvePreviewNavigation } from '../utils/previewNavigation';
import { useI18n } from '../hooks/useI18n';
import type { MessageKey } from '../i18n';
import { ITEM_TYPE_LABEL_KEYS } from '../i18n/labels';

type HistorySortBy = 'lastAccessedAt' | 'name' | 'type' | 'updatedAt' | 'size';

const SORT_OPTIONS: Array<{ labelKey: MessageKey; value: HistorySortBy }> = [
  { labelKey: 'common.recentlyAccessed', value: 'lastAccessedAt' },
  { labelKey: 'common.name', value: 'name' },
  { labelKey: 'common.type', value: 'type' },
  { labelKey: 'common.modifiedTime', value: 'updatedAt' },
  { labelKey: 'common.size', value: 'size' },
];

const TYPE_ICONS: Record<ItemType, typeof DocumentIcon> = {
  video: FilmIcon,
  image: PhotoIcon,
  audio: MusicalNoteIcon,
  voice: MusicalNoteIcon,
  novel: DocumentTextIcon,
  booklet: DocumentIcon,
  other: DocumentIcon,
};

function HistoryEntryThumb({ entry }: { entry: HistoryEntry }) {
  const thumbnailUrl =
    (entry.item.type === 'image' || entry.item.type === 'video') && entry.item.id && entry.item.ext !== 'tga'
      ? `/api/items/${entry.item.id}/thumbnail`
      : null;
  const { src, isLoading } = useAuthenticatedImage(thumbnailUrl);
  const Icon = TYPE_ICONS[entry.item.type];

  if (src) {
    return <img src={src} alt={entry.item.title} className="h-10 w-10 rounded-lg border border-border object-cover" />;
  }
  if (isLoading) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/40">
        <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/40">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

export function HistoryPage() {
  const { locale, t, localizeError } = useI18n();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [roots, setRoots] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRootId, setSelectedRootId] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<HistorySortBy>('lastAccessedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [preview, setPreview] = useState<{ itemId: string; title: string; path: string; type: ItemType; ext?: string | null } | null>(null);
  const [previewSize, setPreviewSize] = useState<number | undefined>(undefined);
  const [openError, setOpenError] = useState<unknown | null>(null);

  const pageSize = 50;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const previewNavigation = useMemo(
    () =>
      preview
        ? resolvePreviewNavigation(entries, preview.itemId, {
            getKey: (entry) => entry.item.id,
          })
        : null,
    [entries, preview],
  );
  const previousPreviewEntry = previewNavigation?.previous ?? null;
  const nextPreviewEntry = previewNavigation?.next ?? null;

  useEffect(() => {
    libraryService
      .listRoots()
      .then((data) => setRoots(data.map((root) => ({ id: root.id, name: root.name }))))
      .catch(() => setRoots([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await historyService.listHistory({
          page,
          pageSize,
          rootId: selectedRootId === 'all' ? undefined : selectedRootId,
          sortBy,
          order,
        });
        if (cancelled) return;
        setEntries(response.items);
        setTotal(response.total);
      } catch (err) {
        if (cancelled) return;
        setError(err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [order, page, selectedRootId, sortBy]);

  useEffect(() => {
    let cancelled = false;
    async function loadSize() {
      if (!preview) {
        setPreviewSize(undefined);
        return;
      }
      try {
        const item = await itemService.getItemById(preview.itemId);
        if (!cancelled) {
          setPreviewSize(item.size);
        }
      } catch {
        if (!cancelled) {
          setPreviewSize(undefined);
        }
      }
    }
    void loadSize();
    return () => {
      cancelled = true;
    };
  }, [preview]);

  async function openInWindows(entry: HistoryEntry) {
    setOpenError(null);
    try {
      await itemService.openItemExternally(entry.item.id);
    } catch (err) {
      setOpenError(err);
    }
  }

  function openPreview(entry: HistoryEntry) {
    setPreviewSize(undefined);
    setPreview({
      itemId: entry.item.id,
      title: entry.item.title,
      path: entry.item.path,
      type: entry.item.type,
      ext: entry.item.ext,
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="app-surface overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClockIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('history.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('history.description')}</p>
            </div>
          </div>
          {!isLoading ? <span className="w-fit rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">{t('history.total', { count: total.toLocaleString(locale) })}</span> : null}
        </div>

        <div className="border-t border-border bg-secondary/20 px-4 py-4 sm:px-5">
          <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t('common.filterByRoot')}>
            <button
              type="button"
              aria-pressed={selectedRootId === 'all'}
              onClick={() => {
                setSelectedRootId('all');
                setPage(1);
              }}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedRootId === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('common.all')}
            </button>
            {roots.map((root) => (
              <button
                key={root.id}
                type="button"
                aria-pressed={selectedRootId === root.id}
                onClick={() => {
                  setSelectedRootId(root.id);
                  setPage(1);
                }}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedRootId === root.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {root.name}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/70 pt-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarsArrowDownIcon className="h-4 w-4" />
              {t('common.sort')}
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as HistorySortBy);
                  setPage(1);
                }}
                className="app-control min-h-9 py-1"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <select
              aria-label={t('common.sortDirection')}
              value={order}
              onChange={(event) => {
                setOrder(event.target.value as 'asc' | 'desc');
                setPage(1);
              }}
              className="app-control min-h-9 py-1"
            >
              <option value="desc">{t('common.descending')}</option>
              <option value="asc">{t('common.ascending')}</option>
            </select>
          </div>
        </div>
      </header>

      {error ? <div className="app-alert-error">{localizeError(error, 'errors.loadHistoryFailed')}</div> : null}
      {openError ? <div className="app-alert-error">{localizeError(openError, 'errors.openFileFailed')}</div> : null}

      <section className="app-surface overflow-hidden" aria-busy={isLoading}>
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_200px] border-b border-border bg-secondary/35 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>{t('common.resource')}</span>
          <span>{t('common.type')}</span>
          <span className="text-right">{t('common.lastAccessed')}</span>
        </div>
        <div className="max-h-[68vh] overflow-auto">
          {isLoading && entries.length === 0 ? (
            <div className="app-empty-state" role="status">
              <ArrowPathIcon className="h-7 w-7 animate-spin text-primary" />
              <p className="font-medium text-foreground">{t('history.loading')}</p>
            </div>
          ) : null}
          {!isLoading && entries.length === 0 ? (
            <div className="app-empty-state">
              <ClockIcon className="h-9 w-9 text-muted-foreground/60" />
              <p className="font-medium text-foreground">{t('history.empty')}</p>
              <p>{t('history.emptyDescription')}</p>
            </div>
          ) : null}
          {entries.map((entry) => {
            return (
              <div
                key={`${entry.itemId}-${entry.updatedAt}`}
                className="grid cursor-pointer grid-cols-1 items-center gap-2 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary/45 sm:px-5 md:grid-cols-[minmax(0,1fr)_120px_200px] md:gap-4"
                onClick={() => openPreview(entry)}
                onDoubleClick={() => void openInWindows(entry)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <HistoryEntryThumb entry={entry} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{entry.item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.item.path}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground md:hidden">
                      {t(ITEM_TYPE_LABEL_KEYS[entry.item.type])} · {new Date(entry.lastAccessedAt).toLocaleString(locale)}
                    </p>
                  </div>
                </div>
                <span className="hidden text-xs text-muted-foreground md:block">{t(ITEM_TYPE_LABEL_KEYS[entry.item.type])}</span>
                <span className="hidden text-right text-xs text-muted-foreground md:block">{new Date(entry.lastAccessedAt).toLocaleString(locale)}</span>
              </div>
            );
          })}
        </div>
        {entries.length > 0 ? (
          <div className="border-t border-border bg-secondary/15 px-2 py-3">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </section>

      <PreviewModal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        itemId={preview?.itemId}
        title={preview?.title}
        path={preview?.path}
        type={preview?.type}
        size={previewSize}
        ext={preview?.ext}
        navigation={
          previewNavigation
            ? {
                position: previewNavigation.position,
                total: previewNavigation.total,
                onPrevious: previousPreviewEntry ? () => openPreview(previousPreviewEntry) : undefined,
                onNext: nextPreviewEntry ? () => openPreview(nextPreviewEntry) : undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
