import { beforeEach, describe, expect, test, vi } from 'vitest';
import { persistUiSettings } from './use-local-startup';

describe('persistUiSettings', () => {
  beforeEach(() => {
    delete (window as unknown as { go?: unknown }).go;
    localStorage.clear();
  });

  // REQ-019-AC-005：保存设置时必须保留 aiConsent，否则 Go AI 校验永远失败。
  test('写入本机设置时保留 aiConsent', async () => {
    const writeSettings = vi.fn(async () => undefined);
    (window as unknown as { go: unknown }).go = {
      localstore: {
        Service: {
          ReadLibrary: async () => ({ state: 'empty' }),
          ReplaceLibrary: async () => ({ revision: 1, updatedAt: new Date().toISOString() }),
        },
      },
      settingsstore: {
        Service: {
          ReadSettings: async () => ({
            state: 'found',
            settingsJson: JSON.stringify({
              settingsVersion: 1,
              storageMode: 'local',
              theme: 'midnight',
              locale: 'en',
              ai: { apiBase: '', model: '' },
              aiConsent: null,
              view: { defaultMode: 'card' },
              lastCloudRevision: null,
            }),
          }),
          WriteSettings: writeSettings,
        },
      },
    };

    await persistUiSettings({
      storageMode: 'local',
      theme: 'ocean',
      locale: 'en',
      ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
      aiConsent: {
        apiBase: 'https://api.example.test/v1',
        grantedAt: '2026-07-19T00:00:00.000Z',
      },
    });

    expect(writeSettings).toHaveBeenCalledOnce();
    expect(writeSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        settingsJson: expect.stringContaining('"apiBase":"https://api.example.test/v1"'),
      })
    );
    const settingsJson = String(
      (writeSettings.mock.calls as unknown as Array<Array<{ settingsJson: string }>>)[0][0]
        .settingsJson
    );
    const payload = JSON.parse(settingsJson) as {
      aiConsent: { apiBase: string; grantedAt: string } | null;
      ai: { apiBase: string; model: string };
    };
    expect(payload.ai).toEqual({
      apiBase: 'https://api.example.test/v1',
      model: 'test-model',
    });
    expect(payload.aiConsent).toEqual({
      apiBase: 'https://api.example.test/v1',
      grantedAt: '2026-07-19T00:00:00.000Z',
    });
  });
});
