import { Icon, Button } from '../../components/ui';
import type { StorageSummary } from '../../repositories';
import type { StorageMode } from '../../repositories';
import { useI18n } from '../../i18n/use-i18n';
import type { I18nApi } from '../../i18n';

function formatSummary(i18n: I18nApi, label: string, summary: StorageSummary) {
  if (!summary.exists) {
    return i18n.t('storage.switch.empty', { label });
  }
  const bookmarks = summary.bookmarkCount ?? 0;
  const updated = summary.updatedAt
    ? new Date(summary.updatedAt).toLocaleString(i18n.getLocale() === 'zh' ? 'zh-CN' : 'en-US')
    : i18n.t('storage.switch.unknown');
  return i18n.t('storage.switch.summary', { label, count: bookmarks, updated });
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
  const i18n = useI18n();
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
              {i18n.t('storage.switch.title')}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              {i18n.t('storage.switch.body')}
            </p>
            <p className="text-[12px] text-ink-200 mt-3" data-testid="storage-switch-source">
              {formatSummary(i18n, i18n.t('storage.switch.source', { mode: sourceMode }), sourceSummary)}
            </p>
            <p className="text-[12px] text-ink-200 mt-1" data-testid="storage-switch-target">
              {formatSummary(i18n, i18n.t('storage.switch.target', { mode: targetMode }), targetSummary)}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {i18n.t('common.cancel')}
          </Button>
          <Button variant="subtle" onClick={onUseTarget}>
            {i18n.t('storage.switch.useTarget')}
          </Button>
          <Button variant="danger" onClick={onOverwriteTarget}>
            {i18n.t('storage.switch.overwrite')}
          </Button>
        </div>
      </div>
    </div>
  );
}
