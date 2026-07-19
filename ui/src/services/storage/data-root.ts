/** 本地数据根绑定与浏览器 E2E 替身（REQ-029）。 */

export interface DataRootInfo {
  bootstrapRoot: string;
  dataRoot: string;
  isCustom: boolean;
}

export interface SelectDirectoryResult {
  state: 'selected' | 'cancelled';
  path?: string;
}

export interface MigrateDataRootRequest {
  targetPath: string;
  confirmed: boolean;
}

export interface MigrateDataRootResult {
  dataRoot: string;
  migratedFiles: string[];
}

export interface DataRootBindings {
  getDataRoot: () => Promise<DataRootInfo>;
  selectDataRootDirectory: () => Promise<SelectDirectoryResult>;
  migrateDataRoot: (request: MigrateDataRootRequest) => Promise<MigrateDataRootResult>;
}

const BROWSER_DATA_ROOT_KEY = 'linkit.data-root.v1';

type WailsLocalstore = {
  GetDataRoot?: () => Promise<DataRootInfo>;
  SelectDataRootDirectory?: () => Promise<SelectDirectoryResult>;
  MigrateDataRoot?: (request: MigrateDataRootRequest) => Promise<MigrateDataRootResult>;
};

function readWailsLocalstore(): WailsLocalstore | null {
  const go = (window as unknown as { go?: { localstore?: { Service?: WailsLocalstore } } }).go;
  return go?.localstore?.Service ?? null;
}

/** 桌面优先走 Wails；浏览器 CI 使用 localStorage 指针替身。 */
export function createDataRootBindings(storage: Storage = localStorage): DataRootBindings {
  return {
    async getDataRoot() {
      const wails = readWailsLocalstore();
      if (wails?.GetDataRoot) {
        return wails.GetDataRoot();
      }
      const custom = storage.getItem(BROWSER_DATA_ROOT_KEY);
      const bootstrap = 'browser://linkit';
      const dataRoot = custom ?? bootstrap;
      return {
        bootstrapRoot: bootstrap,
        dataRoot,
        isCustom: Boolean(custom),
      };
    },

    async selectDataRootDirectory() {
      const wails = readWailsLocalstore();
      if (wails?.SelectDataRootDirectory) {
        return wails.SelectDataRootDirectory();
      }
      // 浏览器替身：测试可预置 window.__linkitSelectDirectory
      const selector = (window as unknown as { __linkitSelectDirectory?: () => string | null }).__linkitSelectDirectory;
      if (typeof selector === 'function') {
        const path = selector();
        if (!path) {
          return { state: 'cancelled' };
        }
        return { state: 'selected', path };
      }
      return { state: 'cancelled' };
    },

    async migrateDataRoot(request) {
      const wails = readWailsLocalstore();
      if (wails?.MigrateDataRoot) {
        return wails.MigrateDataRoot(request);
      }
      if (!request.confirmed) {
        throw Object.assign(new Error('Invalid local document request'), { code: 'INVALID_ARGUMENT' });
      }
      const target = request.targetPath.trim();
      if (!target) {
        throw Object.assign(new Error('Target data directory is invalid'), { code: 'DATA_ROOT_INVALID' });
      }
      const occupiedMarker = storage.getItem(`linkit.data-root.occupied:${target}`);
      if (occupiedMarker === '1') {
        throw Object.assign(new Error('Target directory already contains Linkit data'), {
          code: 'DATA_ROOT_TARGET_OCCUPIED',
        });
      }
      storage.setItem(BROWSER_DATA_ROOT_KEY, target);
      return { dataRoot: target, migratedFiles: ['library.json', 'settings.json'] };
    },
  };
}

export function resetBrowserDataRootForTests(storage: Storage = localStorage): void {
  storage.removeItem(BROWSER_DATA_ROOT_KEY);
}
