import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  BarsArrowDownIcon,
  DocumentIcon,
  FilmIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import type { SearchEntry, SearchFileEntry, SearchSort } from '../types/api';
import { searchService } from '../services/searchService';
import { libraryService } from '../services/libraryService';
import { itemService } from '../services/itemService';
import { historyService } from '../services/historyService';
import { Pagination } from '../components/common/Pagination';
import { PreviewModal } from '../components/library/PreviewModal';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';
import { resolvePreviewNavigation } from '../utils/previewNavigation';
import { useI18n } from '../hooks/useI18n';
import type { MessageKey } from '../i18n';
import { ITEM_TYPE_LABEL_KEYS } from '../i18n/labels';

const SORT_OPTIONS: Array<{ labelKey: MessageKey; value: SearchSort }> = [
  { labelKey: 'common.relevance', value: 'relevance' },
  { labelKey: 'common.name', value: 'name' },
  { labelKey: 'common.type', value: 'type' },
  { labelKey: 'common.modifiedTime', value: 'updatedAt' },
  { labelKey: 'common.size', value: 'size' },
];

function formatSize(size?: number): string {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function ResultIcon({ item }: { item: SearchEntry }) {
  if (item.kind === 'folder') return <FolderIcon className="h-5 w-5 text-sky-600" />;
  if (item.type === 'image') return <PhotoIcon className="h-5 w-5 text-emerald-600" />;
  if (item.type === 'video') return <FilmIcon className="h-5 w-5 text-violet-600" />;
  if (item.type === 'audio' || item.type === 'voice') return <MusicalNoteIcon className="h-5 w-5 text-amber-600" />;
  return <DocumentIcon className="h-5 w-5 text-muted-foreground" />;
}

function SearchEntryThumb({ entry }: { entry: SearchEntry }) {
  const thumbnailUrl =
    entry.kind === 'file' && entry.itemId && (entry.type === 'image' || entry.type === 'video') && entry.ext !== 'tga'
      ? `/api/items/${entry.itemId}/thumbnail`
      : null;
  const { src, isLoading } = useAuthenticatedImage(thumbnailUrl);

  if (src) {
    return <img src={src} alt={entry.name} className="h-10 w-10 rounded-lg border border-border object-cover" />;
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
      <ResultIcon item={entry} />
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { locale, t, localizeError } = useI18n();
  const [query, setQuery] = useState('');
  const [rootId, setRootId] = useState('');
  const [sortBy, setSortBy] = useState<SearchSort>('relevance');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(40);
  const [roots, setRoots] = useState<Array<{ id: string; name: string }>>([]);
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [preview, setPreview] = useState<SearchFileEntry | null>(null);
  const [openError, setOpenError] = useState<unknown | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const previewEntries = useMemo(
    () => results.filter((entry): entry is SearchFileEntry => entry.kind === 'file'),
    [results],
  );
  const previewNavigation = useMemo(
    () =>
      preview
        ? resolvePreviewNavigation(previewEntries, preview.itemId, {
            getKey: (entry) => entry.itemId,
          })
        : null,
    [preview, previewEntries],
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
    let canceled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await searchService.searchEntries({
          q: query || undefined,
          rootId: rootId || undefined,
          page,
          pageSize,
          sortBy,
          order,
        });
        if (canceled) return;
        setResults(response.items);
        setTotal(response.total);
      } catch (err) {
        if (canceled) return;
        setError(err);
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    }, 250);
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [order, page, pageSize, query, rootId, sortBy]);

  async function openInWindows(entry: SearchFileEntry) {
    setOpenError(null);
    try {
      await itemService.openItemExternally(entry.itemId);
    } catch (err) {
      setOpenError(err);
    }
  }

  function openPreview(entry: SearchFileEntry) {
    setPreview(entry);
    historyService.recordView(entry.itemId).catch(() => {});
  }

  function handleEntryClick(entry: SearchEntry) {
    if (entry.kind === 'folder') {
      navigate(`/?rootId=${encodeURIComponent(entry.rootId)}&relPath=${encodeURIComponent(entry.relPath)}`);
      return;
    }
    openPreview(entry);
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="app-surface overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('search.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('search.description')}</p>
            </div>
          </div>
          {!isLoading ? (
            <span className="w-fit rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {t('search.total', { count: total.toLocaleString(locale) })}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 border-t border-border bg-secondary/20 p-4 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_180px_130px] sm:p-5">
          <label className="relative block md:col-span-2 xl:col-span-1">
            <span className="sr-only">{t('search.keyword')}</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={t('search.placeholder')}
              className="app-control w-full pl-9"
            />
          </label>
          <select
            aria-label={t('common.rootFilter')}
            value={rootId}
            onChange={(event) => {
              setRootId(event.target.value);
              setPage(1);
            }}
            className="app-control w-full"
          >
            <option value="">{t('common.allRoots')}</option>
            {roots.map((root) => (
              <option key={root.id} value={root.id}>
                {root.name}
              </option>
            ))}
          </select>
          <label className="relative block">
            <span className="sr-only">{t('common.sortField')}</span>
            <BarsArrowDownIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SearchSort);
                setPage(1);
              }}
              className="app-control w-full pl-9"
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
            className="app-control w-full"
          >
            <option value="asc">{t('common.ascending')}</option>
            <option value="desc">{t('common.descending')}</option>
          </select>
        </div>
      </header>

      {error ? <div className="app-alert-error">{localizeError(error, 'errors.searchFailed')}</div> : null}
      {openError ? <div className="app-alert-error">{localizeError(openError, 'errors.openFileFailed')}</div> : null}

      <section className="app-surface overflow-hidden" aria-busy={isLoading}>
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_180px_110px] border-b border-border bg-secondary/35 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>{t('common.name')}</span>
          <span>{t('common.type')}</span>
          <span>{t('common.modifiedTime')}</span>
          <span className="text-right">{t('common.size')}</span>
        </div>
        <div className="max-h-[68vh] overflow-auto">
          {isLoading && results.length === 0 ? (
            <div className="app-empty-state" role="status">
              <ArrowPathIcon className="h-7 w-7 animate-spin text-primary" />
              <p className="font-medium text-foreground">{t('search.loading')}</p>
              <p>{t('search.loadingDescription')}</p>
            </div>
          ) : null}
          {!isLoading && results.length === 0 ? (
            <div className="app-empty-state">
              <MagnifyingGlassIcon className="h-8 w-8 text-muted-foreground/60" />
              <p className="font-medium text-foreground">{t('search.empty')}</p>
              <p>{query ? t('search.emptyWithQuery') : t('search.emptyWithoutQuery')}</p>
            </div>
          ) : null}
          {results.map((entry) => (
            <div
              key={`${entry.kind}-${entry.rootId}-${entry.relPath}`}
              className="grid cursor-pointer grid-cols-1 items-center gap-2 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary/45 sm:px-5 md:grid-cols-[minmax(0,1fr)_120px_180px_110px] md:gap-4"
              onClick={() => handleEntryClick(entry)}
              onDoubleClick={() => {
                if (entry.kind === 'file') {
                  void openInWindows(entry);
                }
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <SearchEntryThumb entry={entry} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{entry.relPath || '/'}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground md:hidden">
                    {entry.kind === 'folder' ? t('common.folder') : t(ITEM_TYPE_LABEL_KEYS[entry.type])} · {new Date(entry.updatedAt).toLocaleString(locale)} · {entry.kind === 'folder' ? '-' : formatSize(entry.size)}
                  </p>
                </div>
              </div>
              <span className="hidden text-xs text-muted-foreground md:block">{entry.kind === 'folder' ? t('common.folder') : t(ITEM_TYPE_LABEL_KEYS[entry.type])}</span>
              <span className="hidden text-xs text-muted-foreground md:block">{new Date(entry.updatedAt).toLocaleString(locale)}</span>
              <span className="hidden text-right text-xs text-muted-foreground md:block">{entry.kind === 'folder' ? '-' : formatSize(entry.size)}</span>
            </div>
          ))}
        </div>
        {results.length > 0 ? (
          <div className="border-t border-border bg-secondary/15 px-2 py-3">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </section>

      <PreviewModal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        itemId={preview?.itemId}
        title={preview?.name}
        path={preview?.relPath}
        type={preview?.type}
        size={preview?.size}
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
