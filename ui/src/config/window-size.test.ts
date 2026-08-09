import { describe, expect, test } from 'vitest';
import { UI_SIZE_PRESETS, resolveWindowSize, type UiSize } from './window-size';

// REQ-031-AC-002 / AC-003：前端预设与规格表一致。
describe('window-size presets', () => {
  test('medium 默认映射 1384x865', () => {
    expect(resolveWindowSize('medium')).toEqual({ width: 1384, height: 865 });
  });

  test('四档预设与 data.md 一致', () => {
    const expected: Record<UiSize, { width: number; height: number }> = {
      small: { width: 1182, height: 739 },
      medium: { width: 1384, height: 865 },
      large: { width: 1566, height: 979 },
      xlarge: { width: 1822, height: 1139 },
    };
    for (const size of Object.keys(expected) as UiSize[]) {
      expect(resolveWindowSize(size)).toEqual(expected[size]);
      expect(UI_SIZE_PRESETS[size]).toEqual(expected[size]);
    }
  });
});
