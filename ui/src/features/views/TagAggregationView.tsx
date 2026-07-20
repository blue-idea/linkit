import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BookmarkPresentation } from './presenter';
import { CompactRow } from './CompactRow';
import { groupBookmarksByTags } from '../../domain/views';
import { Icon, TagPill } from '../../components/ui';
import type { Tag, TagColor } from '../../types';
import type { BookmarkItemActionHandlers } from './BookmarkItemActions';
import { useI18n } from '../../i18n/use-i18n';

type TagAggregationViewProps = BookmarkItemActionHandlers & {
  items: BookmarkPresentation[];
  bookmarks: Array<{ id: string; tags: string[] }>;
  tags: Tag[];
  isSelected: (id: string) => boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
};

type FlatRow =
  | {
      kind: 'header';
      key: string;
      tagId: string;
      label: string;
      color: TagColor;
      count: number;
    }
  | { kind: 'item'; key: string; item: BookmarkPresentation };

/**
 * Tag Aggregation：按标签分组并显示准确计数。
 * REQ-016-AC-003
 */
export function TagAggregationView({
  items,
  bookmarks,
  tags,
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
}: TagAggregationViewProps) {
  const i18n = useI18n();
  const parentRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const tagColor = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.color])), [tags]);

  const groups = useMemo(
    () => groupBookmarksByTags(bookmarks, tags),
    [bookmarks, tags]
  );

  const rows = useMemo<FlatRow[]>(() => {
    const next: FlatRow[] = [];
    for (const group of groups) {
      next.push({
        kind: 'header',
        key: `h-${group.tagId}`,
        tagId: group.tagId,
        label: group.label,
        color: tagColor.get(group.tagId) ?? 'gray',
        count: group.count,
      });
      for (const id of group.bookmarkIds) {
        const item = byId.get(id);
        if (!item) continue;
        next.push({ kind: 'item', key: `${group.tagId}-${id}`, item });
      }
    }
    return next;
  }, [groups, byId, tagColor]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'header' ? 44 : 82),
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      data-view="tag-aggregation"
      aria-label={i18n.t('content.view.tags')}
      className="flex-1 overflow-y-auto scroll-thin px-4 pb-6 pt-1"
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
                  data-tag-group={row.tagId}
                  className="flex items-center gap-2 px-1 py-2"
                >
                  <Icon name="Tags" size={12} className="text-ink-400" />
                  <TagPill label={row.label} color={row.color} size="xs" />
                  <span className="text-[11px] text-ink-500 tabular-nums">{row.count}</span>
                </div>
              ) : (
                <CompactRow
                  view="tag-aggregation"
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
  );
}
