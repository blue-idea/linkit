import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BookmarkPresentation } from './presenter';
import { Icon, TagPill, Favicon } from '../../components/ui';
import { INITIAL_VIRTUAL_VIEW_RECT } from '../../config/virtualization';
import { BookmarkItemActions, type BookmarkItemActionHandlers } from './BookmarkItemActions';

const ROW_ESTIMATE = 84;

type ListViewProps = BookmarkItemActionHandlers & {
  items: BookmarkPresentation[];
  isSelected: (id: string) => boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onToggleStar: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
};

/**
 * List 紧凑行视图（行虚拟化）。
 * REQ-015-AC-002 / REQ-028 虚拟化
 */
export function ListView({
  items,
  isSelected,
  onSelect,
  onToggleStar,
  onDragStart,
  selectionMode,
  isBulkSelected,
  onToggleSelect,
  onVisit,
  onEdit,
  onMove,
  onDelete,
}: ListViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    initialRect: INITIAL_VIRTUAL_VIEW_RECT,
  });

  return (
    <div
      ref={parentRef}
      data-view="list"
      aria-label="List view"
      className="flex-1 overflow-y-auto scroll-thin px-4 pb-6 pt-2"
    >
      <div
        className="rounded-mac-lg bg-ink-850/40 hairline overflow-hidden relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 w-full border-b border-white/5 last:border-b-0"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <ListItem
                item={item}
                selected={isSelected(item.id)}
                onClick={(e) => onSelect(item.id, e)}
                onDragStart={(e) => onDragStart(e, item.id)}
                onToggleStar={() => onToggleStar(item.id)}
                selectionMode={selectionMode}
                bulkSelected={isBulkSelected(item.id)}
                onToggleSelect={(selected) => onToggleSelect(item.id, selected)}
                onVisit={() => onVisit(item.id)}
                onEdit={() => onEdit(item.id)}
                onMove={() => onMove(item.id)}
                onDelete={() => onDelete(item.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListItem({
  item,
  selected,
  onClick,
  onDragStart,
  onToggleStar,
  selectionMode,
  bulkSelected,
  onToggleSelect,
  onVisit,
  onEdit,
  onMove,
  onDelete,
}: {
  item: BookmarkPresentation;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onToggleStar: () => void;
  selectionMode: boolean;
  bulkSelected: boolean;
  onToggleSelect: (selected: boolean) => void;
  onVisit: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      data-bookmark-id={item.id}
      data-view-item="list"
      onDragStart={onDragStart}
      onClick={onClick}
      className={`group px-4 py-2.5 cursor-pointer transition-colors ${
        selected ? 'bg-accent-500/15' : 'hover:bg-ink-700/40'
      }`}
    >
      <div className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-3">
        <Favicon glyph={item.favicon} color={item.faviconColor} size={28} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-ink-100 truncate">{item.title}</span>
            {item.pinned && <Icon name="Pin" size={11} className="text-amber-400 shrink-0" />}
            {item.health === 'changed' && (
              <Icon name="RefreshCw" size={11} className="text-amber-400 shrink-0" />
            )}
          </div>
          <div className="text-[11px] text-ink-400 truncate flex items-center gap-2">
            <span>{item.domain}</span>
            {item.summary && (
              <span className="text-ink-500">· {item.summary.slice(0, 48)}…</span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          {item.tags.slice(0, 2).map((tag) => (
            <TagPill key={tag.id} label={tag.label} color={tag.color} size="xs" />
          ))}
        </div>
        <div className="hidden md:flex items-center gap-1 text-[11px] text-ink-400">
          <Icon name="Eye" size={11} />
          <span className="tabular-nums">{item.visitCount}</span>
        </div>
        <button
          type="button"
          aria-label={item.starred ? `Unstar ${item.title}` : `Star ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center transition focus-ring ${
            item.starred ? 'text-amber-400' : 'text-ink-500 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Icon name="Star" size={13} fill={item.starred ? 'currentColor' : 'none'} />
        </button>
        <div className={`col-span-3 transition-opacity ${selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <BookmarkItemActions
            title={item.title}
            selected={bulkSelected}
            selectionMode={selectionMode}
            onToggleSelect={onToggleSelect}
            onVisit={onVisit}
            onEdit={onEdit}
            onMove={onMove}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
