import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BookmarkPresentation } from './presenter';
import { CompactRow } from './CompactRow';
import { groupBookmarksByThemes } from '../../domain/views';
import type { Collection } from '../../types';
import type { BookmarkItemActionHandlers } from './BookmarkItemActions';

type ThemeSpaceViewProps = BookmarkItemActionHandlers & {
  items: BookmarkPresentation[];
  collections: Collection[];
  isSelected: (id: string) => boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
};

/**
 * Theme Space：以主题为容器展示元数据与成员（按容器虚拟化）。
 * REQ-016-AC-004
 */
export function ThemeSpaceView({
  items,
  collections,
  isSelected,
  onSelect,
  onDragStart,
  selectionMode,
  isBulkSelected,
  onToggleSelect,
  onVisit,
  onEdit,
  onMove,
  onDelete,
}: ThemeSpaceViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const containers = useMemo(
    () => groupBookmarksByThemes(collections, items),
    [collections, items]
  );

  const virtualizer = useVirtualizer({
    count: containers.length,
    getScrollElement: () => parentRef.current,
    // 容器高度随成员数变化；预估后由 measureElement 校正。
    estimateSize: (index) => 72 + containers[index].count * 82,
    overscan: 4,
  });

  return (
    <div
      ref={parentRef}
      data-view="theme-space"
      aria-label="Theme Space view"
      className="flex-1 overflow-y-auto scroll-thin px-4 pb-6 pt-1"
    >
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const container = containers[virtualRow.index];
          const members = container.bookmarkIds
            .map((id) => byId.get(id))
            .filter((item): item is BookmarkPresentation => Boolean(item));

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 w-full px-0 pb-3"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div
                data-theme-container={container.collectionId}
                className="rounded-mac-lg bg-ink-850/50 hairline px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[16px]" aria-hidden>
                    {container.emoji}
                  </span>
                  <span className="text-[13px] font-semibold text-ink-100">{container.name}</span>
                  <span className="text-[11px] text-ink-500 tabular-nums">{container.count}</span>
                </div>
                {container.description ? (
                  <p className="text-[11px] text-ink-400 mt-1 line-clamp-2">{container.description}</p>
                ) : null}
                <div className="mt-2 space-y-0.5">
                  {members.map((item) => (
                    <CompactRow
                      key={item.id}
                      view="theme-space"
                      item={item}
                      selected={isSelected(item.id)}
                      onClick={(e) => onSelect(item.id, e)}
                      onDragStart={(e) => onDragStart(e, item.id)}
                      selectionMode={selectionMode}
                      isBulkSelected={isBulkSelected}
                      onToggleSelect={onToggleSelect}
                      onVisit={onVisit}
                      onEdit={onEdit}
                      onMove={onMove}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
