import { describe, expect, test, vi } from 'vitest';
import { subscribeTrayAbout } from './tray-about';

describe('托盘 About 事件', () => {
  test('订阅固定事件并在触发时打开 About', () => {
    const onOpenAbout = vi.fn();
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_eventName: string, callback: () => void) => {
      callback();
      return unsubscribe;
    });

    const result = subscribeTrayAbout(onOpenAbout, subscribe);

    expect(subscribe).toHaveBeenCalledWith('linkit:open-about', onOpenAbout);
    expect(onOpenAbout).toHaveBeenCalledOnce();
    result();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
