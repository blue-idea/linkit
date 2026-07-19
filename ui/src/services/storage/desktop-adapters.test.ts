import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPreferredStorageAdapters, isDesktopGoStorageAvailable } from './desktop-adapters';
import { createLibraryEnvelope } from '../../testing/factories';

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
});
