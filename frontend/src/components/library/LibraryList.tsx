import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import type { Item } from '../../types/api';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { itemService } from '../../services/itemService';

interface LibraryListProps {
    items: Item[];
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function LibraryList({ items }: LibraryListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const clickTimerRef = useRef<number | null>(null);
    const navigate = useNavigate();

    // eslint-disable-next-line react-hooks/incompatible-library
    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72, // Row height
        overscan: 10,
    });

    return (
        <div
            ref={parentRef}
            className="w-full h-[800px] overflow-auto hide-scrollbar rounded-xl border border-border bg-card/30"
        >
            <div
                className="w-full relative min-w-[600px]"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = items[virtualRow.index];
                    return (
                        <div
                            key={item.id}
                            className="absolute top-0 left-0 w-full px-4"
                            style={{
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div
                                onClick={() => {
                                    if (clickTimerRef.current !== null) {
                                        window.clearTimeout(clickTimerRef.current);
                                    }
                                    clickTimerRef.current = window.setTimeout(() => {
                                        navigate(`/items/${item.id}`);
                                        clickTimerRef.current = null;
                                    }, 220);
                                }}
                                onDoubleClick={() => {
                                    if (clickTimerRef.current !== null) {
                                        window.clearTimeout(clickTimerRef.current);
                                        clickTimerRef.current = null;
                                    }
                                    void itemService.openItemExternally(item.id).catch(() => {});
                                }}
                                className="flex items-center gap-4 h-full py-3 border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors group px-2 rounded-lg"
                            >
                                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                    <DocumentIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
                                            {item.type}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {item.path}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-sm font-medium text-foreground">
                                        {formatSize(item.size)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {new Date(item.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
