import { useEffect, useState } from 'react';
import { Button, Icon } from '../../components/ui';
import { APP_EVENTS } from '../../config/events';
import { useI18n } from '../../i18n/use-i18n';
import { subscribeWailsEvent } from '../../services/wails-events';
import { openExternalUrl } from '../bookmarks/external-url';

export type UpdateAvailablePayload = {
  available: boolean;
  version: string;
  releaseUrl: string;
  downloadUrl: string;
};

type EventSubscriber = (
  eventName: string,
  callback: (payload: UpdateAvailablePayload) => void
) => () => void;

type UpdateNotifierProps = {
  subscribe?: EventSubscriber;
  openUrl?: (url: string) => Promise<void> | void;
};

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
    // localStorage 不可用时只关闭当前提示，不阻断主流程。
  }
}

/** 更新提醒：消费后端版本检测事件，并引导用户打开当前平台下载入口。 */
export function UpdateNotifier({
  subscribe = subscribeWailsEvent,
  openUrl = openExternalUrl,
}: UpdateNotifierProps) {
  const i18n = useI18n();
  const [update, setUpdate] = useState<UpdateAvailablePayload | null>(null);

  useEffect(() => subscribe(APP_EVENTS.updateAvailable, (payload) => {
    if (payload.available && payload.version && !isDismissedVersion(payload.version)) {
      setUpdate(payload);
    }
  }), [subscribe]);

  if (!update) return null;

  const downloadURL = update.downloadUrl || update.releaseUrl;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg bg-ink-900/95 p-4 shadow-win hairline" role="status" aria-live="polite">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-200">
          <Icon name="Download" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink-100">
            {i18n.t('update.availableTitle', { version: update.version })}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-ink-300">
            {i18n.t('update.availableBody')}
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                dismissVersion(update.version);
                setUpdate(null);
              }}
            >
              {i18n.t('update.later')}
            </Button>
            <Button
              onClick={() => {
                void openUrl(downloadURL);
                setUpdate(null);
              }}
            >
              {i18n.t('update.download')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
