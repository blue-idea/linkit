import type { BookmarkPresentation } from './presenter';
import { Favicon } from '../../components/ui';
import { BookmarkItemActions, type BookmarkItemActionHandlers } from './BookmarkItemActions';

/** 聚合视图内复用的紧凑书签行。 */
export function CompactRow({
  view,
  item,
  selected,
  onClick,
  onDragStart,
  selectionMode,
  isBulkSelected,
  onToggleSelect,
  onVisit,
  onEdit,
  onMove,
  onDelete,
  onRemoveFromCollection,
}: {
  view: string;
  item: BookmarkPresentation;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
} & BookmarkItemActionHandlers) {
  return (
    <div
      draggable
      data-bookmark-id={item.id}
      data-view-item={view}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        selected ? 'bg-accent-500/15' : 'hover:bg-ink-700/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <Favicon glyph={item.favicon} color={item.faviconColor} size={28} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-ink-100 truncate">{item.title}</div>
          <div className="text-[11px] text-ink-400 truncate">{item.domain}</div>
        </div>
      </div>
      <BookmarkItemActions
        title={item.title}
        selected={isBulkSelected(item.id)}
        selectionMode={selectionMode}
        onToggleSelect={(checked) => onToggleSelect(item.id, checked)}
        onVisit={() => onVisit(item.id)}
        onEdit={() => onEdit(item.id)}
        onMove={() => onMove(item.id)}
        onDelete={() => onDelete(item.id)}
        onRemoveFromCollection={
          onRemoveFromCollection
            ? () => onRemoveFromCollection(item.id)
            : undefined
        }
      />
    </div>
  );
}
