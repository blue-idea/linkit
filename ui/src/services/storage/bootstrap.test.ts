import { describe, expect, test } from 'vitest';
import { createAppSettings, createLibraryEnvelope } from '../../testing/factories';
import type { RepositoryLoadResult } from '../../repositories';
import { bootstrapApp, type SettingsLoadResult } from './bootstrap';

describe('本地启动引导', () => {
  // REQ-002-AC-002：并行加载设置与资料库，恢复最后成功保存的状态。
  test('bootstrapApp 在 found 设置与资料库时返回 ready', async () => {
    const settings = createAppSettings({ storageMode: 'local', theme: 'ocean' });
    const envelope = createLibraryEnvelope();

    const result = await bootstrapApp({
      loadSettings: async (): Promise<SettingsLoadResult> => ({ state: 'found', settings }),
      loadLibrary: async (): Promise<RepositoryLoadResult> => ({
        state: 'found',
        snapshot: { source: 'local', envelope },
      }),
    });

    expect(result.phase).toBe('ready');
    expect(result.settings.theme).toBe('ocean');
    expect(result.library?.revision).toBe(envelope.revision);
    expect(result.recovery).toBeNull();
    expect(result.shouldEnterLocalMode).toBe(true);
  });

  // REQ-002-AC-002：无本机资料库时仍返回设置默认值，供本地模式入口使用。
  test('bootstrapApp 在 empty 资料库且默认设置时不自动进入本地模式', async () => {
    const result = await bootstrapApp({
      loadSettings: async () => ({ state: 'default', settings: createAppSettings() }),
      loadLibrary: async () => ({ state: 'empty' }),
    });

    expect(result.phase).toBe('ready');
    expect(result.library).toBeNull();
    expect(result.shouldEnterLocalMode).toBe(false);
  });

  // TASK-010：损坏正式文件且备份可用时必须进入 recovery 阶段，禁止静默覆盖。
  test('bootstrapApp 在 recovery_available 时返回 recovery_required', async () => {
    const recovery = createLibraryEnvelope({ bookmarks: [] });
    const result = await bootstrapApp({
      loadSettings: async () => ({ state: 'found', settings: createAppSettings() }),
      loadLibrary: async () => ({
        state: 'recovery_available',
        recovery: { source: 'local', envelope: recovery },
      }),
    });

    expect(result.phase).toBe('recovery_required');
    expect(result.recovery?.envelope).toEqual(recovery);
    expect(result.library).toBeNull();
  });
});
