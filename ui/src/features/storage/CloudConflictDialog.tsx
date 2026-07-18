import { Icon, Button } from '../../components/ui';

/**
 * 云 revision 冲突对话框：禁止自动合并。
 * REQ-003-AC-005
 */
export function CloudConflictDialog({
  open,
  cloudRevision,
  onCancel,
  onUseCloudCopy,
  onOverwriteCloud,
}: {
  open: boolean;
  cloudRevision: number | null;
  onCancel: () => void;
  onUseCloudCopy: () => void;
  onOverwriteCloud: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-conflict-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Icon name="AlertCircle" size={16} className="text-amber-400" />
          </span>
          <div className="min-w-0">
            <h2 id="cloud-conflict-title" className="text-[15px] font-semibold text-ink-100">
              Cloud revision conflict
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              The cloud library changed on another device. Automatic saving is paused until you choose.
            </p>
            {cloudRevision !== null && (
              <p className="text-[12px] text-ink-200 mt-3 tabular-nums" data-testid="cloud-conflict-revision">
                Cloud revision: {cloudRevision}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="subtle" onClick={onUseCloudCopy}>
            Use Cloud Copy
          </Button>
          <Button variant="danger" onClick={onOverwriteCloud}>
            Overwrite Cloud
          </Button>
        </div>
      </div>
    </div>
  );
}
