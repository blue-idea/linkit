import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SettingsDialog } from './SettingsDialog';
import type { AppSettings, LibraryData } from '../types';

const settings: AppSettings = {
  storageMode: 'local',
  theme: 'midnight',
  locale: 'en',
  ai: { apiBase: '', model: '' },
  aiConsent: null,
  uiSize: 'medium',
};

const library: LibraryData = {
  bookmarks: [],
  categories: [],
  collections: [],
  tags: [],
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('SettingsDialog 保存设置', () => {
  // REQ-023-AC-001：保存失败时必须保持对话框并显示可见错误，不能表现为无响应。
  test('onSave 失败时显示错误并恢复保存按钮', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={onClose}
        onSave={vi.fn(async () => {
          throw new Error('desktop save failed');
        })}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save settings' });
    await user.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save settings.');
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(saveButton).toBeEnabled());
  });

  // REQ-023-AC-001：保存进行中禁用按钮，避免重复提交。
  test('onSave 进行中禁用保存按钮', async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const saving = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => saving}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save settings' });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
    resolveSave?.();
    await waitFor(() => expect(saveButton).toBeEnabled());
  });
});
