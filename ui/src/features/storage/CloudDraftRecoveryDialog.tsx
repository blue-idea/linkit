import { Icon, Button } from '../../components/ui';

/**
 * dirty cloud draft 启动恢复对话框。
 * REQ-003 / REQ-004 草稿恢复路径
 */
export function CloudDraftRecoveryDialog({
  open,
  baseRevision,
  cloudRevision,
  onCancel,
  onKeepDraft,
  onDiscard,
}: {
  open: boolean;
  baseRevision: number | null;
  cloudRevision: number | null;
  onCancel: () => void;
  onKeepDraft: () => void;
  onDiscard: () => void;
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
        aria-labelledby="cloud-draft-recovery-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
            <Icon name="Cloud" size={16} className="text-violet-300" />
          </span>
          <div className="min-w-0">
            <h2 id="cloud-draft-recovery-title" className="text-[15px] font-semibold text-ink-100">
              Unsynced cloud draft found
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              A dirty cloud draft is available. Choose how to continue without silent overwrite.
            </p>
            <p className="text-[12px] text-ink-200 mt-3 tabular-nums" data-testid="cloud-draft-revisions">
              Draft base revision: {baseRevision ?? '—'} · Cloud revision: {cloudRevision ?? '—'}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="subtle" onClick={onKeepDraft}>
            Keep Draft
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            Discard Draft
          </Button>
        </div>
      </div>
    </div>
  );
}
