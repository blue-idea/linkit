import { Icon, Button } from '../../components/ui';
import { DialogFrame } from '../../components/DialogFrame';
import type { ImportSummary } from './document';
import type { BrowserBookmarkImportSummary } from './browser-html';
import type { BrowserImportProgress } from './restore';
import type { I18nApi } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';

/**
 * 导入覆盖确认对话框：展示摘要，确认前不修改资料库。
 * 覆盖 REQ-005-AC-002。
 */
export function ImportOverwriteDialog({
  open,
  summary,
  i18n,
  busy = false,
  progress = null,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  summary: ImportSummary | BrowserBookmarkImportSummary;
  i18n: I18nApi;
  busy?: boolean;
  progress?: BrowserImportProgress | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const browserImport = summary.mode === 'browser-bookmarks';
  const titleKey = browserImport ? 'import.browserOverwriteTitle' : 'import.overwriteTitle';
  const bodyKey = browserImport ? 'import.browserOverwriteBody' : 'import.overwriteBody';
  const summaryText = browserImport
    ? i18n.t('import.browserSummary', {
        folders: summary.folders,
        bookmarks: summary.bookmarks,
        newBookmarks: summary.newBookmarks,
        skippedDuplicates: summary.skippedDuplicates,
      })
    : i18n.t('import.summary', {
        bookmarks: summary.bookmarks,
        categories: summary.categories,
        collections: summary.collections,
        tags: summary.tags,
    });
  const activeProgress = progress ?? {
    stage: 'saving' as const,
    completed: 0,
    total: browserImport ? summary.newBookmarks : 0,
  };
  const progressStageKey = `import.progress.${activeProgress.stage}` as MessageKey;
  const progressTotal = Math.max(activeProgress.total, 1);
  const progressCompleted = Math.min(
    Math.max(activeProgress.completed, 0),
    progressTotal,
  );

  return (
    <DialogFrame
      containerClassName="fixed inset-0 z-[90] flex items-center justify-center p-4"
      backdropClassName="bg-black/55"
      ariaLabelledby="import-overwrite-title"
      dialogClassName="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
    >
      <div className="contents">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Icon name="Upload" size={16} className="text-amber-400" />
          </span>
          <div className="min-w-0">
            <h2 id="import-overwrite-title" className="text-[15px] font-semibold text-ink-100">
              {i18n.t(titleKey)}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              {i18n.t(bodyKey)}
            </p>
            <p className="text-[12px] text-ink-200 mt-3 tabular-nums" data-testid="import-summary">
              {summaryText}
            </p>
            <p className="text-[12px] text-ink-200 mt-2" data-testid="import-settings-summary">
              {i18n.t(
                !browserImport && summary.settingsIncluded
                  ? 'import.settingsIncluded'
                  : 'import.settingsKept',
              )}
            </p>
            {!browserImport && summary.settingsIncluded && (
              <p className="text-[11px] text-ink-400 mt-1" data-testid="import-settings-details">
                {i18n.t('import.settingsDetails', {
                  theme: summary.theme ?? '',
                  locale: summary.locale ?? '',
                  storageMode: summary.storageMode ?? '',
                  uiSize: summary.uiSize ?? '',
                })}
              </p>
            )}
            {browserImport && busy && (
              <div className="mt-4 space-y-1.5" data-testid="import-progress">
                <div className="flex items-center justify-between text-[11px] text-ink-300">
                  <span data-testid="import-progress-stage">{i18n.t(progressStageKey)}</span>
                  <span className="tabular-nums" data-testid="import-progress-count">
                    {activeProgress.completed} / {activeProgress.total}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={i18n.t('import.progress.label')}
                  aria-valuemin={0}
                  aria-valuemax={progressTotal}
                  aria-valuenow={progressCompleted}
                  className="h-1.5 overflow-hidden rounded-full bg-ink-700/70"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-mint-500 transition-all"
                    style={{ width: `${(progressCompleted / progressTotal) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {i18n.t('import.cancel')}
          </Button>
          <Button variant="danger" icon="Upload" onClick={onConfirm} disabled={busy}>
            {i18n.t(
              busy
                ? 'import.importing'
                : browserImport
                  ? 'import.browserConfirm'
                  : 'import.confirm',
            )}
          </Button>
        </div>
      </div>
    </DialogFrame>
  );
}
