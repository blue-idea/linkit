import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPreferredStorageAdapters, isDesktopGoStorageAvailable } from './desktop-adapters';
import { createLibraryEnvelope } from '../../testing/factories';
import { toUiLibraryFromEnvelope } from '../../features/import-export';

type BackupPersistenceModule = {
  createBackupPersistenceAdapters?: (storage?: Storage, now?: () => string) => {
    persistLibrary: (library: ReturnType<typeof toUiLibraryFromEnvelope>) => Promise<void>;
    persistSettings: (settings: {
      storageMode: 'local';
      theme: 'midnight';
      locale: 'en';
      ai: { apiBase: string; model: string };
      view: { defaultMode: 'card' };
      shortcuts: Record<string, string>;
      uiSize: 'medium';
    }) => Promise<void>;
  };
};

async function loadBackupPersistenceModule(): Promise<BackupPersistenceModule> {
  return import('./desktop-adapters') as Promise<BackupPersistenceModule>;
}

describe('桌面优先存储适配器', () => {
  beforeEach(() => {
    delete (window as unknown as { go?: unknown }).go;
    localStorage.clear();
  });

  test('无 Wails 绑定时回退浏览器适配器', async () => {
    expect(isDesktopGoStorageAvailable()).toBe(false);
    const adapters = createPreferredStorageAdapters();
    const settings = await adapters.loadSettings();
    expect(settings.state).toBe('default');
  });

  // REQ-029-AC-005：存在 Go 绑定时从有效数据根读取。
  test('有 Go 绑定时从 localstore 加载资料库', async () => {
    const envelope = createLibraryEnvelope();
    const readLibrary = vi.fn(async () => ({
      state: 'found',
      documentJson: JSON.stringify(envelope),
    }));
    const replaceLibrary = vi.fn(async () => ({ revision: 1, updatedAt: envelope.updatedAt }));
    const readSettings = vi.fn(async () => ({
      state: 'found',
      settingsJson: JSON.stringify({
        settingsVersion: 1,
        storageMode: 'local',
        theme: 'ocean',
        locale: 'en',
        ai: { apiBase: '', model: '' },
        aiConsent: null,
        view: { defaultMode: 'card' },
        lastCloudRevision: null,
      }),
    }));
    const writeSettings = vi.fn(async () => undefined);

    (window as unknown as { go: unknown }).go = {
      localstore: { Service: { ReadLibrary: readLibrary, ReplaceLibrary: replaceLibrary } },
      settingsstore: { Service: { ReadSettings: readSettings, WriteSettings: writeSettings } },
    };

    expect(isDesktopGoStorageAvailable()).toBe(true);
    const adapters = createPreferredStorageAdapters();
    const loaded = await adapters.loadLibrary();
    expect(loaded.state).toBe('found');
    if (loaded.state === 'found') {
      expect(loaded.snapshot.envelope.revision).toBe(envelope.revision);
    }
    const settings = await adapters.loadSettings();
    expect(settings.settings.theme).toBe('ocean');
  });

  test('REQ-034-AC-003 严格桌面适配器分别写入资料库与可移植设置', async () => {
    const module = await loadBackupPersistenceModule();
    expect(module.createBackupPersistenceAdapters).toBeTypeOf('function');
    if (!module.createBackupPersistenceAdapters) return;
    const replaceLibrary = vi.fn(async () => ({ revision: 1, updatedAt: '2026-07-27T08:00:00.000Z' }));
    const writeSettings = vi.fn(async () => undefined);
    (window as unknown as { go: unknown }).go = {
      localstore: { Service: { ReadLibrary: vi.fn(), ReplaceLibrary: replaceLibrary } },
      settingsstore: { Service: { ReadSettings: vi.fn(), WriteSettings: writeSettings } },
    };
    const adapters = module.createBackupPersistenceAdapters(
      localStorage,
      () => '2026-07-27T08:00:00.000Z',
    );

    await adapters.persistLibrary(toUiLibraryFromEnvelope(createLibraryEnvelope()));
    await adapters.persistSettings({
      storageMode: 'local',
      theme: 'midnight',
      locale: 'en',
      ai: { apiBase: '', model: '' },
      view: { defaultMode: 'card' },
      shortcuts: {},
      uiSize: 'medium',
    });

    expect(replaceLibrary).toHaveBeenCalledWith(expect.objectContaining({
      confirmed: true,
      documentJson: expect.stringContaining('"format":"linkit-library"'),
    }));
    expect(writeSettings).toHaveBeenCalledWith(expect.objectContaining({
      settingsJson: expect.stringContaining('"lastCloudRevision":null'),
    }));
  });

  test('REQ-034-AC-005 严格桌面适配器不吞掉原生写入失败', async () => {
    const module = await loadBackupPersistenceModule();
    expect(module.createBackupPersistenceAdapters).toBeTypeOf('function');
    if (!module.createBackupPersistenceAdapters) return;
    const failure = new Error('disk full');
    (window as unknown as { go: unknown }).go = {
      localstore: {
        Service: {
          ReadLibrary: vi.fn(),
          ReplaceLibrary: vi.fn(async () => { throw failure; }),
        },
      },
      settingsstore: {
        Service: { ReadSettings: vi.fn(), WriteSettings: vi.fn(async () => undefined) },
      },
    };
    const adapters = module.createBackupPersistenceAdapters();

    await expect(
      adapters.persistLibrary(toUiLibraryFromEnvelope(createLibraryEnvelope())),
    ).rejects.toBe(failure);
  });

  // REQ-010-AC-005 / REQ-035-AC-003：浏览器回退存储必须同步 canonical 与旧兼容键，
  // 避免分类递归删除后启动恢复旧快照，导致同一 URL 被错误判为重复。
  test('递归删除后本地资料库保存会同步 canonical 与 legacy 存储键', async () => {
    const module = await loadBackupPersistenceModule();
    expect(module.createBackupPersistenceAdapters).toBeTypeOf('function');
    if (!module.createBackupPersistenceAdapters) return;

    delete (window as unknown as { go?: unknown }).go;
    const library = toUiLibraryFromEnvelope(createLibraryEnvelope());
    const adapters = module.createBackupPersistenceAdapters(
      localStorage,
      () => '2026-08-09T00:00:00.000Z',
    );

    await adapters.persistLibrary(library);

    expect(localStorage.getItem('linkit.library.v1')).toContain('linkit-library');
    const legacy = localStorage.getItem('lattice.library');
    expect(legacy).not.toBeNull();
    expect(legacy).toContain(library.bookmarks[0].url);
  });
});
