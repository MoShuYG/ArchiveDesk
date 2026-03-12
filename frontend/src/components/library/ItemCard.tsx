import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenIcon,
  DocumentIcon,
  DocumentTextIcon,
  FilmIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import type { Item } from '../../types/api';
import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage';
import { cn } from '../../utils/cn';
import { itemService } from '../../services/itemService';

interface ItemCardProps {
  item: Item;
}

const TYPE_ICONS: Record<string, typeof FilmIcon> = {
  video: FilmIcon,
  image: PhotoIcon,
  booklet: BookOpenIcon,
  novel: DocumentTextIcon,
  audio: MusicalNoteIcon,
  voice: MicrophoneIcon,
  other: DocumentIcon,
};

const TYPE_LABELS: Record<string, string> = {
  video: '视频',
  image: '图片',
  booklet: '本子',
  novel: '小说',
  audio: '音频',
  voice: '音色',
  other: '其他',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate();
  const clickTimerRef = useRef<number | null>(null);
  const Icon = TYPE_ICONS[item.type] || DocumentIcon;
  const thumbnailUrl = item.type === 'image' ? `/api/items/${item.id}/thumbnail` : null;
  const { src: thumbnailSrc } = useAuthenticatedImage(thumbnailUrl);

  function handleOpen() {
    navigate(`/items/${item.id}`);
  }

  function handleSingleClick() {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = window.setTimeout(() => {
      handleOpen();
      clickTimerRef.current = null;
    }, 220);
  }

  function handleDoubleClick() {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    void itemService.openItemExternally(item.id).catch(() => {});
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      aria-label={`查看 ${item.title}`}
      className={cn(
        'group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300',
        'hover:-translate-y-1 hover:border-primary/30 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary/30">
        {thumbnailSrc ? (
          <img src={thumbnailSrc} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : null}

        <div className={cn('absolute inset-0 items-center justify-center text-muted-foreground', thumbnailSrc ? 'hidden' : 'flex')}>
          <Icon className="h-16 w-16 opacity-40 transition-all duration-300 group-hover:scale-110 group-hover:opacity-60" />
        </div>

        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-md">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {TYPE_LABELS[item.type] || '未知'}
        </div>

        <div className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-md">
          {formatSize(item.size)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight transition-colors group-hover:text-primary" title={item.title}>
          {item.title}
        </h3>
        {item.tags.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {tag}
              </span>
            ))}
            {item.tags.length > 3 ? (
              <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                +{item.tags.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
