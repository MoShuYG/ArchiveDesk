import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  function handlePrev() {
    if (page > 1) onPageChange(page - 1);
  }

  function handleNext() {
    if (page < totalPages) onPageChange(page + 1);
  }

  return (
    <nav className={cn('my-8 flex items-center justify-center gap-1', className)} aria-label="分页导航">
      <button
        onClick={handlePrev}
        disabled={page <= 1}
        className="rounded-md p-2 text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
        aria-label="上一页"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {generatePageNumbers(page, totalPages).map((value, index) =>
        value === '...' ? (
          <span key={`ellipsis-${index}`} className="px-3 py-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={value}
            onClick={() => onPageChange(value)}
            aria-current={page === value ? 'page' : undefined}
            disabled={page === value}
            className={cn(
              'h-10 w-10 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              page === value ? 'pointer-events-none bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
            )}
          >
            {value}
          </button>
        )
      )}

      <button
        onClick={handleNext}
        disabled={page >= totalPages}
        className="rounded-md p-2 text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
        aria-label="下一页"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </nav>
  );
}

function generatePageNumbers(current: number, total: number): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);

  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i += 1) {
    pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | '...'> = [];
  let prev = 0;

  for (const page of sorted) {
    if (page - prev > 1) {
      result.push('...');
    }
    result.push(page);
    prev = page;
  }

  return result;
}
