import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LINKIT_APP_VERSION } from '../../config/backup';
import { AboutDialog } from './AboutDialog';

const openExternalUrl = vi.fn();

vi.mock('../bookmarks/external-url', () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
}));

describe('AboutDialog', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    openExternalUrl.mockReset();
  });

  test('展示版本与 GitHub 主页', () => {
    render(
      <AboutDialog
        open
        onClose={() => undefined}
        appVersion="0.2.9"
        githubUrl="https://github.com/blue-idea/linkit"
      />
    );

    const dialog = screen.getByRole('dialog', { name: /about/i });
    expect(within(dialog).getByText(/version\s*0\.2\.9/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /github\.com\/blue-idea\/linkit/i })).toBeInTheDocument();
  });

  test('缺省 appVersion 时自动渲染 LINKIT_APP_VERSION', () => {
    render(
      <AboutDialog
        open
        onClose={() => undefined}
      />
    );

    const dialog = screen.getByRole('dialog', { name: /about/i });
    expect(within(dialog).getByText(new RegExp(`version\\s*${LINKIT_APP_VERSION}`, 'i'))).toBeInTheDocument();
  });

  test('缺省 appVersion 且存在后端 Wails 运行时时动态拉取最新版本', async () => {
    const originalGo = (window as unknown as { go?: unknown }).go;
    (window as unknown as { go: unknown }).go = {
      platform: {
        Service: {
          GetAppVersion: vi.fn().mockResolvedValue('0.4.0'),
        },
      },
    };

    render(
      <AboutDialog
        open
        onClose={() => undefined}
      />
    );

    const dialog = screen.getByRole('dialog', { name: /about/i });
    expect(await within(dialog).findByText(/version\s*0\.4\.0/i)).toBeInTheDocument();

    (window as unknown as { go: unknown }).go = originalGo;
  });

  test('点击 GitHub 链接时通过外部打开', async () => {
    const user = userEvent.setup();
    render(
      <AboutDialog
        open
        onClose={() => undefined}
        githubUrl="https://github.com/blue-idea/linkit"
      />
    );

    const dialog = screen.getByRole('dialog', { name: /about/i });
    await user.click(within(dialog).getByRole('link', { name: /github\.com\/blue-idea\/linkit/i }));
    expect(openExternalUrl).toHaveBeenCalledWith('https://github.com/blue-idea/linkit');
  });

  test('点击检查更新后打开可用版本下载链接', async () => {
    const user = userEvent.setup();
    const checkForUpdates = vi.fn().mockResolvedValue({
      available: true,
      version: '0.4.0',
      releaseUrl: 'https://github.com/blue-idea/linkit/releases/tag/v0.4.0',
      downloadUrl: 'https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.dmg',
    });

    render(
      <AboutDialog
        open
        onClose={() => undefined}
        checkForUpdates={checkForUpdates}
      />
    );

    await user.click(screen.getByRole('button', { name: /check for updates/i }));

    expect(checkForUpdates).toHaveBeenCalledOnce();
    expect(openExternalUrl).toHaveBeenCalledWith('https://github.com/blue-idea/linkit/releases/download/v0.4.0/Linkit.dmg');
  });

  test('点击检查更新且无新版本时显示已是最新', async () => {
    const user = userEvent.setup();

    render(
      <AboutDialog
        open
        onClose={() => undefined}
        checkForUpdates={vi.fn().mockResolvedValue({ available: false })}
      />
    );

    await user.click(screen.getByRole('button', { name: /check for updates/i }));

    expect(await screen.findByText(/linkit is up to date/i)).toBeInTheDocument();
  });
});
