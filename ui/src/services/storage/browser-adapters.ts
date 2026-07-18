import { getDefaultAppSettings, parseSettingsJson } from '../settings';
import type { AppSettings } from '../../domain/library';
import { validateLibraryEnvelope } from '../../domain/library';
import type { RepositoryLoadResult } from '../../repositories';
import type { SettingsLoadResult } from './bootstrap';

const SETTINGS_KEY = 'linkit.settings.v1';
const LIBRARY_KEY = 'linkit.library.v1';
/** 兼容 TASK-010 之前原型 localStorage 键，用于重启恢复旅程。 */
const LEGACY_LIBRARY_KEY = 'lattice.library';
const LEGACY_SETTINGS_KEY = 'lattice.settings';

export interface BrowserStorageAdapters {
  loadSettings: () => Promise<SettingsLoadResult>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  loadLibrary: () => Promise<RepositoryLoadResult>;
  saveLibraryData: (data: unknown) => Promise<void>;
  hasLocalLibraryData: () => boolean;
}

/**
 * Vite/浏览器环境下的本机适配器（无 Wails 时供 CI E2E 使用）。
 * 桌面正式路径由 LocalRepository + settingsstore 绑定承担。
 */
export function createBrowserStorageAdapters(storage: Storage = localStorage): BrowserStorageAdapters {
  return {
    async loadSettings() {
      const raw = storage.getItem(SETTINGS_KEY) ?? storage.getItem(LEGACY_SETTINGS_KEY);
      if (!raw) {
        return { state: 'default', settings: getDefaultAppSettings() };
      }
      const parsed = parseSettingsJson(raw);
      if (!parsed.success) {
        return { state: 'default', settings: getDefaultAppSettings() };
      }
      return { state: 'found', settings: parsed.data };
    },

    async saveSettings(settings) {
      storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },

    async loadLibrary() {
      const raw = storage.getItem(LIBRARY_KEY) ?? storage.getItem(LEGACY_LIBRARY_KEY);
      if (!raw) {
        return { state: 'empty' };
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        // 新格式：完整 LibraryEnvelope
        const envelopeResult = validateLibraryEnvelope(parsed);
        if (envelopeResult.success) {
          return {
            state: 'found',
            snapshot: { source: 'local', envelope: envelopeResult.data },
          };
        }
        // 旧格式：原型 LibraryData 与领域 Schema 不完全一致，仅用于信号“有本机数据”。
        // 实际书签仍由 App 通过 loadLocalLibrary 读取。
        if (isLegacyLibraryData(parsed)) {
          return {
            state: 'found',
            snapshot: {
              source: 'local',
              envelope: {
                format: 'linkit-library',
                schemaVersion: 1,
                revision: 0,
                updatedAt: new Date().toISOString(),
                data: { bookmarks: [], categories: [], collections: [], tags: [] },
              },
            },
          };
        }
      } catch {
        // 损坏文件在浏览器适配器中回退 empty；桌面 Go 层会提供 recovery_available。
      }
      return { state: 'empty' };
    },

    async saveLibraryData(data) {
      storage.setItem(LEGACY_LIBRARY_KEY, JSON.stringify(data));
    },

    hasLocalLibraryData() {
      return Boolean(storage.getItem(LIBRARY_KEY) ?? storage.getItem(LEGACY_LIBRARY_KEY));
    },
  };
}

function isLegacyLibraryData(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.bookmarks);
}
