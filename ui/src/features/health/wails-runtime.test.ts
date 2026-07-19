import { afterEach, describe, expect, test, vi } from 'vitest';
import { subscribeWailsEvent } from './wails-runtime';

declare global {
  interface Window {
    runtime?: {
      EventsOnMultiple?: (
        eventName: string,
        callback: (payload: unknown) => void,
        maxCallbacks: number
      ) => () => void;
    };
  }
}

describe('Wails runtime 事件适配器', () => {
  afterEach(() => {
    delete window.runtime;
    vi.restoreAllMocks();
  });

  // REQ-022-AC-003：CI/browser 环境没有生成的 wailsjs runtime 时不得阻断构建和健康扫描降级。
  test('缺少 window.runtime 时返回 no-op 取消订阅函数', () => {
    const off = subscribeWailsEvent('linkit:health-scan-progress', vi.fn());

    expect(off).toBeTypeOf('function');
    expect(() => off()).not.toThrow();
  });

  // REQ-022-AC-003：桌面环境存在 runtime 时仍然订阅 Go 侧进度事件。
  test('存在 window.runtime 时委托 EventsOnMultiple 并保持无限订阅', () => {
    const off = vi.fn();
    const eventsOnMultiple = vi.fn(() => off);
    window.runtime = { EventsOnMultiple: eventsOnMultiple };
    const callback = vi.fn();

    const result = subscribeWailsEvent('linkit:health-scan-finished', callback);

    expect(eventsOnMultiple).toHaveBeenCalledWith('linkit:health-scan-finished', callback, -1);
    result();
    expect(off).toHaveBeenCalledTimes(1);
  });
});
