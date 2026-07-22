import { getDefaultAppSettings, parseSettingsJson } from '../settings';
import type { AppSettings } from '../../domain/library';
import { validateLibraryEnvelope } from '../../domain/library';
import { normalizeDomainFavicon, normalizeDomainFaviconColor } from '../../domain/bookmark-icon';
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
          const legacy = parsed as Record<string, unknown>;
          const legacyBookmarks = Array.isArray(legacy.bookmarks) ? legacy.bookmarks : [];
          const legacyCategories = Array.isArray(legacy.categories) ? legacy.categories : [];
          const legacyCollections = Array.isArray(legacy.collections) ? legacy.collections : [];
          const legacyTags = Array.isArray(legacy.tags) ? legacy.tags : [];

          const bookmarks = legacyBookmarks.map((item: unknown) => {
            const bm = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            return {
              id: String(bm.id || ''),
              title: String(bm.title || ''),
              url: String(bm.url || ''),
              domain: String(bm.domain || ''),
              favicon: normalizeDomainFavicon(bm.favicon),
              faviconColor: normalizeDomainFaviconColor(bm.faviconColor),
              description: String(bm.description || ''),
              notes: String(bm.notes || ''),
              tagIds: (Array.isArray(bm.tagIds) ? bm.tagIds : Array.isArray(bm.tags) ? bm.tags : []) as string[],
              categoryId: (bm.categoryId as string | null) || null,
              collectionIds: (Array.isArray(bm.collectionIds) ? bm.collectionIds : []) as string[],
              createdAt: String(bm.createdAt || new Date().toISOString()),
              updatedAt: String(bm.updatedAt || new Date().toISOString()),
              lastVisitedAt: (bm.lastVisitedAt as string | null) || (bm.lastVisited as string | null) || null,
              visitCount: typeof bm.visitCount === 'number' ? bm.visitCount : 0,
              starred: Boolean(bm.starred),
              pinned: Boolean(bm.pinned),
              readStatus: ['unread', 'reading', 'read', 'archived'].includes(bm.readStatus as string)
                ? (bm.readStatus as 'unread' | 'reading' | 'read' | 'archived')
                : 'unread',
              health: ['ok', 'changed', 'broken'].includes(bm.health as string)
                ? (bm.health as 'ok' | 'changed' | 'broken')
                : 'ok',
              healthCheckedAt: (bm.healthCheckedAt as string | null) || null,
              healthHttpStatus: typeof bm.healthHttpStatus === 'number' ? bm.healthHttpStatus : null,
              healthFingerprint: (bm.healthFingerprint as string | null) || null,
              healthErrorCode: (bm.healthErrorCode as string | null) || null,
              aiSummary: String(bm.aiSummary || ''),
              aiSuggestedTags: (Array.isArray(bm.aiSuggestedTags) ? bm.aiSuggestedTags : []) as string[],
              thumbnail: (bm.thumbnail as string | null) || null,
            };
          });

          return {
            state: 'found',
            snapshot: {
              source: 'local',
              envelope: {
                format: 'linkit-library',
                schemaVersion: 1,
                revision: 0,
                updatedAt: new Date().toISOString(),
                data: {
                  bookmarks,
                  categories: legacyCategories.map((item: unknown) => {
                    const cat = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
                    return {
                      id: String(cat.id || ''),
                      name: String(cat.name || ''),
                      icon: String(cat.icon || ''),
                      parentId: (cat.parentId as string | null) || null,
                      color: (cat.color as 'blue' | 'green' | 'amber' | 'coral' | 'violet' | 'gray' | null) || null,
                    };
                  }),
                  collections: legacyCollections.map((item: unknown) => {
                    const col = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
                    return {
                      id: String(col.id || ''),
                      name: String(col.name || ''),
                      emoji: String(col.emoji || ''),
                      color: (col.color as 'blue' | 'green' | 'amber' | 'coral' | 'violet' | 'gray') || 'blue',
                      description: String(col.description || ''),
                      bookmarkIds: (Array.isArray(col.bookmarkIds) ? col.bookmarkIds : []) as string[],
                      createdAt: String(col.createdAt || new Date().toISOString()),
                      updatedAt: String(col.updatedAt || new Date().toISOString()),
                    };
                  }),
                  tags: legacyTags.map((item: unknown) => {
                    const tag = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
                    return {
                      id: String(tag.id || ''),
                      label: String(tag.label || ''),
                      color: (tag.color as 'blue' | 'green' | 'amber' | 'coral' | 'violet' | 'gray') || 'blue',
                    };
                  }),
                },
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
