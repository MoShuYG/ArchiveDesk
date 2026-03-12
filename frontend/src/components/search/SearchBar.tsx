import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AdjustmentsHorizontalIcon,
  BarsArrowDownIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import type { ItemType, LibraryRoot, SearchSort } from '../../types/api';
import { libraryService } from '../../services/libraryService';
import { useSearchStore } from '../../state/searchStore';
import { cn } from '../../utils/cn';

const TYPE_OPTIONS: Array<{ label: string; value: ItemType | '' }> = [
  { label: '全部类型', value: '' },
  { label: '视频', value: 'video' },
  { label: '图片', value: 'image' },
  { label: '本子', value: 'booklet' },
  { label: '小说', value: 'novel' },
  { label: '音频', value: 'audio' },
  { label: '音色', value: 'voice' },
  { label: '其他', value: 'other' },
];

export function SearchBar() {
  const {
    query,
    type: typeFilter,
    rootId: rootIdFilter,
    sort,
    order,
    setQuery,
    setType,
    setRootId,
    setSort,
    setOrder,
    search,
  } = useSearchStore();

  const [localQuery, setLocalQuery] = useState(query);
  const [roots, setRoots] = useState<LibraryRoot[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    libraryService
      .listRoots()
      .then(setRoots)
      .catch(() => setRoots([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== query) {
        setQuery(localQuery);
        void search();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, query, setQuery, search]);

  function handleTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as ItemType | '';
    setType(value || undefined);
    void search();
  }

  function handleRootChange(event: ChangeEvent<HTMLSelectElement>) {
    setRootId(event.target.value || undefined);
    void search();
  }

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    setSort(event.target.value as SearchSort);
    void search();
  }

  function handleOrderChange(event: ChangeEvent<HTMLSelectElement>) {
    setOrder(event.target.value as 'asc' | 'desc');
    void search();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search();
  }

  return (
    <div className="mx-auto mb-8 w-full max-w-5xl rounded-2xl border border-border bg-card p-2 shadow-sm">
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 p-1">
        <div className="absolute left-4 text-muted-foreground">
          <MagnifyingGlassIcon className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={localQuery}
          onChange={(event) => setLocalQuery(event.target.value)}
          placeholder="按标题、路径、标签搜索..."
          className="flex-1 border-none bg-transparent py-3 pl-10 pr-4 text-lg text-foreground placeholder:text-muted-foreground focus:ring-0"
        />
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 transition-colors hover:bg-secondary',
            showFilters ? 'bg-secondary font-medium text-primary' : 'text-muted-foreground'
          )}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
          <span className="hidden sm:inline">筛选</span>
        </button>
      </form>

      <div
        className={cn(
          'grid overflow-hidden px-4 transition-all duration-300 ease-in-out',
          showFilters ? 'mt-2 grid-rows-[1fr] border-t border-border py-4 opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="grid min-h-0 grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TagIcon className="h-3.5 w-3.5" />
              类型
            </label>
            <select
              value={typeFilter || ''}
              onChange={handleTypeChange}
              className="w-full cursor-pointer rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <FolderIcon className="h-3.5 w-3.5" />
              根目录
            </label>
            <select
              value={rootIdFilter || ''}
              onChange={handleRootChange}
              className="w-full cursor-pointer rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary"
            >
              <option value="">全部根目录</option>
              {roots.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <BarsArrowDownIcon className="h-3.5 w-3.5" />
              排序字段
            </label>
            <select
              value={sort}
              onChange={handleSortChange}
              className="w-full cursor-pointer rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary"
            >
              <option value="relevance">相关度</option>
              <option value="name">名称</option>
              <option value="type">类型</option>
              <option value="updatedAt">修改时间</option>
              <option value="size">大小</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ArrowsUpDownIcon className="h-3.5 w-3.5" />
              排序方式
            </label>
            <select
              value={order}
              onChange={handleOrderChange}
              className="w-full cursor-pointer rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary"
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
