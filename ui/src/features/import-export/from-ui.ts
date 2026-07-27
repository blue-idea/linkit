import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  BACKUP_SETTINGS_VERSION,
  LINKIT_APP_VERSION,
} from '../../config/backup';
import { DEFAULT_APP_SETTINGS } from '../../config/settings';
import type {
  BackupEnvelope,
  LibraryEnvelope,
  PortableAppSettings,
} from '../../domain/library';
import { mergeShortcuts } from '../shell/shortcuts';
import type { AppSettings as UiAppSettings, LibraryData as UiLibrary } from '../../types';
import { toCategoryLibrary } from '../categories/apply-category-command';
import { buildExportDocument, type ExportDocument } from './document';

/**
 * 将当前 UI 资料库包装为领域信封，供旧导出与完整备份共同复用。
 * REQ-005-AC-001 / REQ-034-AC-001
 */
export function buildLibraryEnvelopeFromUi(
  library: UiLibrary,
  options: { now: string; revision?: number }
): LibraryEnvelope {
  const data = toCategoryLibrary(library);
  return {
    format: 'linkit-library',
    schemaVersion: 1,
    revision: options.revision ?? 0,
    updatedAt: options.now,
    data,
  };
}

/**
 * 通过显式白名单构建可移植设置，避免未来新增的敏感字段自动进入备份。
 * REQ-034-AC-002
 */
export function buildPortableSettings(settings: UiAppSettings): PortableAppSettings {
  return {
    settingsVersion: BACKUP_SETTINGS_VERSION,
    storageMode: settings.storageMode,
    theme: settings.theme,
    locale: settings.locale,
    ai: {
      apiBase: settings.ai.apiBase,
      model: settings.ai.model,
    },
    view: {
      defaultMode: settings.view?.defaultMode ?? DEFAULT_APP_SETTINGS.view.defaultMode,
    },
    shortcuts: mergeShortcuts(settings.shortcuts),
    uiSize: settings.uiSize ?? DEFAULT_APP_SETTINGS.uiSize,
  };
}

/** 构建包含全部资料库数据和可移植设置的完整备份。REQ-034-AC-001/002 */
export function buildBackupEnvelopeFromUi(
  library: UiLibrary,
  settings: UiAppSettings,
  options: { now: string; revision?: number; appVersion?: string },
): BackupEnvelope {
  const libraryEnvelope = buildLibraryEnvelopeFromUi(library, options);
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    revision: libraryEnvelope.revision,
    updatedAt: libraryEnvelope.updatedAt,
    exportedAt: options.now,
    appVersion: options.appVersion ?? LINKIT_APP_VERSION,
    data: libraryEnvelope.data,
    settings: buildPortableSettings(settings),
  };
}

/** 保留旧 linkit-library 导出 API，供既有存储适配器兼容使用。 */
export function buildExportEnvelopeFromUi(
  library: UiLibrary,
  options: { now: string; revision?: number },
): ExportDocument {
  return buildExportDocument(buildLibraryEnvelopeFromUi(library, options), options.now);
}
