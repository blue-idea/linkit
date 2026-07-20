import { Icon, Button } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';

/**
 * 分类删除三选一确认。
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
  const i18n = useI18n();
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
              {awaitingRecursiveConfirm
                ? i18n.t('category.delete.confirmTitle')
                : i18n.t('category.delete.title')}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              {awaitingRecursiveConfirm
                ? i18n.t('category.delete.confirmBody', { name })
                : i18n.t('category.delete.body', {
                    name,
                    children: childCount,
                    bookmarks: bookmarkCount,
                  })}
            </p>
          </div>
        </div>

        {awaitingRecursiveConfirm ? (
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              {i18n.t('common.cancel')}
            </Button>
            <Button variant="danger" aria-label={i18n.t('category.delete.confirmRecursive')} onClick={onRecursiveDelete}>
              {i18n.t('category.delete.recursive')}
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="subtle" aria-label={i18n.t('category.delete.moveThen')} onClick={onMoveThenDelete}>
              {i18n.t('category.delete.moveThen')}
            </Button>
            <Button variant="danger" aria-label={i18n.t('category.delete.recursive')} onClick={onRecursiveDelete}>
              {i18n.t('category.delete.recursive')}
            </Button>
            <Button variant="ghost" aria-label={i18n.t('category.delete.cancel')} onClick={onCancel}>
              {i18n.t('common.cancel')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
