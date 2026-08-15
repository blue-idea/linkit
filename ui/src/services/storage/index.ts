export { bootstrapApp } from './bootstrap';
export type { BootstrapDependencies, BootstrapPhase, BootstrapResult, SettingsLoadResult } from './bootstrap';
export { createLocalRepository } from './local-repository';
export type { LocalDocumentBindings } from './local-repository';
export { createBrowserStorageAdapters } from './browser-adapters';
export {
  createBackupPersistenceAdapters,
  createPreferredStorageAdapters,
  isDesktopGoStorageAvailable,
} from './desktop-adapters';
export type { BackupPersistenceAdapters } from './desktop-adapters';
export { createDataRootBindings, resetBrowserDataRootForTests } from './data-root';
export type {
  DataRootBindings,
  DataRootInfo,
  DataRootTargetInfo,
  MigrateDataRootRequest,
  MigrateDataRootResult,
  SelectDirectoryResult,
} from './data-root';
export type { BrowserStorageAdapters } from './browser-adapters';
