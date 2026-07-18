import type { AppSettings, Bookmark, LibraryData, TagColor } from './types';
import { defaultSettings } from './themes';

const DATA_KEY = 'lattice.library';
const SETTINGS_KEY = 'lattice.settings';
const TAG_COLORS: TagColor[] = ['blue', 'green', 'amber', 'coral', 'violet', 'gray'];

/**
 * 将本机 JSON 中可能缺失的 UI 字段补齐，避免恢复后 Favicon 等组件崩溃。
 * REQ-002-AC-002
 */
export function normalizeLocalLibrary(lib: LibraryData): LibraryData {
  return {
    ...lib,
    bookmarks: (lib.bookmarks ?? []).map(normalizeLocalBookmark),
    categories: lib.categories ?? [],
    collections: lib.collections ?? [],
    tags: lib.tags ?? [],
  };
}

function normalizeLocalBookmark(raw: Bookmark): Bookmark {
  const domain = typeof raw.domain === 'string' && raw.domain.trim() ? raw.domain : 'unknown';
  const glyphFromDomain = domain.charAt(0).toUpperCase() || '?';
  const favicon =
    typeof raw.favicon === 'string' && raw.favicon.trim()
      ? raw.favicon
      : glyphFromDomain;
  const faviconColor = TAG_COLORS.includes(raw.faviconColor as TagColor)
    ? (raw.faviconColor as TagColor)
    : 'blue';

  return {
    ...raw,
    domain,
    favicon,
    faviconColor,
    description: raw.description ?? '',
    notes: raw.notes ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    collectionIds: Array.isArray(raw.collectionIds) ? raw.collectionIds : [],
    visitCount: typeof raw.visitCount === 'number' ? raw.visitCount : 0,
    starred: Boolean(raw.starred),
    pinned: Boolean(raw.pinned),
    readStatus:
      raw.readStatus === 'unread' ||
      raw.readStatus === 'reading' ||
      raw.readStatus === 'read' ||
      raw.readStatus === 'archived'
        ? raw.readStatus
        : 'unread',
  };
}

export function loadLocalLibrary(): LibraryData | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    return normalizeLocalLibrary(JSON.parse(raw) as LibraryData);
  } catch {
    return null;
  }
}

export function saveLocalLibrary(lib: LibraryData) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(lib));
  } catch (e) {
    console.error('saveLocalLibrary failed', e);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) } as AppSettings;
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (e) {
    console.error('saveSettings failed', e);
  }
}

export function exportLibrary(payload: unknown, filename = 'linkit-export.json') {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 读取导入文件原文；解析与确认由 import-export 模块负责。 */
export function importLibrary(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read import file'));
    reader.readAsText(file);
  });
}
