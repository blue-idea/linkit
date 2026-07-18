import { Icon, Button } from '../../components/ui';
import type { StorageSummary } from '../../repositories';
import type { StorageMode } from '../../repositories';

function formatSummary(label: string, summary: StorageSummary) {
  if (!summary.exists) {
    return `${label}: empty`;
  }
  const bookmarks = summary.bookmarkCount ?? 0;
  const updated = summary.updatedAt ? new Date(summary.updatedAt).toLocaleString() : 'unknown';
  return `${label}: ${bookmarks} bookmarks · updated ${updated}`;
}

/**
 * 存储切换确认：展示源/目标摘要，确认前不改数据。
 * REQ-004-AC-001~004
 */
export function StorageSwitchDialog({
  open,
  sourceMode,
  targetMode,
  sourceSummary,
  targetSummary,
  onCancel,
  onUseTarget,
  onOverwriteTarget,
}: {
  open: boolean;
  sourceMode: StorageMode;
  targetMode: StorageMode;
  sourceSummary: StorageSummary;
  targetSummary: StorageSummary;
  onCancel: () => void;
  onUseTarget: () => void;
  onOverwriteTarget: () => void;
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
        aria-labelledby="storage-switch-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
            <Icon name="HardDrive" size={16} className="text-sky-400" />
          </span>
          <div className="min-w-0">
            <h2 id="storage-switch-title" className="text-[15px] font-semibold text-ink-100">
              Switch storage mode?
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              Review source and target summaries before any data change.
            </p>
            <p className="text-[12px] text-ink-200 mt-3" data-testid="storage-switch-source">
              {formatSummary(`Source (${sourceMode})`, sourceSummary)}
            </p>
            <p className="text-[12px] text-ink-200 mt-1" data-testid="storage-switch-target">
              {formatSummary(`Target (${targetMode})`, targetSummary)}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="subtle" onClick={onUseTarget}>
            Use Target
          </Button>
          <Button variant="danger" onClick={onOverwriteTarget}>
            Overwrite Target
          </Button>
        </div>
      </div>
    </div>
  );
}
