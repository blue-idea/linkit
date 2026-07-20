import { Icon, Button } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';

/**
 * 多选移出主题确认对话框（确认前零副作用）。
 * REQ-012-AC-011
 */
export function RemoveFromCollectionDialog({
  count,
  collectionName,
  onCancel,
  onConfirm,
}: {
  count: number;
  collectionName: string;
  onCancel: () => void;
  onConfirm: () => void;
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
        aria-label={i18n.t('collection.remove.title')}
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-coral-500/15 flex items-center justify-center shrink-0">
            <Icon name="LogOut" size={16} className="text-coral-400" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink-100">
              {i18n.t('collection.remove.heading', { count })}?
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              {i18n.t('collection.remove.body', { name: collectionName })}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" aria-label={i18n.t('collection.remove.cancel')} onClick={onCancel}>
            {i18n.t('common.cancel')}
          </Button>
          <Button variant="danger" aria-label={i18n.t('collection.remove.confirm')} onClick={onConfirm}>
            {i18n.t('collection.remove.title')}
          </Button>
        </div>
      </div>
    </div>
  );
}
