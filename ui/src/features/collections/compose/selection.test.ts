import { describe, expect, test } from 'vitest';
import {
  computeDeselectAllIds,
  computeSelectAllIds,
  isAllVisibleSelected,
  parseComposeDragPayload,
  toggleComposeSelection,
} from './selection';

describe('主题组合选择辅助', () => {
  test('toggleComposeSelection 在修饰键下追加或移除', () => {
    expect(toggleComposeSelection(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleComposeSelection(['a', 'b'], 'a', true)).toEqual(['b']);
    expect(toggleComposeSelection(['a', 'b'], 'c', false)).toEqual(['c']);
  });

  test('parseComposeDragPayload 解析单 ID 与 JSON 多选', () => {
    expect(parseComposeDragPayload('bm-1')).toEqual(['bm-1']);
    expect(parseComposeDragPayload('["bm-1","bm-2"]')).toEqual(['bm-1', 'bm-2']);
    expect(parseComposeDragPayload('')).toEqual([]);
  });

  test('isAllVisibleSelected 正确判断当前可视书签是否全部选中', () => {
    expect(isAllVisibleSelected([], [])).toBe(false);
    expect(isAllVisibleSelected(['1', '2'], [])).toBe(false);
    expect(isAllVisibleSelected(['1'], ['1', '2'])).toBe(false);
    expect(isAllVisibleSelected(['1', '2', '3'], ['1', '2'])).toBe(true);
    expect(isAllVisibleSelected(['1', '2'], ['1', '2'])).toBe(true);
  });

  test('computeSelectAllIds 合并可视书签并去重', () => {
    expect(computeSelectAllIds([], ['1', '2'])).toEqual(['1', '2']);
    expect(computeSelectAllIds(['1', '3'], ['1', '2'])).toEqual(['1', '3', '2']);
    expect(computeSelectAllIds(['1'], [])).toEqual(['1']);
  });

  test('computeDeselectAllIds 仅从选中列表中剔除当前可视书签', () => {
    expect(computeDeselectAllIds(['1', '2', '3'], ['1', '2'])).toEqual(['3']);
    expect(computeDeselectAllIds(['1', '2'], ['1', '2'])).toEqual([]);
    expect(computeDeselectAllIds(['3'], ['1', '2'])).toEqual(['3']);
  });
});

