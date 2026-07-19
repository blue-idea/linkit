type BookmarkItemActionsProps = {
  title: string;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (selected: boolean) => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
};

/** 各书签视图共用的底部操作区，避免操作入口和选择逻辑分叉。 */
export function BookmarkItemActions({
  title,
  selected,
  selectionMode,
  onToggleSelect,
  onEdit,
  onMove,
  onDelete,
}: BookmarkItemActionsProps) {
  return (
    <div className="mt-2 flex min-h-5 items-center justify-between gap-2 border-t border-white/5 pt-2">
      {selectionMode ? (
        <label className="text-[10px] text-ink-400" onClick={(event) => event.stopPropagation()}>
          <input aria-label={`Select bookmark ${title}`} type="checkbox" checked={selected} onChange={(event) => onToggleSelect(event.target.checked)} /> Select
        </label>
      ) : <span />}
      <div className="flex items-center gap-2">
        <button aria-label="Edit bookmark" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="text-[10px] text-ink-300 hover:text-accent-300">Edit</button>
        <button aria-label="Move bookmark" onClick={(event) => { event.stopPropagation(); onMove(); }} className="text-[10px] text-ink-300 hover:text-accent-300">Move</button>
        <button aria-label="Delete bookmark" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="text-[10px] text-coral-400 hover:text-coral-300">Delete</button>
      </div>
    </div>
  );
}

export type BookmarkItemActionHandlers = {
  selectionMode: boolean;
  isBulkSelected: (id: string) => boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onEdit: (id: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
};
