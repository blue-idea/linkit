import { describe, expect, test, vi } from 'vitest';
import { setMainWindowSize } from './desktop-window-size';

describe('setMainWindowSize', () => {
  // REQ-031-AC-003：桌面绑定存在时调用 Go SetMainWindowSize。
  test('存在 Go 绑定时转发 uiSize', async () => {
    const binder = vi.fn(async () => undefined);
    (window as unknown as { go: unknown }).go = {
      platform: { Service: { SetMainWindowSize: binder } },
    };
    await setMainWindowSize('large');
    expect(binder).toHaveBeenCalledWith({ uiSize: 'large' });
  });

  test('无绑定时为 no-op', async () => {
    delete (window as unknown as { go?: unknown }).go;
    await expect(setMainWindowSize('medium')).resolves.toBeUndefined();
  });
});
