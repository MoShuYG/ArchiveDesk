import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ItemCard } from './ItemCard';
import type { Item } from '../../types/api';

interface LibraryGridProps {
    items: Item[];
    columnCount?: number;
}

export function LibraryGrid({ items, columnCount = 5 }: LibraryGridProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    // We determine row count
    const rowCount = Math.ceil(items.length / columnCount);

    // Approximate row height (e.g. 260px for card + 24px gap = 284px)
    // The actual ItemCard will size itself based on the column width (aspect ratio)
    // We use 320px as a rough estimate for grid row height in desktop, it needs tweaking per responsive

    // eslint-disable-next-line react-hooks/incompatible-library
    const rowVirtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 340, // Height of card + gap
        overscan: 3,
    });

    return (
        <div
            ref={parentRef}
            className="w-full h-[800px] overflow-auto hide-scrollbar rounded-xl border border-border bg-card/30 p-4"
        >
            <div
                className="w-full relative"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const startIndex = virtualRow.index * columnCount;
                    const rowItems = items.slice(startIndex, startIndex + columnCount);

                    return (
                        <div
                            key={virtualRow.index}
                            className="absolute top-0 left-0 w-full"
                            style={{
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div
                                className="grid gap-6 px-2"
                                style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
                            >
                                {rowItems.map((item) => (
                                    <div key={item.id} className="h-[300px]">
                                        <ItemCard item={item} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
