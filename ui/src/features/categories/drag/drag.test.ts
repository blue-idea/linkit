import { describe, expect, test } from 'vitest';
import {
  createBookmark,
  createCategory,
  createCoreJourneySeed,
} from '../../../testing/factories';
import type { LibraryData } from '../../../domain/library';

async function loadDrag(): Promise<Record<string, unknown>> {
  return import(/* @vite-ignore */ './index').catch(() => ({}));
}

function sampleLibrary(): LibraryData {
  return {
    ...createCoreJourneySeed().library.data,
    categories: [
      createCategory({ id: 'cat-root', name: 'Root', parentId: null }),
      createCategory({ id: 'cat-a', name: 'A', parentId: 'cat-root' }),
      createCategory({ id: 'cat-b', name: 'B', parentId: 'cat-root', color: 'amber' }),
      createCategory({ id: 'cat-a1', name: 'A1', parentId: 'cat-a', color: 'green' }),
    ],
    bookmarks: [
      createBookmark({ id: 'bm-1', categoryId: 'cat-a', title: 'One' }),
      createBookmark({ id: 'bm-2', categoryId: 'cat-b', title: 'Two' }),
    ],
  };
}

describe('分类与书签拖拽规则', () => {
  // REQ-011-AC-001：合法移动更新 parentId。
  test('moveCategoryUnder 将分类挂到合法父级并更新 parentId', async () => {
    const mod = await loadDrag();
    const moveCategoryUnder = mod.moveCategoryUnder as
      | ((library: LibraryData, input: { categoryId: string; newParentId: string | null }) => LibraryData)
      | undefined;
    expect(moveCategoryUnder).toBeTypeOf('function');
    if (!moveCategoryUnder) throw new Error('moveCategoryUnder is required');

    const library = sampleLibrary();
    const next = moveCategoryUnder(library, { categoryId: 'cat-b', newParentId: 'cat-a' });
    expect(next.categories.find((c) => c.id === 'cat-b')?.parentId).toBe('cat-a');
    expect(library.categories.find((c) => c.id === 'cat-b')?.parentId).toBe('cat-root');
  });

  // REQ-011-AC-002：拖入自身或后代抛出 InvalidCategoryMoveError。
  test('moveCategoryUnder 拖入自身或后代时抛出 InvalidCategoryMoveError', async () => {
    const mod = await loadDrag();
    const moveCategoryUnder = mod.moveCategoryUnder as
      | ((library: LibraryData, input: { categoryId: string; newParentId: string | null }) => LibraryData)
      | undefined;
    const InvalidCategoryMoveError = mod.InvalidCategoryMoveError as
      | (new (...args: unknown[]) => Error)
      | undefined;
    expect(moveCategoryUnder).toBeTypeOf('function');
    expect(InvalidCategoryMoveError).toBeTypeOf('function');
    if (!moveCategoryUnder || !InvalidCategoryMoveError) {
      throw new Error('moveCategoryUnder and InvalidCategoryMoveError are required');
    }

    const library = sampleLibrary();
    expect(() =>
      moveCategoryUnder(library, { categoryId: 'cat-a', newParentId: 'cat-a' })
    ).toThrow(InvalidCategoryMoveError);
    expect(() =>
      moveCategoryUnder(library, { categoryId: 'cat-a', newParentId: 'cat-a1' })
    ).toThrow(InvalidCategoryMoveError);
    expect(library.categories.find((c) => c.id === 'cat-a')?.parentId).toBe('cat-root');
  });

  // REQ-011-AC-003：书签拖到分类节点更新 categoryId。
  test('assignBookmarkToCategory 更新书签 categoryId', async () => {
    const mod = await loadDrag();
    const assignBookmarkToCategory = mod.assignBookmarkToCategory as
      | ((
          library: LibraryData,
          input: { bookmarkId: string; categoryId: string }
        ) => { library: LibraryData; message: string })
      | undefined;
    expect(assignBookmarkToCategory).toBeTypeOf('function');
    if (!assignBookmarkToCategory) throw new Error('assignBookmarkToCategory is required');

    const library = sampleLibrary();
    const result = assignBookmarkToCategory(library, {
      bookmarkId: 'bm-1',
      categoryId: 'cat-b',
    });
    expect(result.library.bookmarks.find((b) => b.id === 'bm-1')?.categoryId).toBe('cat-b');
    expect(result.message).toMatch(/moved|category/i);
    expect(library.bookmarks.find((b) => b.id === 'bm-1')?.categoryId).toBe('cat-a');
  });

  // REQ-024-AC-006：键盘等价操作可解析目标父级。
  test('resolveKeyboardCategoryMove 解析合法键盘移动目标', async () => {
    const mod = await loadDrag();
    const resolveKeyboardCategoryMove = mod.resolveKeyboardCategoryMove as
      | ((input: {
          categories: LibraryData['categories'];
          categoryId: string;
          targetParentId: string | null;
        }) => { ok: true; newParentId: string | null } | { ok: false; reason: string })
      | undefined;
    expect(resolveKeyboardCategoryMove).toBeTypeOf('function');
    if (!resolveKeyboardCategoryMove) throw new Error('resolveKeyboardCategoryMove is required');

    const categories = sampleLibrary().categories;
    expect(
      resolveKeyboardCategoryMove({
        categories,
        categoryId: 'cat-b',
        targetParentId: 'cat-a',
      })
    ).toEqual({ ok: true, newParentId: 'cat-a' });
    expect(
      resolveKeyboardCategoryMove({
        categories,
        categoryId: 'cat-a',
        targetParentId: 'cat-a1',
      })
    ).toEqual({ ok: false, reason: 'INVALID_CATEGORY_MOVE' });
  });

  test('parseCategoryDndId 与 categoryDndId 支持根落点 ID 转换与解析', async () => {
    const { categoryDndId, parseCategoryDndId, CATEGORY_ROOT_DND_ID } = await import('./ids');
    expect(categoryDndId(null)).toBe(CATEGORY_ROOT_DND_ID);
    expect(categoryDndId('__root__')).toBe(CATEGORY_ROOT_DND_ID);
    expect(parseCategoryDndId(CATEGORY_ROOT_DND_ID)).toBe(null);
    expect(parseCategoryDndId('category:cat-123')).toBe('cat-123');
    expect(parseCategoryDndId('other:123')).toBe(undefined);
  });

  test('moveCategoryUnder 支持将子分类设为一级目录 (newParentId 为 null)', async () => {
    const { moveCategoryUnder } = await import('./index');
    const library = sampleLibrary();
    const next = moveCategoryUnder(library, { categoryId: 'cat-a1', newParentId: null });
    expect(next.categories.find((c) => c.id === 'cat-a1')?.parentId).toBe(null);
  });
});
