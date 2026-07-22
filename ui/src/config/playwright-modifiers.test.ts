import { describe, expect, test } from 'vitest';
import { additiveSelectionModifier } from './playwright-modifiers';

describe('additiveSelectionModifier', () => {
  test('macOS 使用 Meta 作为追加选择修饰键', () => {
    expect(additiveSelectionModifier('darwin')).toBe('Meta');
  });

  test('非 macOS 平台使用 Control 作为追加选择修饰键', () => {
    expect(additiveSelectionModifier('linux')).toBe('Control');
    expect(additiveSelectionModifier('win32')).toBe('Control');
  });
});
