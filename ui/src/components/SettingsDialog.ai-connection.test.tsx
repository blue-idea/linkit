import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { AppSettings, LibraryData } from '../types';
import { SettingsDialog } from './SettingsDialog';

type WindowWithGo = Window & { go?: Record<string, unknown> };

const library: LibraryData = {
  bookmarks: [],
  categories: [],
  collections: [],
  tags: [],
};

function createSettings(ai: AppSettings['ai']): AppSettings {
  return {
    storageMode: 'local',
    theme: 'midnight',
    locale: 'en',
    ai,
    aiConsent: null,
    uiSize: 'medium',
  };
}

function installGo(options: {
  configured?: boolean;
  setAIKey?: (request: { value: string }) => Promise<void>;
  testConnection?: () => Promise<unknown>;
}) {
  (window as WindowWithGo).go = {
    secretstore: {
      Service: {
        GetAIKeyStatus: async () => ({ configured: options.configured ?? true }),
        SetAIKey: options.setAIKey,
      },
    },
    ai: {
      Service: {
        TestConnection: options.testConnection ?? (async () => ({
          status: 'ok',
          latencyMs: 42,
          testedAt: '2026-07-27T09:00:00.000Z',
        })),
      },
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  delete (window as WindowWithGo).go;
});

describe('SettingsDialog AI 接口测试', () => {
  test('REQ-033-AC-002 配置缺失时禁用测试并显示提示', async () => {
    const invoke = vi.fn(async () => ({
      status: 'ok', latencyMs: 1, testedAt: '2026-07-27T09:00:00.000Z',
    }));
    installGo({ configured: false, testConnection: invoke });
    render(
      <SettingsDialog
        open
        settings={createSettings({ apiBase: '', model: '' })}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    await userEvent.setup().click(screen.getByRole('tab', { name: 'AI' }));
    const button = screen.getByRole('button', { name: 'Test connection' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Complete API Base, Model, and API Key before testing.')).toBeVisible();
    expect(invoke).not.toHaveBeenCalled();
  });

  test('REQ-033-AC-001 成功时显示耗时和测试时间', async () => {
    installGo({ configured: true });
    render(
      <SettingsDialog
        open
        settings={createSettings({ apiBase: 'https://api.example.test/v1', model: 'test-model' })}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'AI' }));
    const button = screen.getByRole('button', { name: 'Test connection' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText('Connected in 42 ms')).toBeVisible();
    expect(screen.getByText('Tested at 2026-07-27T09:00:00.000Z')).toBeVisible();
  });

  test('REQ-033-AC-003 未授权时显示错误且不保存设置或资料库', async () => {
    installGo({
      configured: true,
      testConnection: async () => {
        throw { code: 'AI_UNAUTHORIZED', message: 'AI service rejected the API key' };
      },
    });
    const onSave = vi.fn();
    const onImport = vi.fn();
    render(
      <SettingsDialog
        open
        settings={createSettings({ apiBase: 'https://api.example.test/v1', model: 'test-model' })}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={onSave}
        onImport={onImport}
        onSignOut={() => undefined}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'AI' }));
    const button = screen.getByRole('button', { name: 'Test connection' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent('Connection failed: the API key was rejected.');
    expect(onSave).not.toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });

  test('REQ-033-AC-001 配置变化后清除旧连接结果', async () => {
    installGo({ configured: true });
    render(
      <SettingsDialog
        open
        settings={createSettings({ apiBase: 'https://api.example.test/v1', model: 'test-model' })}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'AI' }));
    const button = screen.getByRole('button', { name: 'Test connection' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(await screen.findByText('Connected in 42 ms')).toBeVisible();

    await user.type(screen.getByPlaceholderText('gpt-4o-mini'), '-next');
    expect(screen.queryByText('Connected in 42 ms')).not.toBeInTheDocument();
  });

  test('REQ-033-AC-001 测试进行中修改配置后忽略旧请求结果', async () => {
    const pending = createDeferred<unknown>();
    installGo({ configured: true, testConnection: () => pending.promise });
    render(
      <SettingsDialog
        open
        settings={createSettings({ apiBase: 'https://api.example.test/v1', model: 'test-model' })}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'AI' }));
    const button = screen.getByRole('button', { name: 'Test connection' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await user.type(screen.getByPlaceholderText('gpt-4o-mini'), '-next');
    pending.resolve({
      status: 'ok',
      latencyMs: 42,
      testedAt: '2026-07-27T09:00:00.000Z',
    });

    await waitFor(() => expect(button).toHaveTextContent('Test connection'));
    expect(screen.queryByText('Connected in 42 ms')).not.toBeInTheDocument();
  });

  test('REQ-033-AC-001 保存旧 Key 期间输入新 Key 时保留新草稿并取消旧测试', async () => {
    const pendingSave = createDeferred<void>();
    const setAIKey = vi.fn(() => pendingSave.promise);
    const testConnection = vi.fn(async () => ({
      status: 'ok',
      latencyMs: 42,
      testedAt: '2026-07-27T09:00:00.000Z',
    }));
    installGo({ configured: false, setAIKey, testConnection });
    render(
      <SettingsDialog
        open
        settings={createSettings({ apiBase: 'https://api.example.test/v1', model: 'test-model' })}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'AI' }));
    const keyInput = screen.getByLabelText('API Key');
    await user.type(keyInput, 'sk-old-draft');
    await user.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(setAIKey).toHaveBeenCalledWith({ value: 'sk-old-draft' }));
    await user.clear(keyInput);
    await user.type(keyInput, 'sk-new-draft');
    pendingSave.resolve();

    await waitFor(() => expect(keyInput).toHaveValue('sk-new-draft'));
    expect(testConnection).not.toHaveBeenCalled();
  });
});
