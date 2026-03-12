import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, DocumentTextIcon, InformationCircleIcon, TagIcon } from '@heroicons/react/24/outline';
import type { Item, ItemType } from '../types/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PreviewPanel } from '../components/library/PreviewPanel';
import { historyService } from '../services/historyService';
import { itemService } from '../services/itemService';
import { cn } from '../utils/cn';

const TYPE_LABELS: Record<ItemType, string> = {
  video: '视频',
  audio: '音频',
  image: '图片',
  novel: '小说',
  booklet: '本子',
  voice: '音色',
  other: '文件',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError('缺少资源 ID');
      return;
    }

    let cancelled = false;
    async function load(itemId: string) {
      setIsLoading(true);
      setError(null);
      try {
        const loaded = await itemService.getItemById(itemId);
        if (cancelled) return;
        setItem(loaded);
        historyService.recordView(loaded.id).catch(() => {});
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载资源失败');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load(id);
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="正在加载资源..." />;
  }

  if (error) {
    return <CenteredState iconClassName="text-destructive" title={error} actionLabel="返回" onAction={() => navigate(-1)} />;
  }

  if (!item) {
    return <CenteredState iconClassName="text-muted-foreground" title="资源不存在" actionLabel="返回" onAction={() => navigate(-1)} />;
  }

  return (
    <div className="flex flex-col gap-8 pb-12 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-secondary/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          返回
        </button>

        <section className="relative flex min-h-[420px] overflow-hidden rounded-2xl border border-border bg-black/5 shadow-inner dark:bg-black/40">
          <PreviewPanel itemId={item.id} title={item.title} path={item.path} type={item.type} size={item.size} />
        </section>
      </div>

      <aside className="w-full shrink-0 space-y-5 lg:w-[420px]">
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{TYPE_LABELS[item.type]}</span>
            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{formatSize(item.size)}</span>
          </div>
          <h1 className="break-all text-2xl font-bold text-foreground">{item.title}</h1>
        </header>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <InformationCircleIcon className="h-5 w-5 text-muted-foreground" />
            基本信息
          </h2>
          <div className="space-y-3 text-sm">
            <InfoRow label="文件路径" value={item.path} isPath />
            {item.ext ? <InfoRow label="扩展名" value={item.ext} /> : null}
            <InfoRow label="创建时间" value={new Date(item.createdAt).toLocaleString()} />
            <InfoRow label="更新时间" value={new Date(item.updatedAt).toLocaleString()} />
          </div>
        </section>

        {item.tags.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TagIcon className="h-5 w-5 text-muted-foreground" />
              标签
            </h2>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {Object.keys(item.metadata).length > 0 ? (
          <details className="group rounded-xl border border-border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
                元数据
              </span>
              <span className="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="border-t border-border p-5 pt-4">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/50 bg-secondary/30 p-4 font-mono text-xs text-muted-foreground">
                {JSON.stringify(item.metadata, null, 2)}
              </pre>
            </div>
          </details>
        ) : null}
      </aside>
    </div>
  );
}

function CenteredState({ title, iconClassName, actionLabel, onAction }: { title: string; iconClassName: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center">
      <InformationCircleIcon className={cn('mb-4 h-12 w-12', iconClassName)} />
      <p className="text-lg font-medium text-foreground">{title}</p>
      <button onClick={onAction} className="mt-6 text-primary hover:underline">
        {actionLabel}
      </button>
    </div>
  );
}

function InfoRow({ label, value, isPath }: { label: string; value: string; isPath?: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-1 sm:flex-row sm:justify-between sm:gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('text-right text-foreground', isPath ? 'break-all rounded border border-border/50 bg-secondary/30 px-2 py-0.5 font-mono text-xs select-all' : '')}>
        {value}
      </span>
    </div>
  );
}

