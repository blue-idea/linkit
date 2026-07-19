import { Icon } from '../../components/ui';

type BookmarkItemActionsProps = {
  title: string;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (selected: boolean) => void;
  onVisit: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRemoveFromCollection?: () => void;
};

/** 各书签视图共用的底部操作区，避免操作入口和选择逻辑分叉。 */
export function BookmarkItemActions({
  title,
  selected,
  selectionMode,
  onToggleSelect,
  onVisit,
  onEdit,
  onMove,
  onDelete,
  onRemoveFromCollection,
}: BookmarkItemActionsProps) {
  const stopAndRun = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <div className="mt-2 flex min-h-5 items-center justify-between gap-2 border-t border-white/5 pt-2">
      {selectionMode ? (
        <label className="text-[10px] text-ink-400" onClick={(event) => event.stopPropagation()}>
          <input aria-label={`Select bookmark ${title}`} type="checkbox" checked={selected} onChange={(event) => onToggleSelect(event.target.checked)} /> Select
        </label>
      ) : <span />}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open bookmark directly"
          title="Open directly"
          onClick={(event) => stopAndRun(event, onVisit)}
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700/60 hover:text-accent-300 focus-ring"
        >
          <Icon name="ExternalLink" size={11} />
        </button>
        <button aria-label="Edit bookmark" onClick={(event) => stopAndRun(event, onEdit)} className="text-[10px] text-ink-300 hover:text-accent-300">Edit</button>
        <button aria-label="Move bookmark" onClick={(event) => stopAndRun(event, onMove)} className="text-[10px] text-ink-300 hover:text-accent-300">Move</button>
        {onRemoveFromCollection && (
          <button
            aria-label="Remove from collection"
            onClick={(event) => stopAndRun(event, onRemoveFromCollection)}
            className="text-[10px] text-ink-300 hover:text-amber-300"
          >
            Remove
          </button>
        )}
        <button aria-label="Delete bookmark" onClick={(event) => stopAndRun(event, onDelete)} className="text-[10px] text-coral-400 hover:text-coral-300">Delete</button>
      </div>
    </div>
  );
}

export type BookmarkItemActionHandlers = {
  selectionMode: boolean;
  isBulkSelected: (id: string) => boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onVisit: (id: string) => void;
  onEdit: (id: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onRemoveFromCollection?: (id: string) => void;
};
