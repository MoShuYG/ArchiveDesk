import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  BarsArrowDownIcon,
  ChevronRightIcon,
  DocumentIcon,
  DocumentTextIcon,
  FilmIcon,
  FolderIcon,
  MusicalNoteIcon,
  PhotoIcon,
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
  ItemType,
  LibraryRoot,
  RootEntry,
} from '../types/api';
import { Pagination } from '../components/common/Pagination';
import { PreviewModal } from '../components/library/PreviewModal';
import { Modal } from '../components/common/Modal';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';

const PAGE_SIZE = 80;

const SORT_OPTIONS: Array<{ label: string; value: ExplorerSortBy }> = [
  { label: '名称', value: 'name' },
  { label: '类型', value: 'type' },
  { label: '修改时间', value: 'updatedAt' },
  { label: '大小', value: 'size' },
];

const COVER_SORT_OPTIONS: Array<{ label: string; value: CoverBrowserSortBy }> = [
  { label: '名称', value: 'name' },
  { label: '修改时间', value: 'updatedAt' },
  { label: '大小', value: 'size' },
];

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

type CoverTarget = {
  rootId: string;
  relPath: string;
  name: string;
};

type CoverMenuState = {
  x: number;
  y: number;
  target: CoverTarget;
};

const FILE_TYPE_LABEL: Record<ItemType, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  voice: '音色',
  novel: '小说',
  booklet: '本子',
  other: '文件',
};

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

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
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
  const supportsThumbnail = entry.type === 'video' || (entry.type === 'image' && entry.ext !== 'tga');
  const shouldUseThumbnail = Boolean(entry.itemId && supportsThumbnail);
  const { src, isLoading, error } = useAuthenticatedImage(shouldUseThumbnail ? `/api/items/${entry.itemId}/thumbnail` : null);

  let badge: string | null = null;
  if (!entry.itemId) {
    badge = 'Unindexed';
  } else if (!supportsThumbnail) {
    badge = 'No thumbnail';
  } else if (error) {
    badge = 'Thumbnail failed';
  } else if (!src && !isLoading) {
    badge = 'No thumbnail';
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
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const [coverMenu, setCoverMenu] = useState<CoverMenuState | null>(null);
  const [coverTarget, setCoverTarget] = useState<CoverTarget | null>(null);
  const [coverBrowsePath, setCoverBrowsePath] = useState('');
  const [coverSortBy, setCoverSortBy] = useState<CoverBrowserSortBy>('name');
  const [coverOrder, setCoverOrder] = useState<'asc' | 'desc'>('asc');
  const [coverItems, setCoverItems] = useState<CoverBrowserEntry[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverActionLoading, setCoverActionLoading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<CoverTarget | null>(null);
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
        setError(err instanceof Error ? err.message : '加载目录失败');
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
      setActionError(err instanceof Error ? err.message : '加载封面候选失败');
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
      let result: { ok: true; openedWith: 'quickviewer' | 'system' } | null = null;
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
        throw firstError ?? new Error('打开失败');
      }
      setActionInfo(result.openedWith === 'quickviewer' ? '已使用 QuickViewer 打开。' : '已调用 Windows 默认程序打开。');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '打开失败');
    }
  }

  function handleEntryClick(entry: ExplorerEntry) {
    setActionError(null);
    setActionInfo(null);
    if (entry.kind === 'folder') {
      navigateTo(entry.rootId, entry.relPath);
      return;
    }
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

  async function setCoverMode(mode: 'auto' | 'none') {
    if (!coverMenu) return;
    setActionError(null);
    setActionInfo(null);
    try {
      await libraryService.setFolderCover({
        rootId: coverMenu.target.rootId,
        relPath: coverMenu.target.relPath,
        mode,
      });
      setActionInfo(mode === 'auto' ? '已切换为自动封面。' : '已设置为不显示封面。');
      setCoverMenu(null);
      reloadContent();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '设置封面失败');
    }
  }

  function openCoverBrowserFromMenu() {
    if (!coverMenu) return;
    setCoverTarget(coverMenu.target);
    setCoverBrowsePath(coverMenu.target.relPath);
    setCoverSortBy('name');
    setCoverOrder('asc');
    setCoverItems([]);
    setCoverMenu(null);
  }

  function triggerUploadFromMenu() {
    if (!coverMenu) return;
    setUploadTarget(coverMenu.target);
    setCoverMenu(null);
    uploadInputRef.current?.click();
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
      setActionInfo(`已更新封面：${coverTarget.name}`);
      setCoverTarget(null);
      reloadContent();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '设置封面失败');
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
      setActionInfo(`封面上传成功：${uploadTarget.name}`);
      reloadContent();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '上传封面失败');
    } finally {
      setUploadTarget(null);
    }
  }

  const coverMenuStyle = useMemo(() => {
    if (!coverMenu) return undefined;
    const maxWidth = 240;
    const maxHeight = 230;
    const left = Math.max(8, Math.min(coverMenu.x, window.innerWidth - maxWidth));
    const top = Math.max(8, Math.min(coverMenu.y, window.innerHeight - maxHeight));
    return { left, top };
  }, [coverMenu]);

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      <header className="rounded-2xl border border-white/20 bg-card/80 p-5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all dark:border-white/10 dark:bg-card/50 dark:shadow-black/40">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">资源库浏览</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <button type="button" className="rounded-md px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground" onClick={() => navigateTo('', '')}>
                根目录
              </button>
              {currentRootId ? (
                <>
                  <ChevronRightIcon className="h-4 w-4 opacity-50" />
                  <button type="button" className="rounded-md px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground" onClick={() => navigateTo(currentRootId, '')}>
                    {currentRootName}
                  </button>
                </>
              ) : null}
              {breadcrumbs.map((crumb) => (
                <span key={crumb.relPath} className="flex items-center gap-1.5">
                  <ChevronRightIcon className="h-4 w-4 opacity-50" />
                  <button type="button" className="rounded-md px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground" onClick={() => navigateTo(currentRootId, crumb.relPath)}>
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
                className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-secondary hover:shadow"
                onClick={() => navigateTo(currentRootId, getParentRelPath(currentRelPath))}
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                返回上级
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-secondary hover:shadow"
              onClick={reloadContent}
            >
              <ArrowPathIcon className={cn("h-4 w-4", isLoading && "animate-spin")} />
              刷新
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarsArrowDownIcon className="h-4 w-4" />
            排序
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as ExplorerSortBy);
                setPage(1);
              }}
              className="ml-1 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
            className="rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </select>

          {currentRootId ? (
            <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground ml-auto">
              <input
                type="checkbox"
                checked={foldersFirst}
                className="rounded border-border text-primary focus:ring-primary/50"
                onChange={(event) => {
                  setFoldersFirst(event.target.checked);
                  setPage(1);
                }}
              />
              文件夹优先
            </label>
          ) : null}
        </div>
      </header>

      {error ? <div className="animate-in slide-in-from-top-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive backdrop-blur-md">{error}</div> : null}
      {actionError ? <div className="animate-in slide-in-from-top-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive backdrop-blur-md">{actionError}</div> : null}
      {actionInfo ? <div className="animate-in slide-in-from-top-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 backdrop-blur-md">{actionInfo}</div> : null}
      {currentRootId && isScanning ? (
        <div className="animate-in slide-in-from-top-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 backdrop-blur-md">
          Scan/indexing is in progress{currentTask ? ` (${currentTask.processedFiles}/${Math.max(currentTask.totalFiles, currentTask.processedFiles || 0)} files).` : '.'} Supported formats can still be previewed directly before indexing finishes.
        </div>
      ) : null}

      <section className="min-h-[50vh] rounded-2xl border border-white/20 bg-card/80 p-6 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-card/40 dark:shadow-black/40">
        {!currentRootId ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {rootEntries.map((entry) => (
              <button
                key={entry.rootId}
                type="button"
                onClick={() => navigateTo(entry.rootId, '')}
                className="group overflow-hidden rounded-2xl border border-border/50 bg-background/50 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-background hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="h-40 overflow-hidden transition-transform duration-500 group-hover:scale-105">
                  <FolderCover coverUrl={null} name={entry.name} showImage={false} />
                </div>
                <div className="space-y-1.5 p-4">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{entry.name}</p>
                  <p className="text-xs text-muted-foreground/80">根目录库 · {formatTime(entry.updatedAt)}</p>
                </div>
              </button>
            ))}
            {isLoading && rootEntries.length === 0 ? <div className="col-span-full py-8 text-sm text-muted-foreground">正在加载根目录...</div> : null}
            {!isLoading && rootEntries.length === 0 ? <div className="col-span-full py-8 text-sm text-muted-foreground">暂无可用根目录</div> : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {entries.map((entry) => {
              const isFolder = entry.kind === 'folder';
              const cardCover = isFolder ? entry.cover?.url : null;
              return (
                <div
                  key={`${entry.kind}-${entry.relPath}`}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-background/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-background hover:shadow-lg hover:shadow-primary/10"
                  onClick={() => handleEntryClick(entry)}
                  onDoubleClick={() => {
                    if (!isFolder) {
                      void openInWindows(entry);
                    }
                  }}
                  onContextMenu={(event) => {
                    if (!isFolder) return;
                    event.preventDefault();
                    setCoverMenu({
                      x: event.clientX,
                      y: event.clientY,
                      target: {
                        rootId: entry.rootId,
                        relPath: entry.relPath,
                        name: entry.name,
                      },
                    });
                  }}
                >
                  <div className="h-44 overflow-hidden bg-secondary/20 transition-transform duration-500 group-hover:scale-105">
                    {isFolder ? <FolderCover coverUrl={cardCover} name={entry.name} showImage={true} /> : <FileThumb entry={entry as ExplorerEntry & { kind: 'file' }} />}
                  </div>

                  {/* Glassmorphism item info overlay */}
                  <div className="absolute bottom-0 w-full border-t border-white/10 bg-background/80 p-3 pt-4 backdrop-blur-md transition-all duration-300 dark:bg-black/80">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{entry.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      {isFolder ? (
                        <p className="text-xs font-medium text-primary">
                          {entry.cover?.url ? '✨ 定制封面' : '文件夹'}
                        </p>
                      ) : (
                        <p className="text-xs font-medium text-muted-foreground">
                          {FILE_TYPE_LABEL[entry.type ?? 'other']} · {formatBytes(entry.size)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{formatTime(entry.updatedAt).split(' ')[0]}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {isLoading && entries.length === 0 ? <div className="col-span-full py-8 text-sm text-muted-foreground">正在加载目录...</div> : null}
            {!isLoading && entries.length === 0 ? <div className="col-span-full py-8 text-sm text-muted-foreground">当前目录为空</div> : null}
          </div>
        )}

        {isLoading && (currentRootId ? entries.length > 0 : rootEntries.length > 0) ? (
          <div className="mt-4 text-sm text-muted-foreground">正在加载中...</div>
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
      />

      {coverMenu ? (
        <div className="fixed z-50 w-52 rounded-lg border border-border bg-card p-1 shadow-xl" style={coverMenuStyle}>
          <button type="button" className="w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-secondary" onClick={() => void setCoverMode('auto')}>
            自动封面
          </button>
          <button type="button" className="w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-secondary" onClick={() => void setCoverMode('none')}>
            不显示封面
          </button>
          <button type="button" className="w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-secondary" onClick={openCoverBrowserFromMenu}>
            从目录中选择
          </button>
          <button type="button" className="w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-secondary" onClick={triggerUploadFromMenu}>
            上传封面
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
        onClose={() => setCoverTarget(null)}
        title={coverTarget ? `编辑封面：${coverTarget.name}` : '编辑封面'}
        className="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <button
                type="button"
                className="rounded px-1 hover:bg-secondary"
                onClick={() => {
                  if (coverTarget) {
                    setCoverBrowsePath(coverTarget.relPath);
                  }
                }}
              >
                目标目录
              </button>
              {coverBrowseCrumbs.map((crumb) => (
                <span key={crumb.relPath} className="flex items-center gap-1">
                  <ChevronRightIcon className="h-3 w-3" />
                  <button
                    type="button"
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
            <div className="flex items-center gap-2">
              <select
                value={coverSortBy}
                onChange={(event) => setCoverSortBy(event.target.value as CoverBrowserSortBy)}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              >
                {COVER_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={coverOrder}
                onChange={(event) => setCoverOrder(event.target.value as 'asc' | 'desc')}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
              <button type="button" className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary" onClick={() => void loadCoverBrowser()}>
                刷新
              </button>
            </div>
          </div>

          {coverLoading ? <div className="text-sm text-muted-foreground">正在加载封面候选...</div> : null}
          {!coverLoading && coverItems.length === 0 ? <div className="text-sm text-muted-foreground">当前目录下还没有可选图片，可以继续进入子目录。</div> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coverItems.map((entry) => (
              <button
                key={`${entry.kind}-${entry.relPath}`}
                type="button"
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
                  <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{entry.relPath}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
