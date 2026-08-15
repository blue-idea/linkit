import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SettingsDialog } from './SettingsDialog';
import type { AppSettings, LibraryData } from '../types';
import { createLibraryEnvelope } from '../testing/factories';

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

describe('SettingsDialog 完整备份导入', () => {
  test('REQ-034-AC-005 导入进行中禁用重复确认并保持对话框', async () => {
    const user = userEvent.setup();
    let resolveImport: (() => void) | undefined;
    const importing = new Promise<void>((resolve) => {
      resolveImport = resolve;
    });
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => importing}
        onSignOut={() => undefined}
      />,
    );
    const envelope = createLibraryEnvelope();
    const backup = {
      ...envelope,
      format: 'linkit-backup',
      exportedAt: envelope.updatedAt,
      appVersion: '0.2.9',
      settings: {
        settingsVersion: 1,
        storageMode: 'local',
        theme: 'ocean',
        locale: 'en',
        ai: { apiBase: '', model: '' },
        view: { defaultMode: 'card' },
        shortcuts: {
          spotlight: 'CmdOrCtrl+K',
          newBookmark: 'CmdOrCtrl+N',
          insights: 'CmdOrCtrl+I',
          settings: 'CmdOrCtrl+,',
          viewCard: 'CmdOrCtrl+1',
          viewList: 'CmdOrCtrl+2',
          viewMasonry: 'CmdOrCtrl+3',
          toggleLeftSidebar: 'CmdOrCtrl+/',
          toggleRightSidebar: 'CmdOrCtrl+\\',
          toggleWindow: 'CmdOrCtrl+L',
        },
        uiSize: 'medium',
      },
    };
    const input = screen.getByTestId('import-file-input') as HTMLInputElement;
    await user.upload(input, new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }));
    const confirm = await screen.findByRole('button', { name: 'Overwrite and import' });

    await user.click(confirm);

    expect(confirm).toBeDisabled();
    expect(screen.getByRole('dialog', { name: 'Overwrite current library?' })).toBeInTheDocument();
    resolveImport?.();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Overwrite current library?' })).not.toBeInTheDocument());
  });
});

describe('SettingsDialog 数据目录切换', () => {
  test('REQ-029-AC-003 选择保留目标数据后通知上层重新载入数据根', async () => {
    const user = userEvent.setup();
    localStorage.setItem('linkit.data-root.occupied:D:\\Occupied', '1');
    (window as unknown as { __linkitSelectDirectory: () => string }).__linkitSelectDirectory = () => 'D:\\Occupied';
    const onDataRootChanged = vi.fn();

    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
        onDataRootChanged={onDataRootChanged}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Storage' }));
    await user.click(screen.getByRole('button', { name: 'Change folder' }));
    await user.click(await screen.findByRole('button', { name: 'Keep target data' }));

    await waitFor(() => {
      expect(onDataRootChanged).toHaveBeenCalledWith(expect.objectContaining({
        dataRoot: 'D:\\Occupied',
        conflictStrategy: 'keep',
      }));
    });
  });
});
