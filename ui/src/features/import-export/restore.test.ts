import { describe, expect, test, vi } from 'vitest';
import { createLibraryEnvelope } from '../../testing/factories';
import type { AppSettings, LibraryData } from '../../types';
import { toUiLibraryFromEnvelope } from './apply';

type RestoreSnapshot = {
  library: LibraryData;
  settings: AppSettings;
};

type RestoreModule = {
  resolveImportedSettings?: (
    current: AppSettings,
    portable: {
      settingsVersion: 1;
      storageMode: 'local';
      theme: 'ocean';
      locale: 'zh';
      ai: { apiBase: string; model: string };
      view: { defaultMode: 'masonry' };
      shortcuts: Record<string, string>;
      uiSize: 'large';
    } | null,
  ) => AppSettings;
  restoreBackupAtomically?: (input: {
    previous: RestoreSnapshot;
    next: RestoreSnapshot;
    persistLibrary: (library: LibraryData) => Promise<void>;
    persistSettings: (settings: AppSettings) => Promise<void>;
    apply: (snapshot: RestoreSnapshot) => void;
  }) => Promise<void>;
};

async function loadRestoreModule(): Promise<RestoreModule> {
  return import('./index') as Promise<RestoreModule>;
}

function createSettings(theme: AppSettings['theme']): AppSettings {
  return {
    storageMode: 'local',
    theme,
    locale: 'en',
    ai: { apiBase: '', model: '' },
    aiConsent: null,
    view: { defaultMode: 'card' },
    shortcuts: {},
    uiSize: 'medium',
  };
}

function createSnapshots(): { previous: RestoreSnapshot; next: RestoreSnapshot } {
  return {
    previous: {
      library: toUiLibraryFromEnvelope(createLibraryEnvelope()),
      settings: createSettings('midnight'),
    },
    next: {
      library: toUiLibraryFromEnvelope(createLibraryEnvelope({ bookmarks: [] })),
      settings: createSettings('ocean'),
    },
  };
}

describe('完整备份原子恢复', () => {
  test('REQ-034-AC-003 完整备份设置投影清除本机授权状态', async () => {
    const module = await loadRestoreModule();
    expect(module.resolveImportedSettings).toBeTypeOf('function');
    if (!module.resolveImportedSettings) return;
    const current = {
      ...createSettings('midnight'),
      aiConsent: {
        apiBase: 'https://old.example.test/v1',
        grantedAt: '2026-07-27T08:00:00.000Z',
      },
    };

    const restored = module.resolveImportedSettings(current, {
      settingsVersion: 1,
      storageMode: 'local',
      theme: 'ocean',
      locale: 'zh',
      ai: { apiBase: 'https://new.example.test/v1', model: 'restored-model' },
      view: { defaultMode: 'masonry' },
      shortcuts: {},
      uiSize: 'large',
    });

    expect(restored).toMatchObject({
      storageMode: 'local',
      theme: 'ocean',
      locale: 'zh',
      ai: { apiBase: 'https://new.example.test/v1', model: 'restored-model' },
      aiConsent: null,
      view: { defaultMode: 'masonry' },
      uiSize: 'large',
    });
  });

  test('REQ-034-AC-004 旧资料库格式保持当前设置', async () => {
    const module = await loadRestoreModule();
    expect(module.resolveImportedSettings).toBeTypeOf('function');
    if (!module.resolveImportedSettings) return;
    const current = createSettings('midnight');

    expect(module.resolveImportedSettings(current, null)).toEqual(current);
  });

  test('REQ-034-AC-003 两份文档持久化成功后才应用 React 状态', async () => {
    const module = await loadRestoreModule();
    expect(module.restoreBackupAtomically).toBeTypeOf('function');
    if (!module.restoreBackupAtomically) return;
    const snapshots = createSnapshots();
    const order: string[] = [];

    await module.restoreBackupAtomically({
      ...snapshots,
      persistLibrary: vi.fn(async () => { order.push('persist-library'); }),
      persistSettings: vi.fn(async () => { order.push('persist-settings'); }),
      apply: vi.fn(() => { order.push('apply'); }),
    });

    expect(order).toEqual(['persist-library', 'persist-settings', 'apply']);
  });

  test('REQ-034-AC-005 设置写入失败时回滚资料库且不应用新状态', async () => {
    const module = await loadRestoreModule();
    expect(module.restoreBackupAtomically).toBeTypeOf('function');
    if (!module.restoreBackupAtomically) return;
    const snapshots = createSnapshots();
    const failure = new Error('settings write failed');
    const order: string[] = [];
    const apply = vi.fn();

    await expect(module.restoreBackupAtomically({
      ...snapshots,
      persistLibrary: vi.fn(async (library) => {
        order.push(library === snapshots.next.library ? 'persist-library-next' : 'persist-library-previous');
      }),
      persistSettings: vi.fn(async () => {
        order.push('persist-settings-next');
        throw failure;
      }),
      apply,
    })).rejects.toMatchObject({ message: 'Backup restore failed', cause: failure });

    expect(order).toEqual([
      'persist-library-next',
      'persist-settings-next',
      'persist-library-previous',
    ]);
    expect(apply).not.toHaveBeenCalled();
  });

  test('REQ-034-AC-005 React 应用失败时逆序回滚状态、设置与资料库', async () => {
    const module = await loadRestoreModule();
    expect(module.restoreBackupAtomically).toBeTypeOf('function');
    if (!module.restoreBackupAtomically) return;
    const snapshots = createSnapshots();
    const failure = new Error('apply failed');
    const order: string[] = [];

    await expect(module.restoreBackupAtomically({
      ...snapshots,
      persistLibrary: vi.fn(async (library) => {
        order.push(library === snapshots.next.library ? 'persist-library-next' : 'persist-library-previous');
      }),
      persistSettings: vi.fn(async (settings) => {
        order.push(settings === snapshots.next.settings ? 'persist-settings-next' : 'persist-settings-previous');
      }),
      apply: vi.fn((snapshot) => {
        order.push(snapshot === snapshots.next ? 'apply-next' : 'apply-previous');
        if (snapshot === snapshots.next) throw failure;
      }),
    })).rejects.toMatchObject({ message: 'Backup restore failed', cause: failure });

    expect(order).toEqual([
      'persist-library-next',
      'persist-settings-next',
      'apply-next',
      'apply-previous',
      'persist-settings-previous',
      'persist-library-previous',
    ]);
  });

  test('REQ-034-AC-005 补偿失败时保留原始错误并附带回滚错误', async () => {
    const module = await loadRestoreModule();
    expect(module.restoreBackupAtomically).toBeTypeOf('function');
    if (!module.restoreBackupAtomically) return;
    const snapshots = createSnapshots();
    const failure = new Error('settings write failed');
    const rollbackFailure = new Error('library rollback failed');

    const promise = module.restoreBackupAtomically({
      ...snapshots,
      persistLibrary: vi.fn(async (library) => {
        if (library === snapshots.previous.library) throw rollbackFailure;
      }),
      persistSettings: vi.fn(async () => { throw failure; }),
      apply: vi.fn(),
    });

    await expect(promise).rejects.toMatchObject({
      message: 'Backup restore failed',
      cause: failure,
      rollbackErrors: [rollbackFailure],
    });
  });
});
