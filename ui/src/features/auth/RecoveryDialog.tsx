interface RecoveryDialogProps {
  recoveryUpdatedAt?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 本机正式资料库损坏且备份可用时的破坏性恢复确认。
 * 系统文案跟随应用语言；备份时间保持原始数据。
 */
export function RecoveryDialog({ recoveryUpdatedAt, onConfirm, onCancel }: RecoveryDialogProps) {
  const i18n = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-ink-900 hairline p-6 shadow-win">
        <h2 id="recovery-dialog-title" className="text-[16px] font-semibold text-ink-100">
          {i18n.t('auth.recovery.title')}
        </h2>
        <p className="mt-2 text-[13px] text-ink-300">
          {i18n.t('auth.recovery.body')}
          {recoveryUpdatedAt ? ` (${recoveryUpdatedAt})` : ''}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] text-ink-300 hover:bg-ink-800"
          >
            {i18n.t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-coral-500 px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-110"
          >
            {i18n.t('auth.recovery.restore')}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useI18n } from '../../i18n/use-i18n';
