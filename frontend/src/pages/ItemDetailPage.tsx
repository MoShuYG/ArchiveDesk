import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, DocumentTextIcon, InformationCircleIcon, TagIcon } from '@heroicons/react/24/outline';
import type { Item } from '../types/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PreviewPanel } from '../components/library/PreviewPanel';
import { historyService } from '../services/historyService';
import { itemService } from '../services/itemService';
import { cn } from '../utils/cn';
import { useI18n } from '../hooks/useI18n';
import type { MessageKey } from '../i18n';
import { ITEM_TYPE_LABEL_KEYS } from '../i18n/labels';

type DetailError = { value: unknown; fallbackKey: MessageKey };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, t, localizeError } = useI18n();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<DetailError | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError({ value: null, fallbackKey: 'errors.missingItemId' });
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
        setError({ value: err, fallbackKey: 'errors.loadItemFailed' });
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
    return <LoadingSpinner fullScreen message={t('detail.loading')} />;
  }

  if (error) {
    return <CenteredState iconClassName="text-destructive" title={localizeError(error.value, error.fallbackKey)} actionLabel={t('common.back')} onAction={() => navigate(-1)} />;
  }

  if (!item) {
    return <CenteredState iconClassName="text-muted-foreground" title={t('detail.notFound')} actionLabel={t('common.back')} onAction={() => navigate(-1)} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-10 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="app-button-secondary w-fit"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('common.back')}
        </button>

        <PreviewPanel itemId={item.id} title={item.title} path={item.path} type={item.type} size={item.size} ext={item.ext} />
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:w-[390px]">
        <header className="app-surface space-y-3 p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{t(ITEM_TYPE_LABEL_KEYS[item.type])}</span>
            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{formatSize(item.size)}</span>
          </div>
          <h1 className="break-all text-xl font-bold leading-snug text-foreground sm:text-2xl">{item.title}</h1>
        </header>

        <section className="app-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <InformationCircleIcon className="h-5 w-5 text-muted-foreground" />
            {t('detail.basicInfo')}
          </h2>
          <div className="space-y-3 text-sm">
            <InfoRow label={t('detail.filePath')} value={item.path} isPath />
            {item.ext ? <InfoRow label={t('detail.extension')} value={item.ext} /> : null}
            <InfoRow label={t('detail.createdAt')} value={new Date(item.createdAt).toLocaleString(locale)} />
            <InfoRow label={t('detail.updatedAt')} value={new Date(item.updatedAt).toLocaleString(locale)} />
          </div>
        </section>

        {item.tags.length > 0 ? (
          <section className="app-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TagIcon className="h-5 w-5 text-muted-foreground" />
              {t('detail.tags')}
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
          <details className="app-surface group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
                {t('detail.metadata')}
              </span>
              <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="border-t border-border p-5 pt-4">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-4 font-mono text-xs leading-6 text-muted-foreground">
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
    <div className="app-surface flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <InformationCircleIcon className={cn('mb-4 h-12 w-12', iconClassName)} />
      <p className="text-lg font-medium text-foreground">{title}</p>
      <button onClick={onAction} className="app-button-secondary mt-6">
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

