import { beforeEach, describe, expect, test, vi } from 'vitest';
import { deleteAIKey, getAIKeyStatus, resetBrowserSecretStoreForTests } from './browser-secret-store';
import {
  deletePreferredAIKey,
  getPreferredAIKeyStatus,
  setPreferredAIKey,
} from './index';

describe('preferred secret store', () => {
  beforeEach(() => {
    delete (window as unknown as { go?: unknown }).go;
    resetBrowserSecretStoreForTests();
  });

  // REQ-019-AC-001 / REQ-025-AC-002：桌面绑定存在时写入 Go SecretStore。
  test('有 Go 绑定时 SetAIKey 传入 { value } 对象', async () => {
    const set = vi.fn(async () => undefined);
    const status = vi.fn(async () => ({ configured: true }));
    const del = vi.fn(async () => undefined);
    (window as unknown as { go: unknown }).go = {
      secretstore: { Service: { SetAIKey: set, GetAIKeyStatus: status, DeleteAIKey: del } },
    };

    await setPreferredAIKey('sk-desktop-key');
    expect(set).toHaveBeenCalledWith({ value: 'sk-desktop-key' });
    expect(await getPreferredAIKeyStatus()).toEqual({ configured: true });
    expect(status).toHaveBeenCalledOnce();

    await deletePreferredAIKey();
    expect(del).toHaveBeenCalledOnce();
  });

  test('无 Go 绑定时回退浏览器会话密钥', async () => {
    await setPreferredAIKey('sk-browser-key');
    expect(await getPreferredAIKeyStatus()).toEqual({ configured: true });
    // 浏览器替身与 preferred 入口共享回退实现。
    expect(await getAIKeyStatus()).toEqual({ configured: true });

    await deletePreferredAIKey();
    expect(await getPreferredAIKeyStatus()).toEqual({ configured: false });
    expect(await deleteAIKey()).toBeUndefined();
  });

  test('空密钥不得写入', async () => {
    await expect(setPreferredAIKey('   ')).rejects.toThrow(/empty/i);
  });
});
