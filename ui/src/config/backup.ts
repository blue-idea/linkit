/** 完整可移植备份的稳定格式与版本常量。 */
export const BACKUP_FORMAT = 'linkit-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const BACKUP_SETTINGS_VERSION = 1 as const;
export const LINKIT_APP_VERSION = '0.2.7';

export function buildBackupFileName(now: string): string {
  return `linkit-backup-${now.slice(0, 10)}.json`;
}
