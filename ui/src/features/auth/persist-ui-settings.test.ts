import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_SHORTCUTS } from '../shell/shortcuts';
import { persistUiSettings, useLocalStartup } from './use-local-startup';

function configureDesktopSettings(settingsJson: string, writeSettings = vi.fn(async () => undefined)) {
  (window as unknown as { go: unknown }).go = {
    localstore: {
      Service: {
        ReadLibrary: async () => ({ state: 'empty' }),
        ReplaceLibrary: async () => ({ revision: 1, updatedAt: new Date().toISOString() }),
      },
    },
    settingsstore: {
      Service: {
        ReadSettings: async () => ({ state: 'found', settingsJson }),
        WriteSettings: writeSettings,
      },
    },
  };
  return writeSettings;
}

describe('persistUiSettings', () => {
  beforeEach(() => {
    delete (window as unknown as { go?: unknown }).go;
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  // REQ-019-AC-005：保存设置时必须保留 aiConsent，否则 Go AI 校验永远失败。
  test('写入本机设置时保留 aiConsent', async () => {
    const writeSettings = vi.fn(async () => undefined);
    configureDesktopSettings(JSON.stringify({
      settingsVersion: 1,
      storageMode: 'local',
      theme: 'midnight',
      locale: 'en',
      ai: { apiBase: '', model: '' },
      aiConsent: null,
      view: { defaultMode: 'card' },
      lastCloudRevision: null,
    }), writeSettings);

    await persistUiSettings({
      storageMode: 'local',
      theme: 'ocean',
      locale: 'en',
      ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
      aiConsent: {
        apiBase: 'https://api.example.test/v1',
        grantedAt: '2026-07-19T00:00:00.000Z',
      },
      uiSize: 'large',
      shortcuts: { ...DEFAULT_SHORTCUTS, toggleWindow: 'CmdOrCtrl+H' },
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
      uiSize: string;
      shortcuts: Record<string, string>;
    };
    expect(payload.ai).toEqual({
      apiBase: 'https://api.example.test/v1',
      model: 'test-model',
    });
    expect(payload.aiConsent).toEqual({
      apiBase: 'https://api.example.test/v1',
      grantedAt: '2026-07-19T00:00:00.000Z',
    });
    // REQ-031-AC-004 / REQ-030-AC-007：桌面设置文档必须保留 UI 档位与快捷键。
    expect(payload.uiSize).toBe('large');
    expect(payload.shortcuts.toggleWindow).toBe('CmdOrCtrl+H');
  });

  // REQ-031-AC-004：启动引导必须把桌面 settingsstore 中的 uiSize 恢复到 UI 设置。
  test('启动时保留桌面设置中的 uiSize 与快捷键', async () => {
    configureDesktopSettings(JSON.stringify({
      settingsVersion: 1,
      storageMode: 'local',
      theme: 'ocean',
      locale: 'en',
      ai: { apiBase: '', model: '' },
      aiConsent: null,
      view: { defaultMode: 'card' },
      lastCloudRevision: null,
      uiSize: 'xlarge',
      shortcuts: { ...DEFAULT_SHORTCUTS, toggleWindow: 'CmdOrCtrl+H' },
    }));

    const { result } = renderHook(() => useLocalStartup(false));

    await waitFor(() => expect(result.current.settings).not.toBeNull());
    expect(result.current.settings?.uiSize).toBe('xlarge');
    expect(result.current.settings?.shortcuts?.toggleWindow).toBe('CmdOrCtrl+H');
  });
});
