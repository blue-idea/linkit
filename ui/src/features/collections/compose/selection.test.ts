import { describe, expect, test } from 'vitest';
import { parseComposeDragPayload, toggleComposeSelection } from './selection';

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
});
