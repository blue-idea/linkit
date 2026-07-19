/** Wails 桌面优先的本机存储适配器；无 Go 绑定时回退浏览器。 */

import { getDefaultAppSettings, parseSettingsJson } from '../settings';
import type { AppSettings as DomainSettings } from '../../domain/library';
import { validateLibraryEnvelope } from '../../domain/library';
import type { RepositoryLoadResult } from '../../repositories';
import type { SettingsLoadResult } from './bootstrap';
import { createBrowserStorageAdapters, type BrowserStorageAdapters } from './browser-adapters';
import { buildExportEnvelopeFromUi } from '../../features/import-export';
import type { LibraryData as UiLibrary } from '../../types';

type WailsLocalstore = {
  ReadLibrary: () => Promise<{
    state: string;
    documentJson?: string;
    recoveryJson?: string;
  }>;
  ReplaceLibrary: (request: { documentJson: string; confirmed: boolean }) => Promise<unknown>;
  WriteLibrary?: (request: { documentJson: string; expectedRevision: number }) => Promise<unknown>;
};

type WailsSettingsstore = {
  ReadSettings: () => Promise<{ state: string; settingsJson: string }>;
  WriteSettings: (request: { settingsJson: string }) => Promise<void>;
};

function readGo(): {
  localstore: WailsLocalstore | null;
  settingsstore: WailsSettingsstore | null;
} {
  const go = (window as unknown as {
    go?: {
      localstore?: { Service?: WailsLocalstore };
      settingsstore?: { Service?: WailsSettingsstore };
    };
  }).go;
  return {
    localstore: go?.localstore?.Service ?? null,
    settingsstore: go?.settingsstore?.Service ?? null,
  };
}

export function isDesktopGoStorageAvailable(): boolean {
  const { localstore, settingsstore } = readGo();
  return Boolean(localstore?.ReadLibrary && settingsstore?.ReadSettings);
}

/**
 * 桌面有 Wails 绑定时读写有效数据根；否则回退 localStorage 适配器。
 * 覆盖 REQ-002-AC-002 / REQ-029-AC-005。
 */
export function createPreferredStorageAdapters(
  storage: Storage = localStorage
): BrowserStorageAdapters {
  const browser = createBrowserStorageAdapters(storage);
  if (!isDesktopGoStorageAvailable()) {
    return browser;
  }

  const { localstore, settingsstore } = readGo();
  if (!localstore || !settingsstore) {
    return browser;
  }

  return {
    async loadSettings(): Promise<SettingsLoadResult> {
      try {
        const result = await settingsstore.ReadSettings();
        const parsed = parseSettingsJson(result.settingsJson);
        if (!parsed.success) {
          return { state: 'default', settings: getDefaultAppSettings() };
        }
        return {
          state: result.state === 'found' ? 'found' : 'default',
          settings: parsed.data,
        };
      } catch {
        return browser.loadSettings();
      }
    },

    async saveSettings(settings: DomainSettings) {
      try {
        await settingsstore.WriteSettings({ settingsJson: JSON.stringify(settings) });
      } catch {
        await browser.saveSettings(settings);
      }
    },

    async loadLibrary(): Promise<RepositoryLoadResult> {
      try {
        const result = await localstore.ReadLibrary();
        if (result.state === 'empty') {
          // 桌面空文件时回退浏览器旧数据，便于一次性迁移未落盘的 localStorage。
          const browserLib = await browser.loadLibrary();
          if (browserLib.state === 'found') {
            return browserLib;
          }
          return { state: 'empty' };
        }
        if (result.state === 'found' && result.documentJson) {
          const parsed: unknown = JSON.parse(result.documentJson);
          const envelope = validateLibraryEnvelope(parsed);
          if (envelope.success) {
            return {
              state: 'found',
              snapshot: { source: 'local', envelope: envelope.data },
            };
          }
        }
        if (result.state === 'recovery_available' && result.recoveryJson) {
          const parsed: unknown = JSON.parse(result.recoveryJson);
          const envelope = validateLibraryEnvelope(parsed);
          if (envelope.success) {
            return {
              state: 'recovery_available',
              recovery: { source: 'local', envelope: envelope.data },
            };
          }
        }
        return { state: 'empty' };
      } catch {
        return browser.loadLibrary();
      }
    },

    async saveLibraryData(data: unknown) {
      const uiLibrary = data as UiLibrary;
      const exportDoc = buildExportEnvelopeFromUi(uiLibrary, { now: new Date().toISOString() });
      const document = {
        format: exportDoc.format,
        schemaVersion: exportDoc.schemaVersion,
        revision: exportDoc.revision,
        updatedAt: exportDoc.updatedAt,
        data: exportDoc.data,
      };
      try {
        await localstore.ReplaceLibrary({
          documentJson: JSON.stringify(document),
          confirmed: true,
        });
        // 同步一份到浏览器，降低桌面/E2E 混用时的可见性抖动。
        await browser.saveLibraryData(uiLibrary);
      } catch {
        await browser.saveLibraryData(uiLibrary);
      }
    },

    hasLocalLibraryData() {
      return browser.hasLocalLibraryData();
    },
  };
}
