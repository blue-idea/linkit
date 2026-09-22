/** 完整可移植备份的稳定格式与版本常量。 */
export const BACKUP_FORMAT = 'linkit-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const BACKUP_SETTINGS_VERSION = 1 as const;
/**
 * 解析并返回应用运行时/构建期版本。
 * 优先级：
 * 1. 显式传入版本（如调用或测试）
 * 2. 编译期注入的 import.meta.env.VITE_APP_VERSION
 * 3. 默认回退版本 '0.3.8'
 */
export function resolveAppVersion(injectedVersion?: string): string {
  const envVersion =
    injectedVersion ??
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_VERSION
      ? String(import.meta.env.VITE_APP_VERSION)
      : undefined);

  if (envVersion && envVersion.trim()) {
    return envVersion.trim().replace(/^v/, '');
  }
  return '0.3.8';
}

export const LINKIT_APP_VERSION = resolveAppVersion();

export function buildBackupFileName(now: string): string {
  return `linkit-backup-${now.slice(0, 10)}.json`;
}

