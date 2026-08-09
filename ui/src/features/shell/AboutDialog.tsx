import { useEffect } from 'react';
import { LINKIT_APP_VERSION } from '../../config/backup';
import { LINKIT_GITHUB_URL } from '../../config/links';
import { useI18n } from '../../i18n/use-i18n';
import { openExternalUrl } from '../bookmarks/external-url';
import { DialogFrame } from '../../components/DialogFrame';
import { Button, Icon } from '../../components/ui';

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
  appVersion?: string;
  githubUrl?: string;
};

/** About：展示应用版本与 GitHub 主页。 */
export function AboutDialog({
  open,
  onClose,
  appVersion = LINKIT_APP_VERSION,
  githubUrl = LINKIT_GITHUB_URL,
}: AboutDialogProps) {
  const i18n = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = i18n.t('about.title');

  return (
    <DialogFrame
      ariaLabel={title}
      dialogClassName="w-full max-w-sm rounded-mac-xl glass-strong ring-glow overflow-hidden animate-scale-in"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <span className="w-9 h-9 rounded-lg bg-ink-700/60 hairline flex items-center justify-center">
          <Icon name="Library" size={17} className="text-ink-100" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-ink-100 leading-tight" role="heading" aria-level={2}>
            {title}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-ink-700/60 text-ink-400 hover:text-ink-100 flex items-center justify-center transition"
          aria-label={i18n.t('common.close')}
        >
          <Icon name="X" size={16} />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-[13px] text-ink-100 font-medium">Linkit</p>
          <p className="text-[12px] text-ink-300">
            {i18n.t('about.version', { version: appVersion })}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-ink-400">{i18n.t('about.github')}</p>
          <a
            href={githubUrl}
            className="inline-flex items-center gap-1.5 text-[13px] text-accent-300 hover:text-accent-200 underline-offset-2 hover:underline break-all"
            onClick={(event) => {
              event.preventDefault();
              void openExternalUrl(githubUrl);
            }}
          >
            <Icon name="ExternalLink" size={13} />
            <span>{githubUrl.replace(/^https?:\/\//, '')}</span>
          </a>
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>
            {i18n.t('common.close')}
          </Button>
        </div>
      </div>
    </DialogFrame>
  );
}
