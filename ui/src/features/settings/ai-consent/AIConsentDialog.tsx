import { Icon, Button } from '../../../components/ui';
import { useI18n } from '../../../i18n/use-i18n';

/**
 * AI 数据发送授权对话框：确认前不得发送收藏内容。
 * REQ-019-AC-005
 */
export function AIConsentDialog({
  open,
  apiBase,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  apiBase: string;
  onCancel: () => void;
  onConfirm: () => void;
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
        aria-labelledby="ai-consent-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-violet2-500/15 flex items-center justify-center shrink-0">
            <Icon name="Sparkles" size={16} className="text-violet2-300" />
          </span>
          <div className="min-w-0">
            <h2 id="ai-consent-title" className="text-[15px] font-semibold text-ink-100">
              {i18n.t('ai.consent.title')}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
              {i18n.t('ai.consent.body')}
            </p>
            <p className="text-[12px] text-ink-200 mt-3 break-all" data-testid="ai-consent-api-base">
              {i18n.t('ai.consent.provider', { provider: apiBase || '—' })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {i18n.t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {i18n.t('ai.consent.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
