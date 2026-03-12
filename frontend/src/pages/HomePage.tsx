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

const SORT_OPTIONS: Array<{ label: string; value: SearchSort }> = [
  { label: '相关度', value: 'relevance' },
  { label: '名称', value: 'name' },
  { label: '类型', value: 'type' },
  { label: '修改时间', value: 'updatedAt' },
  { label: '大小', value: 'size' },
];

const TYPE_LABELS: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  voice: '音色',
  novel: '小说',
  booklet: '本子',
  other: '文件',
};

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
  const thumbnailUrl = entry.kind === 'file' && entry.itemId && (entry.type === 'image' || entry.type === 'video') ? `/api/items/${entry.itemId}/thumbnail` : null;
  const { src, isLoading } = useAuthenticatedImage(thumbnailUrl);

  if (src) {
    return <img src={src} alt={entry.name} className="h-9 w-9 rounded border border-border object-cover" />;
  }

  if (isLoading) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded border border-border bg-secondary/20">
        <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded border border-border bg-secondary/20">
      <ResultIcon item={entry} />
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
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
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SearchFileEntry | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

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
        setError(err instanceof Error ? err.message : '搜索失败');
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
      setOpenError(err instanceof Error ? err.message : '打开失败');
    }
  }

  function handleEntryClick(entry: SearchEntry) {
    if (entry.kind === 'folder') {
      navigate(`/?rootId=${encodeURIComponent(entry.rootId)}&relPath=${encodeURIComponent(entry.relPath)}`);
      return;
    }
    setPreview(entry);
    historyService.recordView(entry.itemId).catch(() => { });
  }

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      <section className="rounded-2xl border border-white/20 bg-card/80 p-5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all dark:border-white/10 dark:bg-card/50 dark:shadow-black/40">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">全局检索</h1>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_130px]">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="搜索文件夹名、标题、路径、标签"
            className="rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-foreground shadow-sm transition-all focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-white/10 dark:bg-black/40"
          />
          <select
            value={rootId}
            onChange={(event) => {
              setRootId(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-foreground shadow-sm transition-all focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-white/10 dark:bg-black/40"
          >
            <option value="">全部根目录</option>
            {roots.map((root) => (
              <option key={root.id} value={root.id}>
                {root.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-muted-foreground shadow-sm transition-all focus-within:border-primary/50 focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/20 dark:border-white/10 dark:bg-black/40">
            <BarsArrowDownIcon className="h-4 w-4" />
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SearchSort);
                setPage(1);
              }}
              className="bg-transparent text-foreground outline-none"
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
            className="rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-foreground shadow-sm transition-all focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-white/10 dark:bg-black/40"
          >
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </select>
        </div>
      </section>

      {error ? <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
      {openError ? <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{openError}</div> : null}

      <section className="overflow-hidden rounded-2xl border border-white/20 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-card/50 dark:shadow-black/40">
        <div className="grid grid-cols-[1fr_140px_170px_120px] border-b border-border/50 bg-secondary/40 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>名称</span>
          <span>类型</span>
          <span>修改时间</span>
          <span className="text-right">大小</span>
        </div>
        <div className="max-h-[68vh] overflow-auto">
          {isLoading && results.length === 0 ? <div className="px-4 py-8 text-sm text-muted-foreground">正在搜索...</div> : null}
          {!isLoading && results.length === 0 ? <div className="px-4 py-8 text-sm text-muted-foreground">暂无结果</div> : null}
          {results.map((entry) => (
            <div
              key={`${entry.kind}-${entry.rootId}-${entry.relPath}`}
              className="grid cursor-pointer grid-cols-[1fr_140px_170px_120px] items-center gap-4 border-b border-border/30 px-6 py-3 transition-all hover:bg-secondary/60 hover:pl-8"
              onClick={() => handleEntryClick(entry)}
              onDoubleClick={() => {
                if (entry.kind === 'file') {
                  void openInWindows(entry);
                }
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <SearchEntryThumb entry={entry} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{entry.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{entry.relPath || '/'}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{entry.kind === 'folder' ? '文件夹' : TYPE_LABELS[entry.type] ?? '文件'}</span>
              <span className="text-xs text-muted-foreground">{new Date(entry.updatedAt).toLocaleString()}</span>
              <span className="text-right text-xs text-muted-foreground">{entry.kind === 'folder' ? '-' : formatSize(entry.size)}</span>
            </div>
          ))}
        </div>
        {results.length > 0 ? (
          <div className="border-t border-border px-2 py-3">
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
      />
    </div>
  );
}
