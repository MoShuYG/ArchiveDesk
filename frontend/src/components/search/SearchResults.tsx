import { useSearchStore } from '../../state/searchStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ItemCard } from '../library/ItemCard';

export function SearchResults() {
    const { results, total, page, pageSize, isLoading, error, setPage, search } =
        useSearchStore();

    const totalPages = Math.ceil(total / pageSize);

    function handlePrev() {
        if (page > 1) {
            setPage(page - 1);
            search();
        }
    }

    function handleNext() {
        if (page < totalPages) {
            setPage(page + 1);
            search();
        }
    }

    function goToPage(p: number) {
        setPage(p);
        search();
    }

    if (isLoading) {
        return <LoadingSpinner message="正在搜索..." />;
    }

    if (error) {
        return (
            <div id="search-error" role="alert">
                <p>搜索失败: {error}</p>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div id="search-empty">
                <p>未找到匹配的资源</p>
            </div>
        );
    }

    return (
        <div id="search-results">
            <p id="search-result-count">
                共 {total} 条结果（第 {page}/{totalPages} 页）
            </p>

            <div id="search-result-list">
                {results.map((item) => (
                    <ItemCard key={item.id} item={item} />
                ))}
            </div>

            {totalPages > 1 && (
                <nav id="pagination" aria-label="分页导航">
                    <button
                        id="page-prev"
                        onClick={handlePrev}
                        disabled={page <= 1}
                    >
                        上一页
                    </button>

                    {generatePageNumbers(page, totalPages).map((p, i) =>
                        p === '...' ? (
                            <span key={`ellipsis-${i}`}>...</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => goToPage(p as number)}
                                aria-current={page === p ? 'page' : undefined}
                                disabled={page === p}
                            >
                                {p}
                            </button>
                        )
                    )}

                    <button
                        id="page-next"
                        onClick={handleNext}
                        disabled={page >= totalPages}
                    >
                        下一页
                    </button>
                </nav>
            )}
        </div>
    );
}

/**
 * Generate page numbers to display, with ellipsis for large ranges.
 * Shows: first, last, current, and 2 pages around current.
 */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.add(i);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const result: (number | '...')[] = [];
    let prev = 0;
    for (const p of sorted) {
        if (p - prev > 1) {
            result.push('...');
        }
        result.push(p);
        prev = p;
    }
    return result;
}
