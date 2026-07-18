import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BookmarkPresentation } from './presenter';
import { Icon, TagPill, Favicon, AIBadge } from '../../components/ui';
import { formatDate } from '../../utils/format-date';

const COLUMNS = 3;
const ROW_ESTIMATE = 168;

type CardViewProps = {
  items: BookmarkPresentation[];
  isSelected: (id: string) => boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onToggleStar: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
};

/**
 * Card 网格视图（按行虚拟化）。
 * REQ-015-AC-001 / REQ-028 虚拟化
 */
export function CardView({
  items,
  isSelected,
  onSelect,
  onToggleStar,
  onDragStart,
}: CardViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(items.length / COLUMNS);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 4,
  });

  return (
    <div
      ref={parentRef}
      data-view="card"
      aria-label="Card view"
      className="flex-1 overflow-y-auto scroll-thin px-4 pb-6 pt-2"
    >
      <div
        style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * COLUMNS;
          const rowItems = items.slice(start, start + COLUMNS);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 w-full grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {rowItems.map((item) => (
                <CardItem
                  key={item.id}
                  item={item}
                  selected={isSelected(item.id)}
                  onClick={(e) => onSelect(item.id, e)}
                  onDragStart={(e) => onDragStart(e, item.id)}
                  onToggleStar={() => onToggleStar(item.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardItem({
  item,
  selected,
  onClick,
  onDragStart,
  onToggleStar,
}: {
  item: BookmarkPresentation;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onToggleStar: () => void;
}) {
  return (
    <div
      draggable
      data-bookmark-id={item.id}
      data-view-item="card"
      onDragStart={onDragStart}
      onClick={onClick}
      className={`group rounded-mac-lg p-3 cursor-pointer transition-all duration-200 hairline ${
        selected
          ? 'bg-accent-500/15 ring-1 ring-accent-400/40 shadow-card'
          : 'bg-ink-800/50 hover:bg-ink-700/60 hover:shadow-card hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Favicon glyph={item.favicon} color={item.faviconColor} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[13px] font-semibold text-ink-100 leading-snug line-clamp-2 flex-1">
              {item.title}
            </div>
            {item.pinned && <Icon name="Pin" size={11} className="text-amber-400 shrink-0" />}
            {item.health === 'changed' && (
              <Icon name="RefreshCw" size={11} className="text-amber-400 shrink-0" />
            )}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5 truncate">{item.domain}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
            item.starred
              ? 'text-amber-400'
              : 'text-ink-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'
          }`}
        >
          <Icon name="Star" size={13} fill={item.starred ? 'currentColor' : 'none'} />
        </button>
      </div>
      {item.summary && (
        <p className="mt-2.5 text-[11px] text-ink-300 leading-relaxed line-clamp-2 flex gap-1.5">
          <AIBadge label="" />
          <span className="flex-1">{item.summary}</span>
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {item.tags.slice(0, 3).map((tag) => (
            <TagPill key={tag.id} label={tag.label} color={tag.color} size="xs" />
          ))}
          {item.tags.length > 3 && (
            <span className="text-[10px] text-ink-400 self-center">+{item.tags.length - 3}</span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-ink-400 shrink-0">
          <Icon name="Clock" size={10} />
          {formatDate(item.createdAt)}
        </span>
      </div>
    </div>
  );
}
