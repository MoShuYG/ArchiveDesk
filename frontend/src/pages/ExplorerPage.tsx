import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  BarsArrowDownIcon,
  ChevronRightIcon,
  DocumentIcon,
  DocumentTextIcon,
  EyeSlashIcon,
  FilmIcon,
  FolderIcon,
  MusicalNoteIcon,
  PhotoIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';
import { libraryService } from '../services/libraryService';
import { historyService } from '../services/historyService';
import { itemService } from '../services/itemService';
import { useScanStore } from '../state/scanStore';
import type {
  CoverBrowserEntry,
  CoverBrowserSortBy,
  ExplorerEntry,
  ExplorerSortBy,
  FolderCoverMode,
  ItemType,
  LibraryRoot,
  RootEntry,
} from '../types/api';
import { Pagination } from '../components/common/Pagination';
import { PreviewModal } from '../components/library/PreviewModal';
import { Modal } from '../components/common/Modal';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';
import { resolvePreviewNavigation } from '../utils/previewNavigation';
import { createExplorerCoverTarget, type ExplorerCoverTarget } from '../utils/explorerCoverTarget';
import { useI18n } from '../hooks/useI18n';
import type { MessageKey, TranslationParams } from '../i18n';
import { ITEM_TYPE_LABEL_KEYS } from '../i18n/labels';

const PAGE_SIZE = 80;

const SORT_OPTIONS: Array<{ labelKey: MessageKey; value: ExplorerSortBy }> = [
  { labelKey: 'common.name', value: 'name' },
  { labelKey: 'common.type', value: 'type' },
  { labelKey: 'common.modifiedTime', value: 'updatedAt' },
  { labelKey: 'common.size', value: 'size' },
];

const COVER_SORT_OPTIONS: Array<{ labelKey: MessageKey; value: CoverBrowserSortBy }> = [
  { labelKey: 'common.name', value: 'name' },
  { labelKey: 'common.modifiedTime', value: 'updatedAt' },
  { labelKey: 'common.size', value: 'size' },
];

const COVER_MODE_LABEL_KEYS: Record<FolderCoverMode, MessageKey> = {
  auto: 'explorer.coverMode.auto',
  none: 'explorer.coverMode.none',
  manual_item: 'explorer.coverMode.manualItem',
  manual_upload: 'explorer.coverMode.manualUpload',
};

type PreviewState = {
  itemId?: string;
  rootId: string;
  relPath: string;
  title: string;
  path: string;
  type?: ItemType;
  size?: number;
  ext?: string | null;
};

type CoverMenuState = {
  x: number;
  y: number;
  target: ExplorerCoverTarget;
};

type LocalizedErrorState = { value: unknown; fallbackKey: MessageKey };
type LocalizedMessageState = { key: MessageKey; params?: TranslationParams };

function normalizeRelPath(input: string): string {
  if (!input) return '';
  return input
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .join('/');
}

function getParentRelPath(relPath: string): string {
  if (!relPath) return '';
  const index = relPath.lastIndexOf('/');
  return index === -1 ? '' : relPath.slice(0, index);
}

