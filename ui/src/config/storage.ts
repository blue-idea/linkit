/** 浏览器回退存储键；新旧适配器统一从此处读取，避免键名漂移。 */
export const BROWSER_STORAGE_KEYS = {
  dataRoot: 'linkit.data-root.v1',
  settings: 'linkit.settings.v1',
  library: 'linkit.library.v1',
  legacySettings: 'lattice.settings',
  legacyLibrary: 'lattice.library',
} as const;

/** 浏览器 E2E 替身用 data root 作用域 key 模拟不同目录下的同名文件。 */
export function buildBrowserDataRootStorageKey(baseKey: string, dataRoot: string): string {
  return `${BROWSER_STORAGE_KEYS.dataRoot}:${dataRoot}:${baseKey}`;
}
