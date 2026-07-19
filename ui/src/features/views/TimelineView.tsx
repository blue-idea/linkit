import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BookmarkPresentation } from './presenter';
import {
  groupBookmarksByTimeline,
  type TimelineTimeSource,
} from '../../domain/views';
import { Icon } from '../../components/ui';
import { CompactRow } from './CompactRow';
import type { BookmarkItemActionHandlers } from './BookmarkItemActions';

type TimelineViewProps = BookmarkItemActionHandlers & {
  items: BookmarkPresentation[];
  bookmarks: Array<{ id: string; createdAt: string; lastVisitedAt: string | null }>;
  isSelected: (id: string) => boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
};

type FlatRow =
  | { kind: 'header'; key: string; groupId: string; label: string; count: number }
  | { kind: 'item'; key: string; groupId: string; item: BookmarkPresentation };

/**
 * Timeline：按 createdAt / lastVisitedAt 分组的虚拟化时间流。
 * REQ-016-AC-001~002
 */
export function TimelineView({
  items,
  bookmarks,
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
}: TimelineViewProps) {
  const [timeSource, setTimeSource] = useState<TimelineTimeSource>('createdAt');
  const parentRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const groups = useMemo(
    () => groupBookmarksByTimeline(bookmarks, timeSource),
    [bookmarks, timeSource]
  );

  const rows = useMemo<FlatRow[]>(() => {
    const next: FlatRow[] = [];
    for (const group of groups) {
      next.push({
        kind: 'header',
        key: `h-${group.id}`,
        groupId: group.id,
        label: group.label,
        count: group.bookmarkIds.length,
      });
      for (const id of group.bookmarkIds) {
        const item = byId.get(id);
        if (!item) continue;
        next.push({ kind: 'item', key: `${group.id}-${id}`, groupId: group.id, item });
      }
    }
    return next;
  }, [groups, byId]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'header' ? 40 : 82),
    overscan: 10,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 pb-2 flex items-center justify-end">
        <label className="flex items-center gap-2 text-[11px] text-ink-400">
          <span>Time source</span>
          <select
            aria-label="Timeline time source"
            value={timeSource}
            onChange={(e) => setTimeSource(e.target.value as TimelineTimeSource)}
            className="rounded-lg bg-ink-800/70 hairline text-[12px] text-ink-200 px-2 py-1.5 focus-ring"
          >
            <option value="createdAt">Created at</option>
            <option value="lastVisitedAt">Last visited</option>
          </select>
        </label>
      </div>
      <div
        ref={parentRef}
        data-view="timeline"
        aria-label="Timeline view"
        className="flex-1 overflow-y-auto scroll-thin px-4 pb-6"
      >
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 w-full"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {row.kind === 'header' ? (
                  <div
                    data-timeline-group={row.groupId}
                    className="flex items-center gap-2 px-1 py-2"
                  >
                    <Icon name="Clock" size={12} className="text-ink-400" />
                    <span className="text-[12px] font-semibold text-ink-200">{row.label}</span>
                    <span className="text-[11px] text-ink-500 tabular-nums">{row.count}</span>
                  </div>
                ) : (
                  <CompactRow
                    view="timeline"
                    item={row.item}
                    selected={isSelected(row.item.id)}
                    onClick={(e) => onSelect(row.item.id, e)}
                    onDragStart={(e) => onDragStart(e, row.item.id)}
                    selectionMode={selectionMode}
                    isBulkSelected={isBulkSelected}
                    onToggleSelect={onToggleSelect}
                    onVisit={onVisit}
                    onEdit={onEdit}
                    onMove={onMove}
                    onDelete={onDelete}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
