import { describe, expect, test, vi } from 'vitest';
import { subscribeTraySettings } from './tray-settings';

describe('托盘 Settings 事件', () => {
  // REQ-030-AC-003：托盘 Settings 事件触发时打开设置弹窗。
  test('订阅固定事件并在触发时打开设置', () => {
    const onOpenSettings = vi.fn();
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_eventName: string, callback: () => void) => {
      callback();
      return unsubscribe;
    });

    const result = subscribeTraySettings(onOpenSettings, subscribe);

    expect(subscribe).toHaveBeenCalledWith('linkit:open-settings', onOpenSettings);
    expect(onOpenSettings).toHaveBeenCalledOnce();
    result();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