function formatBytes(size?: number): string {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(value: number, locale: string): string {
  return new Date(value).toLocaleString(locale);
}

function formatDate(value: number, locale: string): string {
  return new Date(value).toLocaleDateString(locale);
}

function getFileIcon(type?: ItemType) {
  if (type === 'image') return <PhotoIcon className="h-8 w-8 text-emerald-600" />;
  if (type === 'video') return <FilmIcon className="h-8 w-8 text-violet-600" />;
  if (type === 'audio' || type === 'voice') return <MusicalNoteIcon className="h-8 w-8 text-amber-600" />;
  if (type === 'novel' || type === 'booklet') return <DocumentTextIcon className="h-8 w-8 text-blue-600" />;
  return <DocumentIcon className="h-8 w-8 text-muted-foreground" />;
}

function FolderCover({
  coverUrl,
  name,
  showImage,
}: {
  coverUrl: string | null | undefined;
  name: string;
  showImage: boolean;
}) {
  const { src } = useAuthenticatedImage(showImage ? coverUrl : null);
  if (showImage && src) {
    return <img src={src} alt={name} className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary/40 via-secondary/60 to-secondary">
      <FolderIcon className="h-12 w-12 text-muted-foreground/70" />
    </div>
  );
}

function FileThumb({ entry }: { entry: ExplorerEntry & { kind: 'file' } }) {
  const { t } = useI18n();
  const supportsThumbnail = entry.type === 'video' || (entry.type === 'image' && entry.ext !== 'tga');
  const shouldUseThumbnail = Boolean(entry.itemId && supportsThumbnail);
  const { src, isLoading, error } = useAuthenticatedImage(shouldUseThumbnail ? `/api/items/${entry.itemId}/thumbnail` : null);

  let badge: string | null = null;
  if (!entry.itemId) {
    badge = t('explorer.thumbnail.unindexed');
  } else if (!supportsThumbnail) {
    badge = t('explorer.thumbnail.unavailable');
  } else if (error) {
    badge = t('explorer.thumbnail.failed');
  } else if (!src && !isLoading) {
    badge = t('explorer.thumbnail.unavailable');
  }

  if (src) {
    return <img src={src} alt={entry.name} className="h-full w-full object-cover" />;
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary/20">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center justify-center bg-secondary/20">
      {getFileIcon(entry.type)}
      {badge ? (
        <span className="absolute bottom-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function CoverCandidateThumb({ entry }: { entry: CoverBrowserEntry }) {
  const { src } = useAuthenticatedImage(entry.kind === 'image' ? entry.thumbnailUrl : null);
  if (entry.kind === 'image' && src) {
    return <img src={src} alt={entry.name} className="h-12 w-12 rounded border border-border object-cover" />;
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-secondary">
      <FolderIcon className="h-5 w-5 text-sky-600" />
    </div>
  );
}

export function ExplorerPage() {
  const { locale, t, localizeError } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRootId = searchParams.get('rootId') ?? '';
  const currentRelPath = normalizeRelPath(searchParams.get('relPath') ?? '');

  const [roots, setRoots] = useState<LibraryRoot[]>([]);
  const [rootEntries, setRootEntries] = useState<RootEntry[]>([]);
  const [entries, setEntries] = useState<ExplorerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<ExplorerSortBy>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [foldersFirst, setFoldersFirst] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [actionError, setActionError] = useState<LocalizedErrorState | null>(null);
  const [actionInfo, setActionInfo] = useState<LocalizedMessageState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const previewNavigation = useMemo(
    () =>
      preview
        ? resolvePreviewNavigation(entries, `${preview.rootId}:${preview.relPath}`, {
            getKey: (entry) => `${entry.rootId}:${entry.relPath}`,
            isCandidate: (entry) => entry.kind === 'file',
          })
        : null,
    [entries, preview],
  );
  const previousPreviewEntry = previewNavigation?.previous ?? null;
  const nextPreviewEntry = previewNavigation?.next ?? null;

  const [coverMenu, setCoverMenu] = useState<CoverMenuState | null>(null);
  const [coverTarget, setCoverTarget] = useState<ExplorerCoverTarget | null>(null);
  const [coverBrowsePath, setCoverBrowsePath] = useState('');
  const [coverSortBy, setCoverSortBy] = useState<CoverBrowserSortBy>('name');
  const [coverOrder, setCoverOrder] = useState<'asc' | 'desc'>('asc');
  const [coverItems, setCoverItems] = useState<CoverBrowserEntry[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverActionLoading, setCoverActionLoading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<ExplorerCoverTarget | null>(null);
  const coverMenuButtonRef = useRef<HTMLButtonElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const currentTask = useScanStore((s) => s.currentTask);
  const isScanning = useScanStore((s) => s.isScanning);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const rootNameMap = useMemo(() => {
    const map = new Map<string, string>();
    roots.forEach((root) => map.set(root.id, root.name));
    rootEntries.forEach((root) => map.set(root.rootId, root.name));
    return map;
  }, [roots, rootEntries]);

  const currentRootName = useMemo(() => {
    if (!currentRootId) return '';
    return rootNameMap.get(currentRootId) ?? currentRootId;
  }, [currentRootId, rootNameMap]);

  const breadcrumbs = useMemo(() => {
    if (!currentRootId) return [];
    const segments = currentRelPath ? currentRelPath.split('/') : [];
    return segments.map((name, index) => ({
      name,
      relPath: segments.slice(0, index + 1).join('/'),
    }));
  }, [currentRelPath, currentRootId]);

  const coverBrowseCrumbs = useMemo(() => {
    const base = coverTarget?.relPath ?? '';
    if (!coverBrowsePath) return [];
    const segments = coverBrowsePath.split('/').filter(Boolean);
    const baseSegments = base.split('/').filter(Boolean).length;
    return segments.map((segment, index) => {
      const relPath = segments.slice(0, index + 1).join('/');
      return {
        name: segment,
        relPath,
        insideTarget: index + 1 >= baseSegments,
      };
    });
  }, [coverBrowsePath, coverTarget?.relPath]);

  const navigateTo = useCallback(
    (nextRootId: string, nextRelPath: string) => {
      const params = new URLSearchParams();
      if (nextRootId) {
        params.set('rootId', nextRootId);
      }
      const normalized = normalizeRelPath(nextRelPath);
      if (normalized) {
        params.set('relPath', normalized);
      }
      setSearchParams(params);
      setPage(1);
      setActionError(null);
      setActionInfo(null);
    },
    [setSearchParams]
  );

  const reloadContent = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    void libraryService
      .listRoots()
      .then((response) => setRoots(response))
      .catch(() => setRoots([]));
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    async function load() {
      try {
        if (!currentRootId) {
          const response = await libraryService.listRootEntries({
            page,
            pageSize: PAGE_SIZE,
            sortBy: sortBy === 'updatedAt' ? 'updatedAt' : 'name',
            order,
          });
          if (cancelled) return;
          setRootEntries(response.items);
          setEntries([]);
          setTotal(response.total);
          return;
        }

        const response = await libraryService.listExplorerEntries({
          rootId: currentRootId,
          relPath: currentRelPath,
          page,
          pageSize: PAGE_SIZE,
          sortBy,
          order,
          foldersFirst,
        });
        if (cancelled) return;
        setEntries(response.items);
        setRootEntries([]);
        setTotal(response.total);
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setRootEntries([]);
        setEntries([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentRelPath, currentRootId, foldersFirst, order, page, refreshKey, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [currentRelPath, currentRootId]);

  useEffect(() => {
    if (!coverMenu) return;
    const close = () => setCoverMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    coverMenuButtonRef.current?.focus();
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [coverMenu]);

  const loadCoverBrowser = useCallback(async () => {
    if (!coverTarget) return;
    setCoverLoading(true);
    try {
      const response = await libraryService.listCoverBrowser({
        rootId: coverTarget.rootId,
        relPath: coverBrowsePath,
        page: 1,
        pageSize: 300,
        sortBy: coverSortBy,
        order: coverOrder,
        foldersFirst: true,
      });
      setCoverItems(response.items);
    } catch (err) {
      setActionError({ value: err, fallbackKey: 'errors.loadCoverCandidatesFailed' });
    } finally {
      setCoverLoading(false);
    }
  }, [coverBrowsePath, coverOrder, coverSortBy, coverTarget]);

  useEffect(() => {
    if (!coverTarget) return;
    void loadCoverBrowser();
  }, [coverTarget, loadCoverBrowser]);

  async function openInWindows(entry: ExplorerEntry) {
    if (entry.kind !== 'file') return;
    setActionError(null);
    setActionInfo(null);
    try {
      let result: { ok: true } | null = null;
      let firstError: unknown;
      if (entry.itemId) {
        try {
          result = await itemService.openItemExternally(entry.itemId);
        } catch (error) {
          firstError = error;
        }
      }
      if (!result) {
        result = await libraryService.openExplorerEntry({
          rootId: entry.rootId,
          relPath: entry.relPath,
        });
      }
      if (!result) {
        throw firstError ?? new Error();
      }
      setActionInfo({ key: 'preview.openedInWindows' });
    } catch (err) {
      setActionError({ value: err, fallbackKey: 'errors.openFileFailed' });
    }
  }

  function openPreview(entry: ExplorerEntry) {
    if (entry.kind !== 'file') return;
    setPreview({
      itemId: entry.itemId,
      rootId: entry.rootId,
      relPath: entry.relPath,
      title: entry.name,
      path: entry.relPath,
      type: entry.type,
      size: entry.size,
      ext: entry.ext,
    });
    if (entry.itemId) {
      historyService.recordView(entry.itemId).catch(() => { });
    }
  }

  function handleEntryClick(entry: ExplorerEntry) {
    setActionError(null);
    setActionInfo(null);
    if (entry.kind === 'folder') {
      navigateTo(entry.rootId, entry.relPath);
      return;
    }
    openPreview(entry);
  }

  async function setCoverMode(mode: 'auto' | 'none') {
    if (!coverTarget) return;
    const target = coverTarget;
    setCoverActionLoading(true);
    setActionError(null);
    setActionInfo(null);
    try {
      await libraryService.setFolderCover({
        rootId: target.rootId,
        relPath: target.relPath,
        mode,
      });
      setActionInfo({
        key: mode === 'auto' ? 'explorer.autoCoverSet' : 'explorer.coverHidden',
        params: { name: target.name },
      });
      closeCoverManagement();
      reloadContent();
    } catch (err) {
      setActionError({ value: err, fallbackKey: 'errors.setCoverFailed' });
    } finally {
      setCoverActionLoading(false);
    }
  }

  function openCoverManagementFromMenu() {
    if (!coverMenu) return;
    setActionError(null);
    setActionInfo(null);
    setCoverTarget(coverMenu.target);
    setCoverBrowsePath(coverMenu.target.relPath);
    setCoverSortBy('name');
    setCoverOrder('asc');
    setCoverItems([]);
    setCoverMenu(null);
  }

  function triggerCoverUpload() {
    if (!coverTarget) return;
    setUploadTarget(coverTarget);
    uploadInputRef.current?.click();
  }

  function closeCoverManagement() {
    setCoverTarget(null);
    setCoverBrowsePath('');
    setCoverItems([]);
    setUploadTarget(null);
  }

  async function applyManualCover(itemId: string) {
    if (!coverTarget) return;
    setCoverActionLoading(true);
    setActionError(null);
    setActionInfo(null);
    try {
      await libraryService.setFolderCover({
        rootId: coverTarget.rootId,
        relPath: coverTarget.relPath,
        mode: 'manual_item',
        itemId,
      });
      setActionInfo({ key: 'explorer.coverUpdated', params: { name: coverTarget.name } });
      closeCoverManagement();
      reloadContent();
    } catch (err) {
      setActionError({ value: err, fallbackKey: 'errors.setCoverFailed' });
    } finally {
      setCoverActionLoading(false);
    }
  }

  async function handleUploadCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file || !uploadTarget) return;
    setActionError(null);
    setActionInfo(null);
    try {
      await libraryService.uploadFolderCover({
        rootId: uploadTarget.rootId,
        relPath: uploadTarget.relPath,
        file,
      });
      setActionInfo({ key: 'explorer.coverUploaded', params: { name: uploadTarget.name } });
      closeCoverManagement();
      reloadContent();
    } catch (err) {
      setActionError({ value: err, fallbackKey: 'errors.uploadCoverFailed' });
    } finally {
      setUploadTarget(null);
    }
  }

  const coverMenuStyle = useMemo(() => {
    if (!coverMenu) return undefined;
    const maxWidth = 240;
    const maxHeight = 88;
    const left = Math.max(8, Math.min(coverMenu.x, window.innerWidth - maxWidth));
    const top = Math.max(8, Math.min(coverMenu.y, window.innerHeight - maxHeight));
    return { left, top };
  }, [coverMenu]);

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="app-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('explorer.title')}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label={t('explorer.currentLocation')}>
              <button type="button" className="rounded-md px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground" onClick={() => navigateTo('', '')}>
                {t('common.rootFolder')}
              </button>
              {currentRootId ? (
                <>
                  <ChevronRightIcon className="h-4 w-4 opacity-50" />
                  <button type="button" title={currentRootName} className="rounded-md px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground" onClick={() => navigateTo(currentRootId, '')}>
                    {currentRootName}
                  </button>
                </>
              ) : null}
              {breadcrumbs.map((crumb) => (
                <span key={crumb.relPath} className="flex items-center gap-1.5">
                  <ChevronRightIcon className="h-4 w-4 opacity-50" />
                  <button type="button" title={crumb.name} className="rounded-md px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground" onClick={() => navigateTo(currentRootId, crumb.relPath)}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentRootId ? (
              <button
                type="button"
                className="app-button-secondary"
                onClick={() => navigateTo(currentRootId, getParentRelPath(currentRelPath))}
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                {t('explorer.backToParent')}
              </button>
            ) : null}
            <button
              type="button"
              className="app-button-secondary"
              onClick={reloadContent}
            >
              <ArrowPathIcon className={cn("h-4 w-4", isLoading && "animate-spin")} />
              {t('common.refresh')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-secondary/20 px-5 py-4 sm:px-6">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarsArrowDownIcon className="h-4 w-4" />
            {t('common.sort')}
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as ExplorerSortBy);
                setPage(1);
              }}
              className="app-control ml-1 min-h-9 py-1"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <select
            value={order}
            onChange={(event) => {
              setOrder(event.target.value as 'asc' | 'desc');
              setPage(1);
            }}
            className="app-control min-h-9 py-1"
          >
            <option value="asc">{t('common.ascending')}</option>
            <option value="desc">{t('common.descending')}</option>
          </select>

          {currentRootId ? (
            <label className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
              <input
                type="checkbox"
                checked={foldersFirst}
                className="rounded border-border text-primary focus:ring-primary/50"
                onChange={(event) => {
                  setFoldersFirst(event.target.checked);
                  setPage(1);
                }}
              />
              {t('explorer.foldersFirst')}
            </label>
          ) : null}
        </div>
      </header>

      {error ? <div className="app-alert-error">{localizeError(error, 'errors.loadExplorerFailed')}</div> : null}
      {actionError ? <div className="app-alert-error">{localizeError(actionError.value, actionError.fallbackKey)}</div> : null}
      {actionInfo ? <div className="app-alert-success">{t(actionInfo.key, actionInfo.params)}</div> : null}
      {currentRootId && isScanning ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-300">
          {currentTask
            ? t('explorer.scanningProgress', {
                processed: currentTask.processedFiles,
                total: Math.max(currentTask.totalFiles, currentTask.processedFiles || 0),
              })
            : t('explorer.scanning')}{' '}
          {t('explorer.directPreviewDuringScan')}
        </div>
      ) : null}

      <section className="app-surface min-h-[50vh] p-3 sm:p-4" aria-busy={isLoading}>
        {!currentRootId ? (
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {rootEntries.map((entry) => (
              <button
                key={entry.rootId}
                type="button"
                title={entry.name}
                aria-label={t('explorer.openRootNamed', { name: entry.name })}
                aria-haspopup="menu"
                onClick={() => navigateTo(entry.rootId, '')}
                onContextMenu={(event) => {
                  const target = createExplorerCoverTarget(entry);
                  if (!target) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setCoverMenu({
                    x: event.clientX,
                    y: event.clientY,
                    target,
                  });
                }}
                className="group overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
                  <FolderCover coverUrl={entry.cover.url} name={entry.name} showImage={entry.cover.mode !== 'none'} />
                </div>
                <div className="space-y-1 border-t border-border p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary" title={entry.name}>{entry.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t('explorer.rootMeta', { time: formatTime(entry.updatedAt, locale) })}</p>
                </div>
              </button>
            ))}
            {isLoading && rootEntries.length === 0 ? (
              <div className="app-empty-state col-span-full" role="status">
                <ArrowPathIcon className="h-7 w-7 animate-spin text-primary" />
                <p className="font-medium text-foreground">{t('explorer.loadingRoots')}</p>
              </div>
            ) : null}
            {!isLoading && rootEntries.length === 0 ? (
              <div className="app-empty-state col-span-full">
                <FolderIcon className="h-9 w-9 text-muted-foreground/60" />
                <p className="font-medium text-foreground">{t('explorer.noRoots')}</p>
                <p>{t('explorer.noRootsDescription')}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {entries.map((entry) => {
              const isFolder = entry.kind === 'folder';
              const cardCover = isFolder ? entry.cover?.url : null;
              return (
                <button
                  key={`${entry.kind}-${entry.relPath}`}
                  type="button"
                  title={entry.name}
                  aria-label={isFolder ? t('explorer.openFolderNamed', { name: entry.name }) : t('explorer.previewFileNamed', { name: entry.name })}
                  aria-haspopup={isFolder ? 'menu' : undefined}
                  className="group w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  onClick={() => handleEntryClick(entry)}
                  onDoubleClick={() => {
                    if (!isFolder) {
                      void openInWindows(entry);
                    }
                  }}
                  onContextMenu={(event) => {
                    const target = createExplorerCoverTarget(entry);
                    if (!target) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setCoverMenu({
                      x: event.clientX,
                      y: event.clientY,
                      target,
                    });
                  }}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
                    {isFolder ? <FolderCover coverUrl={cardCover} name={entry.name} showImage={true} /> : <FileThumb entry={entry as ExplorerEntry & { kind: 'file' }} />}
                  </div>

                  <div className="border-t border-border bg-card p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary" title={entry.name}>{entry.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      {isFolder ? (
                        <p className="text-xs font-medium text-primary">
                          {entry.cover?.url ? t('explorer.customCover') : t('common.folder')}
                        </p>
                      ) : (
                        <p className="text-xs font-medium text-muted-foreground">
                          {t(ITEM_TYPE_LABEL_KEYS[entry.type ?? 'other'])} · {formatBytes(entry.size)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{formatDate(entry.updatedAt, locale)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {isLoading && entries.length === 0 ? (
              <div className="app-empty-state col-span-full" role="status">
                <ArrowPathIcon className="h-7 w-7 animate-spin text-primary" />
                <p className="font-medium text-foreground">{t('explorer.loadingFolder')}</p>
              </div>
            ) : null}
            {!isLoading && entries.length === 0 ? (
              <div className="app-empty-state col-span-full">
                <FolderIcon className="h-9 w-9 text-muted-foreground/60" />
                <p className="font-medium text-foreground">{t('explorer.emptyFolder')}</p>
              </div>
            ) : null}
          </div>
        )}

        {isLoading && (currentRootId ? entries.length > 0 : rootEntries.length > 0) ? (
          <div className="mt-3 flex items-center gap-2 px-2 text-sm text-muted-foreground" role="status">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            {t('explorer.updating')}
          </div>
        ) : null}
        {!isLoading && totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" /> : null}
      </section>

      <PreviewModal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        itemId={preview?.itemId}
        rootId={preview?.rootId}
        relPath={preview?.relPath}
        title={preview?.title}
        path={preview?.path}
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

      {coverMenu ? (
        <div
          role="menu"
          aria-label={t('explorer.contextMenuNamed', { name: coverMenu.target.name })}
          className="fixed z-50 w-56 rounded-lg border border-border bg-card p-1 shadow-xl"
          style={coverMenuStyle}
        >
          <button
            ref={coverMenuButtonRef}
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-secondary focus:bg-secondary focus:outline-none"
            onClick={openCoverManagementFromMenu}
          >
            <PhotoIcon className="h-4 w-4 text-primary" />
            {t('explorer.coverManagement')}
          </button>
        </div>
      ) : null}

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          void handleUploadCover(event);
        }}
      />

      <Modal
        isOpen={coverTarget !== null}
        onClose={closeCoverManagement}
        title={t('explorer.coverManagement')}
        className="max-w-4xl"
      >
        <div className="space-y-4">
          {coverTarget ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/25 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('explorer.currentFolderMode', { mode: t(COVER_MODE_LABEL_KEYS[coverTarget.cover.mode]) })}
                </p>
                <p className="truncate text-sm font-semibold text-foreground" title={coverTarget.name}>
                  {coverTarget.name}
                </p>
                <p className="truncate text-xs text-muted-foreground" title={coverTarget.relPath || t('common.rootFolder')}>
                  {coverTarget.relPath || t('common.rootFolder')}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={coverActionLoading}
                  className="app-button-secondary min-h-9 px-3 text-xs disabled:opacity-60"
                  onClick={() => void setCoverMode('auto')}
                >
                  <SparklesIcon className="h-4 w-4" />
                   {t('explorer.coverMode.auto')}
                </button>
                <button
                  type="button"
                  disabled={coverActionLoading}
                  className="app-button-secondary min-h-9 px-3 text-xs disabled:opacity-60"
                  onClick={() => void setCoverMode('none')}
                >
                  <EyeSlashIcon className="h-4 w-4" />
                   {t('common.hide')}
                </button>
                <button
                  type="button"
                  disabled={coverActionLoading}
                  className="app-button-secondary min-h-9 px-3 text-xs disabled:opacity-60"
                  onClick={triggerCoverUpload}
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                   {t('library.uploadImage')}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('explorer.chooseFromFolder')}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('explorer.chooseCoverDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={coverSortBy}
                aria-label={t('explorer.coverSortField')}
                onChange={(event) => setCoverSortBy(event.target.value as CoverBrowserSortBy)}
                className="app-control min-h-9 py-1 text-xs"
              >
                {COVER_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
              <select
                value={coverOrder}
                aria-label={t('explorer.coverSortDirection')}
                onChange={(event) => setCoverOrder(event.target.value as 'asc' | 'desc')}
                className="app-control min-h-9 py-1 text-xs"
              >
                <option value="asc">{t('common.ascending')}</option>
                <option value="desc">{t('common.descending')}</option>
              </select>
              <button type="button" className="app-button-secondary min-h-9 px-3 text-xs" onClick={() => void loadCoverBrowser()}>
                {t('common.refresh')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-background px-3 py-2">
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <button
                type="button"
                title={coverTarget?.name}
                className="rounded px-1 hover:bg-secondary"
                onClick={() => {
                  if (coverTarget) {
                    setCoverBrowsePath(coverTarget.relPath);
                  }
                }}
              >
                {t('common.targetFolder')}
              </button>
              {coverBrowseCrumbs.map((crumb) => (
                <span key={crumb.relPath} className="flex items-center gap-1">
                  <ChevronRightIcon className="h-3 w-3" />
                  <button
                    type="button"
                    title={crumb.name}
                    className="rounded px-1 hover:bg-secondary disabled:opacity-50"
                    disabled={!crumb.insideTarget}
                    onClick={() => {
                      if (crumb.insideTarget) {
                        setCoverBrowsePath(crumb.relPath);
                      }
                    }}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {coverLoading ? <div className="text-sm text-muted-foreground" role="status">{t('explorer.loadingCoverCandidates')}</div> : null}
          {!coverLoading && coverItems.length === 0 ? <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{t('explorer.noCoverCandidates')}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coverItems.map((entry) => (
              <button
                key={`${entry.kind}-${entry.relPath}`}
                type="button"
                title={`${entry.name}\n${entry.relPath}`}
                disabled={coverActionLoading}
                onClick={() => {
                  if (entry.kind === 'folder') {
                    setCoverBrowsePath(entry.relPath);
                    return;
                  }
                  if (entry.itemId) {
                    void applyManualCover(entry.itemId);
                  }
                }}
                className="flex items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <CoverCandidateThumb entry={entry} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" title={entry.name}>{entry.name}</p>
                  <p className="truncate text-xs text-muted-foreground" title={entry.relPath}>{entry.relPath}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
