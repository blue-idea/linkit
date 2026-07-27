import type { PortableAppSettings } from '../../domain/library';
import type { AppSettings as UiAppSettings, LibraryData as UiLibraryData } from '../../types';

export interface RestoreSnapshot {
  library: UiLibraryData;
  settings: UiAppSettings;
}

export interface ImportRestoreRequest {
  kind: 'backup' | 'library';
  snapshot: RestoreSnapshot;
}

export class BackupRestoreError extends Error {
  readonly code = 'BACKUP_RESTORE_FAILED';

  constructor(
    readonly cause: unknown,
    readonly rollbackErrors: unknown[] = [],
  ) {
    super('Backup restore failed');
    this.name = 'BackupRestoreError';
  }
}

/**
 * 旧资料库导入保留当前设置；完整备份仅采用白名单设置并清除本机授权状态。
 * REQ-034-AC-003/004
 */
export function resolveImportedSettings(
  current: UiAppSettings,
  portable: PortableAppSettings | null,
): UiAppSettings {
  if (!portable) {
    return current;
  }
  return {
    storageMode: portable.storageMode,
    theme: portable.theme,
    locale: portable.locale,
    ai: { ...portable.ai },
    aiConsent: null,
    view: { ...portable.view },
    shortcuts: { ...portable.shortcuts },
    uiSize: portable.uiSize,
  };
}

/**
 * 先持久化资料库与设置，全部成功后才应用界面状态；失败时逆序补偿。
 * REQ-034-AC-003/005
 */
export async function restoreBackupAtomically(input: {
  previous: RestoreSnapshot;
  next: RestoreSnapshot;
  persistLibrary: (library: UiLibraryData) => Promise<void>;
  persistSettings: (settings: UiAppSettings) => Promise<void>;
  apply: (snapshot: RestoreSnapshot) => void;
}): Promise<void> {
  let libraryPersisted = false;
  let settingsPersisted = false;
  let applyAttempted = false;

  try {
    await input.persistLibrary(input.next.library);
    libraryPersisted = true;
    await input.persistSettings(input.next.settings);
    settingsPersisted = true;
    applyAttempted = true;
    input.apply(input.next);
  } catch (cause) {
    const rollbackErrors: unknown[] = [];
    if (applyAttempted) {
      try {
        input.apply(input.previous);
      } catch (error) {
        rollbackErrors.push(error);
      }
    }
    if (settingsPersisted) {
      try {
        await input.persistSettings(input.previous.settings);
      } catch (error) {
        rollbackErrors.push(error);
      }
    }
    if (libraryPersisted) {
      try {
        await input.persistLibrary(input.previous.library);
      } catch (error) {
        rollbackErrors.push(error);
      }
    }
    throw new BackupRestoreError(cause, rollbackErrors);
  }
}
