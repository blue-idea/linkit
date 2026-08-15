import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION, BACKUP_SETTINGS_VERSION, buildBackupFileName, LINKIT_APP_VERSION, resolveAppVersion } from './backup';

describe('backup config & app version', () => {
  it('应具有正确的稳定备份常量', () => {
    expect(BACKUP_FORMAT).toBe('linkit-backup');
    expect(BACKUP_SCHEMA_VERSION).toBe(1);
    expect(BACKUP_SETTINGS_VERSION).toBe(1);
  });

  it('buildBackupFileName 应包含 ISO 日期前缀', () => {
    expect(buildBackupFileName('2026-08-14T17:00:00Z')).toBe('linkit-backup-2026-08-14.json');
  });

  it('resolveAppVersion 优先使用传入/环境变量中的版本号并去除前导 v', () => {
    expect(resolveAppVersion('v0.3.7')).toBe('0.3.7');
    expect(resolveAppVersion('0.4.0')).toBe('0.4.0');
    expect(resolveAppVersion('  v1.0.0  ')).toBe('1.0.0');
  });

  it('resolveAppVersion 在无注入时回退至当前默认版本 0.3.7', () => {
    expect(resolveAppVersion(undefined)).toBe('0.3.7');
    expect(resolveAppVersion('')).toBe('0.3.7');
    expect(resolveAppVersion('   ')).toBe('0.3.7');
  });

  it('LINKIT_APP_VERSION 默认应为有效版本字符串', () => {
    expect(LINKIT_APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
