import { useEffect, useMemo, useState } from 'react';
import { ClockIcon, BarsArrowDownIcon, PhotoIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, DocumentIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Pagination } from '../components/common/Pagination';
import { PreviewModal } from '../components/library/PreviewModal';
import { historyService } from '../services/historyService';
import { libraryService } from '../services/libraryService';
import { itemService } from '../services/itemService';
import type { HistoryEntry, ItemType } from '../types/api';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';

type HistorySortBy = 'lastAccessedAt' | 'name' | 'type' | 'updatedAt' | 'size';

const SORT_OPTIONS: Array<{ label: string; value: HistorySortBy }> = [
  { label: '最近访问', value: 'lastAccessedAt' },
  { label: '名称', value: 'name' },
  { label: '类型', value: 'type' },
  { label: '修改时间', value: 'updatedAt' },
  { label: '大小', value: 'size' },
];

const TYPE_LABELS: Record<ItemType, string> = {
  video: '视频',
  image: '图片',
  audio: '音频',
  voice: '音色',
  novel: '小说',
  booklet: '本子',
  other: '文件',
};

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
    return <img src={src} alt={entry.item.title} className="h-9 w-9 rounded border border-border object-cover" />;
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
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [roots, setRoots] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRootId, setSelectedRootId] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<HistorySortBy>('lastAccessedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ itemId: string; title: string; path: string; type: ItemType; ext?: string | null } | null>(null);
  const [previewSize, setPreviewSize] = useState<number | undefined>(undefined);
  const [openError, setOpenError] = useState<string | null>(null);

  const pageSize = 50;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

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
        setError(err instanceof Error ? err.message : '加载历史记录失败');
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
      setOpenError(err instanceof Error ? err.message : '打开失败');
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <ClockIcon className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">历史记录</h1>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedRootId('all');
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              selectedRootId === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            全部
          </button>
          {roots.map((root) => (
            <button
              key={root.id}
              type="button"
              onClick={() => {
                setSelectedRootId(root.id);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                selectedRootId === root.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {root.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <BarsArrowDownIcon className="h-4 w-4" />
            排序
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as HistorySortBy);
                setPage(1);
              }}
              className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
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
            className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
      </header>

      {error ? <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
      {openError ? <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{openError}</div> : null}

      <section className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr_120px_200px] border-b border-border bg-secondary/20 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>资源</span>
          <span>类型</span>
          <span className="text-right">最后访问</span>
        </div>
        <div className="max-h-[68vh] overflow-auto">
          {isLoading && entries.length === 0 ? <div className="px-4 py-8 text-sm text-muted-foreground">加载中...</div> : null}
          {!isLoading && entries.length === 0 ? <div className="px-4 py-8 text-sm text-muted-foreground">暂无记录</div> : null}
          {entries.map((entry) => {
            return (
              <div
                key={`${entry.itemId}-${entry.updatedAt}`}
                className="grid cursor-pointer grid-cols-[1fr_120px_200px] items-center gap-2 border-b border-border/40 px-4 py-2 hover:bg-secondary/30"
                onClick={() => {
                  setPreview({
                    itemId: entry.item.id,
                    title: entry.item.title,
                    path: entry.item.path,
                    type: entry.item.type,
                    ext: entry.item.ext,
                  });
                }}
                onDoubleClick={() => void openInWindows(entry)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <HistoryEntryThumb entry={entry} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{entry.item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.item.path}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{TYPE_LABELS[entry.item.type]}</span>
                <span className="text-right text-xs text-muted-foreground">{new Date(entry.lastAccessedAt).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        {entries.length > 0 ? (
          <div className="border-t border-border px-2 py-3">
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
      />
    </div>
  );
}
