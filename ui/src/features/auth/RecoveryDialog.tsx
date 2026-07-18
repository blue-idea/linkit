interface RecoveryDialogProps {
  recoveryUpdatedAt?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 本机正式资料库损坏且备份可用时的破坏性恢复确认。
 * 文案使用英文，符合错误/关键确认提示规范。
 */
export function RecoveryDialog({ recoveryUpdatedAt, onConfirm, onCancel }: RecoveryDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-ink-900 hairline p-6 shadow-win">
        <h2 id="recovery-dialog-title" className="text-[16px] font-semibold text-ink-100">
          Restore from backup?
        </h2>
        <p className="mt-2 text-[13px] text-ink-300">
          The primary library file is damaged. A verified backup
          {recoveryUpdatedAt ? ` from ${recoveryUpdatedAt}` : ''} is available. Restoring will replace the current
          local library.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] text-ink-300 hover:bg-ink-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-coral-500 px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-110"
          >
            Restore backup
          </button>
        </div>
      </div>
    </div>
  );
}
