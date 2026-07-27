/** 浏览器回退存储键；新旧适配器统一从此处读取，避免键名漂移。 */
export const BROWSER_STORAGE_KEYS = {
  settings: 'linkit.settings.v1',
  library: 'linkit.library.v1',
  legacySettings: 'lattice.settings',
  legacyLibrary: 'lattice.library',
} as const;
