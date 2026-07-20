import { Icon } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';

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
  const i18n = useI18n();
  const stopAndRun = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <div className="mt-2 flex min-h-5 items-center justify-between gap-2 border-t border-white/5 pt-2">
      {selectionMode ? (
        <label className="text-[10px] text-ink-400" onClick={(event) => event.stopPropagation()}>
          <input aria-label={i18n.t('bookmark.select', { title })} type="checkbox" checked={selected} onChange={(event) => onToggleSelect(event.target.checked)} /> {i18n.t('common.select')}
        </label>
      ) : <span />}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={i18n.t('bookmark.openDirect')}
          title={i18n.t('bookmark.openDirectShort')}
          onClick={(event) => stopAndRun(event, onVisit)}
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700/60 hover:text-accent-300 focus-ring"
        >
          <Icon name="ExternalLink" size={11} />
        </button>
        <button aria-label={i18n.t('bookmark.edit')} onClick={(event) => stopAndRun(event, onEdit)} className="text-[10px] text-ink-300 hover:text-accent-300">{i18n.t('common.edit')}</button>
        <button aria-label={i18n.t('bookmark.move')} onClick={(event) => stopAndRun(event, onMove)} className="text-[10px] text-ink-300 hover:text-accent-300">{i18n.t('common.move')}</button>
        {onRemoveFromCollection && (
          <button
            aria-label={i18n.t('bookmark.remove')}
            onClick={(event) => stopAndRun(event, onRemoveFromCollection)}
            className="text-[10px] text-ink-300 hover:text-amber-300"
          >
            {i18n.t('common.remove')}
          </button>
        )}
        <button aria-label={i18n.t('bookmark.delete')} onClick={(event) => stopAndRun(event, onDelete)} className="text-[10px] text-coral-400 hover:text-coral-300">{i18n.t('common.delete')}</button>
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
