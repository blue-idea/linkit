import { useState } from 'react';
import { Icon } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';

type BookmarkItemActionsProps = {
  title: string;
  url?: string;
  categoryName?: string;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (selected: boolean) => void;
  onVisit: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRemoveFromCollection?: () => void;
  onCopyUrl?: (url: string) => void;
};

/** 各书签视图共用的底部操作区，避免操作入口和选择逻辑分叉。 */
export function BookmarkItemActions({
  title,
  url,
  categoryName,
  selected,
  selectionMode,
  onToggleSelect,
  onVisit,
  onEdit,
  onMove,
  onDelete,
  onRemoveFromCollection,
  onCopyUrl,
}: BookmarkItemActionsProps) {
  const i18n = useI18n();
  const [copied, setCopied] = useState(false);

  const stopAndRun = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  const handleCopy = () => {
    if (!url) return;
    if (onCopyUrl) {
      onCopyUrl(url);
    } else {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url);
        }
      } catch {
        // fallback ignore
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 flex min-h-5 items-center justify-between gap-2 border-t border-white/5 pt-2">
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        {selectionMode ? (
          <label className="text-[10px] text-ink-400 shrink-0" onClick={(event) => event.stopPropagation()}>
            <input aria-label={i18n.t('bookmark.select', { title })} type="checkbox" checked={selected} onChange={(event) => onToggleSelect(event.target.checked)} /> {i18n.t('common.select')}
          </label>
        ) : null}
        {categoryName ? (
          <span
            data-testid="bookmark-category-name"
            className="inline-flex items-center gap-1 text-[10px] text-ink-400 max-w-[120px] truncate shrink-0"
            title={categoryName}
          >
            <Icon name="Folder" size={10} className="shrink-0 text-ink-500" />
            <span className="truncate">{categoryName}</span>
          </span>
        ) : null}
        {url ? (
          <button
            type="button"
            data-testid="bookmark-copy-link"
            aria-label={i18n.t('bookmark.copyLink')}
            title={copied ? i18n.t('common.copied') : i18n.t('bookmark.copyLink')}
            onClick={(event) => stopAndRun(event, handleCopy)}
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700/60 hover:text-accent-300 focus-ring shrink-0 transition-colors"
          >
            <Icon name={copied ? 'Check' : 'Copy'} size={11} className={copied ? 'text-mint-400' : ''} />
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
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
