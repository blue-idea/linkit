import { Icon, Button } from '../../components/ui';

/**
 * 删除主题确认：保留成员书签。
 * REQ-012-AC-002
 */
export function DeleteCollectionDialog({
  name,
  memberCount,
  onCancel,
  onConfirm,
}: {
  name: string;
  memberCount: number;
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
        aria-labelledby="delete-collection-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-coral-500/15 flex items-center justify-center shrink-0">
            <Icon name="Trash2" size={16} className="text-coral-400" />
          </span>
          <div className="min-w-0">
            <h2 id="delete-collection-title" className="text-[15px] font-semibold text-ink-100">
              Delete this collection?
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              “{name}” has {memberCount} members. The collection will be removed, but all bookmarks will be kept.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" aria-label="Cancel collection delete" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" aria-label="Confirm delete collection" onClick={onConfirm}>
            Delete collection
          </Button>
        </div>
      </div>
    </div>
  );
}
