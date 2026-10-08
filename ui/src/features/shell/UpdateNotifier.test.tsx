import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { APP_EVENTS } from '../../config/events';
import { I18nProvider } from '../../i18n/use-i18n';
import { UpdateNotifier, type UpdateAvailablePayload } from './UpdateNotifier';

describe('UpdateNotifier', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  test('收到新版本事件后展示下载提示', async () => {
    const payload: UpdateAvailablePayload = {
      available: true,
      version: '0.4.0',
      releaseUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
      downloadUrl: 'https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.dmg',
    };
    const subscribedEvents: string[] = [];

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          subscribedEvents.push(eventName);
          if (eventName === APP_EVENTS.updateAvailable) callback(payload);
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    expect(subscribedEvents).toContain(APP_EVENTS.updateAvailable);
    const notice = await screen.findByRole('status');
    expect(within(notice).getByText(/new version 0\.4\.0 is available/i)).toBeInTheDocument();
    expect(within(notice).getByRole('button', { name: /download update/i })).toBeInTheDocument();
  });

  test('点击下载按钮后打开下载链接并关闭提示', async () => {
    const user = userEvent.setup();
    const openUrl = vi.fn();
    const payload: UpdateAvailablePayload = {
      available: true,
      version: '0.4.0',
      releaseUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
      downloadUrl: 'https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.exe',
    };

    render(
      <UpdateNotifier
        subscribe={(_, callback) => {
          callback(payload);
          return () => undefined;
        }}
        openUrl={openUrl}
      />
    );

    await user.click(await screen.findByRole('button', { name: /download update/i }));

    expect(openUrl).toHaveBeenCalledWith(payload.downloadUrl);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('点击稍后隐藏当前提示', async () => {
    const user = userEvent.setup();

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          if (eventName === APP_EVENTS.updateAvailable) callback({
            available: true,
            version: '0.4.0',
            releaseUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
            downloadUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
          });
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    await user.click(await screen.findByRole('button', { name: /later/i }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('点击稍后会记住当前版本并忽略重复事件', async () => {
    const user = userEvent.setup();
    const callbacks: Array<(payload: UpdateAvailablePayload) => void> = [];
    const payload: UpdateAvailablePayload = {
      available: true,
      version: '0.4.0',
      releaseUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
      downloadUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
    };

    render(
      <UpdateNotifier
        subscribe={(_, callback) => {
          callbacks.push(callback);
          callback(payload);
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    await user.click(await screen.findByRole('button', { name: /later/i }));

    expect(window.localStorage.getItem('linkit.update.dismissedVersion')).toBe('0.4.0');
    callbacks[0]?.(payload);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('已忽略版本的自动事件不会显示通知', () => {
    window.localStorage.setItem('linkit.update.dismissedVersion', '0.4.0');

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          if (eventName === APP_EVENTS.updateAvailable) {
            callback({
              available: true,
              version: '0.4.0',
              releaseUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
              downloadUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
            });
          }
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  test('manual check shows checking feedback immediately', async () => {
    const callbacks = new Map<string, (payload: UpdateAvailablePayload) => void>();

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          callbacks.set(eventName, callback);
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    callbacks.get(APP_EVENTS.updateCheckStarted)?.({
      available: false,
      version: '',
      releaseUrl: '',
      downloadUrl: '',
    });

    const notice = await screen.findByRole('status');
    expect(within(notice).getByText(/checking for updates/i)).toBeInTheDocument();
  });

  test('manual check shows current feedback when no update is available', async () => {
    const callbacks = new Map<string, (payload: UpdateAvailablePayload) => void>();

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          callbacks.set(eventName, callback);
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    callbacks.get(APP_EVENTS.updateCheckFinished)?.({
      available: false,
      version: '',
      releaseUrl: '',
      downloadUrl: '',
    });

    const notice = await screen.findByRole('status');
    expect(within(notice).getByText(/linkit is up to date/i)).toBeInTheDocument();
  });

  test('manual check feedback follows the current Chinese locale', async () => {
    const callbacks = new Map<string, (payload: UpdateAvailablePayload) => void>();

    render(
      <I18nProvider locale="zh">
        <UpdateNotifier
          subscribe={(eventName, callback) => {
            callbacks.set(eventName, callback);
            return () => undefined;
          }}
          openUrl={vi.fn()}
        />
      </I18nProvider>
    );

    callbacks.get(APP_EVENTS.updateCheckFinished)?.({
      available: false,
      version: '',
      releaseUrl: '',
      downloadUrl: '',
    });

    const notice = await screen.findByRole('status');
    expect(within(notice).getByText('Linkit 已是最新版本')).toBeInTheDocument();
    expect(within(notice).getByText('你正在使用最新版本。')).toBeInTheDocument();
  });

  test('manual check shows failure feedback when release lookup fails', async () => {
    const callbacks = new Map<string, (payload: UpdateAvailablePayload & { error?: string }) => void>();

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          callbacks.set(eventName, callback);
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    callbacks.get(APP_EVENTS.updateCheckFinished)?.({
      available: false,
      version: '',
      releaseUrl: '',
      downloadUrl: '',
      error: 'Unable to check for updates',
    });

    const notice = await screen.findByRole('status');
    expect(within(notice).getByText(/unable to check for updates/i)).toBeInTheDocument();
  });

  test('manual check shows an ignored version when update is explicitly requested', async () => {
    window.localStorage.setItem('linkit.update.dismissedVersion', '0.4.0');
    const callbacks = new Map<string, (payload: UpdateAvailablePayload) => void>();

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          callbacks.set(eventName, callback);
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    callbacks.get(APP_EVENTS.updateCheckFinished)?.({
      available: true,
      version: '0.4.0',
      releaseUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
      downloadUrl: 'https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.dmg',
    });

    const notice = await screen.findByRole('status');
    expect(within(notice).getByText(/new version 0\.4\.0 is available/i)).toBeInTheDocument();
  });
});
