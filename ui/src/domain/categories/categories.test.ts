import { describe, expect, test } from 'vitest';
import {
  createBookmark,
  createCategory,
  createCoreJourneySeed,
} from '../../testing/factories';
import type { LibraryData } from '../library';

type CategoryTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  children: CategoryTreeNode[];
  bookmarkCount: number;
};

type DeleteStrategy = 'move-then-delete' | 'recursive-delete' | 'cancel';

interface CategoryModule {
  buildCategoryTree: (
    categories: LibraryData['categories'],
    bookmarks: LibraryData['bookmarks']
  ) => CategoryTreeNode[];
  createCategory: (
    library: LibraryData,
    input: {
      name: string;
      parentId?: string | null;
      icon?: string;
      color?: LibraryData['categories'][number]['color'];
      idFactory?: () => string;
    }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  renameCategory: (
    library: LibraryData,
    input: { id: string; name: string }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  deleteCategory: (
    library: LibraryData,
    input: { id: string; strategy: DeleteStrategy; recursiveConfirmed?: boolean }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  wouldCreateCategoryCycle: (
    categories: LibraryData['categories'],
    input: { categoryId: string; newParentId: string | null }
  ) => boolean;
}

async function loadCategories(): Promise<Partial<CategoryModule>> {
  return import(/* @vite-ignore */ './index').catch(() => ({}));
}

function sampleLibrary(): LibraryData {
  const root = createCategory({ id: 'cat-root', name: 'Root', parentId: null });
  const child = createCategory({ id: 'cat-child', name: 'Child', parentId: 'cat-root', color: 'amber' });
  const grand = createCategory({ id: 'cat-grand', name: 'Grand', parentId: 'cat-child', color: 'green' });
  return {
    ...createCoreJourneySeed().library.data,
    categories: [root, child, grand],
    bookmarks: [
      createBookmark({ id: 'bm-root', categoryId: 'cat-root', title: 'Root BM' }),
      createBookmark({ id: 'bm-child', categoryId: 'cat-child', title: 'Child BM' }),
      createBookmark({ id: 'bm-grand', categoryId: 'cat-grand', title: 'Grand BM' }),
    ],
  };
}

describe('分类树与领域命令', () => {
  // REQ-010-AC-001：无环树且计数含后代书签。
  test('buildCategoryTree 构建无环多级树且计数包含后代书签', async () => {
    const { buildCategoryTree } = await loadCategories();
    expect(buildCategoryTree).toBeTypeOf('function');
    if (!buildCategoryTree) throw new Error('buildCategoryTree is required');

    const library = sampleLibrary();
    const tree = buildCategoryTree(library.categories, library.bookmarks);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ id: 'cat-root', bookmarkCount: 3 });
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0]).toMatchObject({ id: 'cat-child', bookmarkCount: 2 });
    expect(tree[0].children[0].children[0]).toMatchObject({ id: 'cat-grand', bookmarkCount: 1 });
  });

  // REQ-010-AC-002：创建/重命名校验非空名称。
  test('createCategory 在有效名称时创建分类', async () => {
    const { createCategory: createCat } = await loadCategories();
    expect(createCat).toBeTypeOf('function');
    if (!createCat) throw new Error('createCategory is required');

    const library = sampleLibrary();
    const result = createCat(library, {
      name: 'New Branch',
      parentId: 'cat-root',
      idFactory: () => 'cat-new',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.categories.find((c) => c.id === 'cat-new')).toMatchObject({
      id: 'cat-new',
      name: 'New Branch',
      parentId: 'cat-root',
    });
  });

  test('createCategory 在空名称时返回 CATEGORY_NAME_INVALID', async () => {
    const { createCategory: createCat } = await loadCategories();
    expect(createCat).toBeTypeOf('function');
    if (!createCat) throw new Error('createCategory is required');

    expect(createCat(sampleLibrary(), { name: '   ' })).toEqual({
      ok: false,
      error: { code: 'CATEGORY_NAME_INVALID', message: 'Category name is required' },
    });
  });

  test('renameCategory 更新名称且拒绝空名称', async () => {
    const { renameCategory } = await loadCategories();
    expect(renameCategory).toBeTypeOf('function');
    if (!renameCategory) throw new Error('renameCategory is required');

    const library = sampleLibrary();
    const ok = renameCategory(library, { id: 'cat-child', name: 'Renamed Child' });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value.categories.find((c) => c.id === 'cat-child')?.name).toBe('Renamed Child');

    expect(renameCategory(library, { id: 'cat-child', name: '' })).toEqual({
      ok: false,
      error: { code: 'CATEGORY_NAME_INVALID', message: 'Category name is required' },
    });
  });

