import { Icon, Button } from '../../components/ui';
import type { ImportSummary } from './document';
import type { I18nApi } from '../../i18n';

/**
 * 导入覆盖确认对话框：展示摘要，确认前不修改资料库。
 * 覆盖 REQ-005-AC-002。
 */
export function ImportOverwriteDialog({
  open,
  summary,
  i18n,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  summary: ImportSummary;
  i18n: I18nApi;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-overwrite-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Icon name="Upload" size={16} className="text-amber-400" />
          </span>
          <div className="min-w-0">
            <h2 id="import-overwrite-title" className="text-[15px] font-semibold text-ink-100">
              {i18n.t('import.overwriteTitle')}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              {i18n.t('import.overwriteBody')}
            </p>
            <p className="text-[12px] text-ink-200 mt-3 tabular-nums" data-testid="import-summary">
              {i18n.t('import.summary', {
                bookmarks: summary.bookmarks,
                categories: summary.categories,
                collections: summary.collections,
                tags: summary.tags,
              })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {i18n.t('import.cancel')}
          </Button>
          <Button variant="danger" icon="Upload" onClick={onConfirm}>
            {i18n.t('import.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
