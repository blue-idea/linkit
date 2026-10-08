import { useEffect, useState } from 'react';
import { Button, Icon } from '../../components/ui';
import { APP_EVENTS } from '../../config/events';
import type { MessageKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/use-i18n';
import { subscribeWailsEvent } from '../../services/wails-events';
import { openExternalUrl } from '../bookmarks/external-url';

export type UpdateAvailablePayload = {
  available: boolean;
  version: string;
  releaseUrl: string;
  downloadUrl: string;
  error?: string;
};

type EventSubscriber = (
  eventName: string,
  callback: (payload: UpdateAvailablePayload) => void
) => () => void;

type UpdateNotifierProps = {
  subscribe?: EventSubscriber;
  openUrl?: (url: string) => Promise<void> | void;
};

type Notice =
  | { kind: 'available'; update: UpdateAvailablePayload }
  | { kind: 'checking' }
  | { kind: 'current' }
  | { kind: 'failed' };

const DISMISSED_VERSION_KEY = 'linkit.update.dismissedVersion';

function isDismissedVersion(version: string): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_VERSION_KEY) === version;
  } catch {
    return false;
  }
}

function dismissVersion(version: string): void {
  try {
    window.localStorage.setItem(DISMISSED_VERSION_KEY, version);
  } catch {
    // localStorage 不可用时只关闭当前提示，不阻塞主流程。
  }
}

function resolveFinishedNotice(payload: UpdateAvailablePayload): Notice {
  if (payload.error) return { kind: 'failed' };
  if (payload.available) return { kind: 'available', update: payload };
  return { kind: 'current' };
}

function statusCopyKeys(notice: Exclude<Notice, { kind: 'available' }>): { title: MessageKey; body: MessageKey } {
  switch (notice.kind) {
    case 'checking':
      return {
        title: 'update.checkingTitle',
        body: 'update.checkingBody',
      };
    case 'current':
      return {
        title: 'update.currentTitle',
        body: 'update.currentBody',
      };
    case 'failed':
      return {
        title: 'update.failedTitle',
        body: 'update.failedBody',
      };
  }
}

export function UpdateNotifier({
  subscribe = subscribeWailsEvent,
  openUrl = openExternalUrl,
}: UpdateNotifierProps) {
  const i18n = useI18n();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const unsubscribeAvailable = subscribe(APP_EVENTS.updateAvailable, (payload) => {
      if (payload.available && payload.version && !isDismissedVersion(payload.version)) {
        setNotice({ kind: 'available', update: payload });
      }
    });
    const unsubscribeStarted = subscribe(APP_EVENTS.updateCheckStarted, () => {
      setNotice({ kind: 'checking' });
    });
    const unsubscribeFinished = subscribe(APP_EVENTS.updateCheckFinished, (payload) => {
      setNotice(resolveFinishedNotice(payload));
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeStarted();
      unsubscribeFinished();
    };
  }, [subscribe]);

  if (!notice) return null;

  let title: string;
  let body: string;
  if (notice.kind === 'available') {
    title = i18n.t('update.availableTitle', { version: notice.update.version });
    body = i18n.t('update.availableBody');
  } else {
    const status = statusCopyKeys(notice);
    title = i18n.t(status.title);
    body = i18n.t(status.body);
  }
  const iconName =
    notice.kind === 'available'
      ? 'Download'
      : notice.kind === 'checking'
        ? 'RefreshCw'
        : notice.kind === 'failed'
          ? 'AlertCircle'
          : 'Check';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg bg-ink-900/95 p-4 shadow-win hairline" role="status" aria-live="polite">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-200">
          <Icon name={iconName} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink-100">
            {title}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-ink-300">
            {body}
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {notice.kind === 'available' ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    dismissVersion(notice.update.version);
                    setNotice(null);
                  }}
                >
                  {i18n.t('update.later')}
                </Button>
                <Button
                  onClick={() => {
                    const downloadURL = notice.update.downloadUrl || notice.update.releaseUrl;
                    if (downloadURL) void openUrl(downloadURL);
                    setNotice(null);
                  }}
                >
                  {i18n.t('update.download')}
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setNotice(null)}>
                {i18n.t('common.close')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
