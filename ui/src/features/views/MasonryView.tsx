import { useMemo } from 'react';
import type { BookmarkPresentation } from './presenter';
import { assignMasonryColumns } from './layout';
import { Icon, Favicon } from '../../components/ui';
import { thumbnailGradients } from '../../colors';

type MasonryViewProps = {
  items: BookmarkPresentation[];
  isSelected: (id: string) => boolean;
  columnCount?: number;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
};

/**
 * Masonry 列布局：按列分配，天然不重叠，视觉区别于 Card 网格。
 * REQ-015-AC-003
 */
export function MasonryView({
  items,
  isSelected,
  columnCount = 3,
  onSelect,
  onDragStart,
}: MasonryViewProps) {
  const columns = useMemo(
    () => assignMasonryColumns(items, columnCount),
    [items, columnCount]
  );

  return (
    <div
      data-view="masonry"
      aria-label="Masonry view"
      className="flex-1 overflow-y-auto scroll-thin px-4 pb-6 pt-2"
    >
      <div
        className="flex gap-3 items-start"
        style={{ minHeight: '100%' }}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={`masonry-col-${columnIndex}`}
            data-masonry-column={columnIndex}
            className="flex-1 min-w-0 flex flex-col gap-3"
          >
            {column.map((item) => (
              <MasonryTile
                key={item.id}
                item={item}
                selected={isSelected(item.id)}
                onClick={(e) => onSelect(item.id, e)}
                onDragStart={(e) => onDragStart(e, item.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MasonryTile({
  item,
  selected,
  onClick,
  onDragStart,
}: {
  item: BookmarkPresentation;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const grad = item.thumbnail
    ? thumbnailGradients[item.thumbnail as keyof typeof thumbnailGradients]
    : thumbnailGradients.gray;

  return (
    <div
      draggable
      data-bookmark-id={item.id}
      data-view-item="masonry"
      onDragStart={onDragStart}
      onClick={onClick}
      className={`rounded-mac-lg overflow-hidden cursor-pointer transition-all hairline ${
        selected ? 'ring-1 ring-accent-400/40' : 'hover:shadow-card hover:-translate-y-0.5'
      }`}
    >
      <div className={`h-20 bg-gradient-to-br ${grad} relative`}>
        <div className="absolute inset-0 bg-ink-950/20" />
        <div className="absolute bottom-2 left-2">
          <Favicon glyph={item.favicon} color={item.faviconColor} size={24} />
        </div>
      </div>
      <div className="px-2.5 py-2 bg-ink-800/60">
        <div className="flex items-center justify-between gap-1">
          <div className="text-[12px] font-semibold text-ink-100 truncate flex-1">{item.title}</div>
          {item.starred && <Icon name="Star" size={11} className="text-amber-400 shrink-0" fill="currentColor" />}
        </div>
        <div className="text-[10px] text-ink-400 truncate mt-0.5">{item.domain}</div>
        {item.summary && (
          <p className="text-[10px] text-ink-300 mt-1.5 line-clamp-3 leading-relaxed">{item.summary}</p>
        )}
      </div>
    </div>
  );
}
