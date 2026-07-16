import type { AppSettings, LibraryData } from './types';
import { defaultSettings } from './themes';

const DATA_KEY = 'lattice.library';
const SETTINGS_KEY = 'lattice.settings';

export function loadLocalLibrary(): LibraryData | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LibraryData;
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

export function exportLibrary(lib: LibraryData, filename = 'lattice-export.json') {
  const blob = new Blob([JSON.stringify(lib, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importLibrary(file: File): Promise<LibraryData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lib = JSON.parse(reader.result as string) as LibraryData;
        if (!lib.bookmarks || !Array.isArray(lib.bookmarks)) throw new Error('格式无效');
        resolve(lib);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
