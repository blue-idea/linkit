import { describe, expect, test } from 'vitest';
import {
  applyCategoryDeleteDecision,
  shouldConfirmCategoryDelete,
  type CategoryDeleteDecision,
} from './delete-confirm';

describe('分类删除确认编排', () => {
  // REQ-010-AC-003：含子分类或书签时必须弹出三选一对话框。
  test('shouldConfirmCategoryDelete 在有子分类或书签时返回 true', () => {
    expect(shouldConfirmCategoryDelete({ childCount: 1, bookmarkCount: 0 })).toBe(true);
    expect(shouldConfirmCategoryDelete({ childCount: 0, bookmarkCount: 2 })).toBe(true);
    expect(shouldConfirmCategoryDelete({ childCount: 0, bookmarkCount: 0 })).toBe(false);
  });

  test('applyCategoryDeleteDecision 映射三种策略且未确认递归时保持等待', () => {
    const cases: Array<{ decision: CategoryDeleteDecision; expected: string }> = [
      { decision: { choice: 'cancel' }, expected: 'cancelled' },
      { decision: { choice: 'move-then-delete' }, expected: 'move-then-delete' },
      { decision: { choice: 'recursive-delete', recursiveConfirmed: false }, expected: 'await-recursive-confirm' },
      { decision: { choice: 'recursive-delete', recursiveConfirmed: true }, expected: 'recursive-delete' },
    ];
    for (const item of cases) {
      expect(applyCategoryDeleteDecision(item.decision)).toBe(item.expected);
    }
  });
});
