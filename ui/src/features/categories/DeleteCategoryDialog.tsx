import { Icon, Button } from '../../components/ui';

/**
 * 分类删除三选一确认（英文文案）。
 * REQ-010-AC-003~005
 */
export function DeleteCategoryDialog({
  name,
  childCount,
  bookmarkCount,
  awaitingRecursiveConfirm,
  onCancel,
  onMoveThenDelete,
  onRecursiveDelete,
}: {
  name: string;
  childCount: number;
  bookmarkCount: number;
  awaitingRecursiveConfirm: boolean;
  onCancel: () => void;
  onMoveThenDelete: () => void;
  onRecursiveDelete: () => void;
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
        aria-labelledby="delete-category-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-coral-500/15 flex items-center justify-center shrink-0">
            <Icon name="Trash2" size={16} className="text-coral-400" />
          </span>
          <div className="min-w-0">
            <h2 id="delete-category-title" className="text-[15px] font-semibold text-ink-100">
              {awaitingRecursiveConfirm ? 'Confirm recursive delete?' : 'Delete this category?'}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              {awaitingRecursiveConfirm
                ? `“${name}” and all descendant categories will be removed. Affected bookmarks become uncategorized.`
                : `“${name}” has ${childCount} child categories and ${bookmarkCount} bookmarks. Choose how to proceed.`}
            </p>
          </div>
        </div>

        {awaitingRecursiveConfirm ? (
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="danger" aria-label="Confirm recursive delete" onClick={onRecursiveDelete}>
              Delete recursively
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="subtle" aria-label="Move contents then delete" onClick={onMoveThenDelete}>
              Move contents then delete
            </Button>
            <Button variant="danger" aria-label="Delete recursively" onClick={onRecursiveDelete}>
              Delete recursively
            </Button>
            <Button variant="ghost" aria-label="Cancel category delete" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
