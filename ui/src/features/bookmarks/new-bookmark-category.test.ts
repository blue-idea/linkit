import { describe, expect, test } from 'vitest';
import {
  resolveNewBookmarkCategoryId,
  shouldApplyAiCategorySuggestion,
} from './new-bookmark-category';

describe('新建书签分类归属', () => {
  test('分类视图下始终归属当前分类，忽略对话框选择与 AI 建议', () => {
    expect(
      resolveNewBookmarkCategoryId({
        activeCategoryId: 'cat-current',
        selectedCategoryId: 'cat-ai',
      })
    ).toBe('cat-current');
  });

  test('未选中分类时采用对话框选择（含 AI 建议）', () => {
    expect(
      resolveNewBookmarkCategoryId({
        activeCategoryId: null,
        selectedCategoryId: 'cat-ai',
      })
    ).toBe('cat-ai');
    expect(
      resolveNewBookmarkCategoryId({
        activeCategoryId: '',
        selectedCategoryId: 'cat-manual',
      })
    ).toBe('cat-manual');
  });

  test('仅未锁定分类时应用 AI 建议', () => {
    expect(shouldApplyAiCategorySuggestion('cat-current')).toBe(false);
    expect(shouldApplyAiCategorySuggestion(null)).toBe(true);
    expect(shouldApplyAiCategorySuggestion('')).toBe(true);
  });
});
