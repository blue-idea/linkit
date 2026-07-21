import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setToggleWindowHotkey } from './desktop-hotkey';

describe('setToggleWindowHotkey', () => {
  beforeEach(() => {
    delete (window as unknown as { go?: unknown }).go;
  });

  // REQ-030-AC-007：保存其他设置时不得重复注册未变化的全局热键。
  test('当前绑定未变化时跳过桌面重注册', async () => {
    const binder = vi.fn(async () => undefined);
    (window as unknown as { go: unknown }).go = {
      platform: { Service: { SetToggleWindowHotkey: binder } },
    };

    await setToggleWindowHotkey('CmdOrCtrl+L', 'CmdOrCtrl+L');

    expect(binder).not.toHaveBeenCalled();
  });

  // REQ-030-AC-007：用户修改绑定后仍须调用桌面注册能力。
  test('当前绑定变化时注册新热键', async () => {
    const binder = vi.fn(async () => undefined);
    (window as unknown as { go: unknown }).go = {
      platform: { Service: { SetToggleWindowHotkey: binder } },
    };

    await setToggleWindowHotkey('CmdOrCtrl+H', 'CmdOrCtrl+L');

    expect(binder).toHaveBeenCalledWith({ accelerator: 'CmdOrCtrl+H' });
  });
});
