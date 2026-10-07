import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { APP_EVENTS } from '../../config/events';
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
    let subscribedEvent = '';

    render(
      <UpdateNotifier
        subscribe={(eventName, callback) => {
          subscribedEvent = eventName;
          callback(payload);
          return () => undefined;
        }}
        openUrl={vi.fn()}
      />
    );

    expect(subscribedEvent).toBe(APP_EVENTS.updateAvailable);
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
        subscribe={(_, callback) => {
          callback({
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
        subscribe={(_, callback) => {
          callback({
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

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