  test('wouldCreateCategoryCycle 检测自环与后代环', async () => {
    const { wouldCreateCategoryCycle } = await loadCategories();
    expect(wouldCreateCategoryCycle).toBeTypeOf('function');
    if (!wouldCreateCategoryCycle) throw new Error('wouldCreateCategoryCycle is required');

    const cats = sampleLibrary().categories;
    expect(wouldCreateCategoryCycle(cats, { categoryId: 'cat-root', newParentId: 'cat-grand' })).toBe(true);
    expect(wouldCreateCategoryCycle(cats, { categoryId: 'cat-child', newParentId: 'cat-child' })).toBe(true);
    expect(wouldCreateCategoryCycle(cats, { categoryId: 'cat-grand', newParentId: 'cat-root' })).toBe(false);
  });

  // REQ-010-AC-004：移动内容后删除。
  test('deleteCategory move-then-delete 将直属内容移到父级后删除分类', async () => {
    const { deleteCategory } = await loadCategories();
    expect(deleteCategory).toBeTypeOf('function');
    if (!deleteCategory) throw new Error('deleteCategory is required');

    const library = sampleLibrary();
    const result = deleteCategory(library, { id: 'cat-child', strategy: 'move-then-delete' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.categories.find((c) => c.id === 'cat-child')).toBeUndefined();
    expect(result.value.categories.find((c) => c.id === 'cat-grand')?.parentId).toBe('cat-root');
    expect(result.value.bookmarks.find((b) => b.id === 'bm-child')?.categoryId).toBe('cat-root');
    expect(result.value.bookmarks.find((b) => b.id === 'bm-grand')?.categoryId).toBe('cat-grand');
    expect(library.categories).toHaveLength(3);
  });

  // REQ-010-AC-005：递归删除需二次确认，书签变未分类。
  test('deleteCategory recursive-delete 在二次确认后删除子树并清空书签分类', async () => {
    const { deleteCategory } = await loadCategories();
    expect(deleteCategory).toBeTypeOf('function');
    if (!deleteCategory) throw new Error('deleteCategory is required');

    const library = sampleLibrary();
    const blocked = deleteCategory(library, { id: 'cat-child', strategy: 'recursive-delete' });
    expect(blocked).toEqual({
      ok: false,
      error: {
        code: 'CATEGORY_RECURSIVE_CONFIRM_REQUIRED',
        message: 'Recursive category delete requires a second confirmation',
      },
    });

    const result = deleteCategory(library, {
      id: 'cat-child',
      strategy: 'recursive-delete',
      recursiveConfirmed: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.categories.map((c) => c.id)).toEqual(['cat-root']);
    expect(result.value.bookmarks.find((b) => b.id === 'bm-child')?.categoryId).toBeNull();
    expect(result.value.bookmarks.find((b) => b.id === 'bm-grand')?.categoryId).toBeNull();
    expect(result.value.bookmarks.find((b) => b.id === 'bm-root')?.categoryId).toBe('cat-root');
  });

  // REQ-010-AC-003：取消无副作用。
  test('deleteCategory cancel 不修改资料库', async () => {
    const { deleteCategory } = await loadCategories();
    expect(deleteCategory).toBeTypeOf('function');
    if (!deleteCategory) throw new Error('deleteCategory is required');

    const library = sampleLibrary();
    const result = deleteCategory(library, { id: 'cat-child', strategy: 'cancel' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(library);
  });
});
