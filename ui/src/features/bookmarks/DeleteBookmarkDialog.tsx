import { Icon, Button } from '../../components/ui';

/**
 * 删除书签二次确认（英文文案）。
 * REQ-007-AC-003
 */
export function DeleteBookmarkDialog({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-bookmark-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-coral-500/15 flex items-center justify-center shrink-0">
            <Icon name="Trash2" size={16} className="text-coral-400" />
          </span>
          <div className="min-w-0">
            <h2 id="delete-bookmark-title" className="text-[15px] font-semibold text-ink-100">
              Delete this bookmark?
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              “{title}” will be removed from your library and all collections. This cannot be undone
              from this dialog.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
