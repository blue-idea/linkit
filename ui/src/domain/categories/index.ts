import { DOMAIN_CONFIG } from '../../config/domain';
import type { LibraryData } from '../library';
import type { CommandResult } from '../commands/types';

export type CategoryColor = LibraryData['categories'][number]['color'];
export type DeleteCategoryStrategy = 'move-then-delete' | 'recursive-delete' | 'cancel';

export interface CategoryTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children: CategoryTreeNode[];
  bookmarkCount: number;
}

export interface CreateCategoryInput {
  name: string;
  parentId?: string | null;
  icon?: string;
  color?: CategoryColor;
  idFactory?: () => string;
}

export interface RenameCategoryInput {
  id: string;
  name: string;
}

export interface DeleteCategoryInput {
  id: string;
  strategy: DeleteCategoryStrategy;
  recursiveConfirmed?: boolean;
}

function normalizeName(name: string): string {
  return name.trim();
}

function defaultIdFactory(): string {
  return `category-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function childrenOf(
  categories: LibraryData['categories'],
  parentId: string | null
): LibraryData['categories'] {
  return categories.filter((category) => category.parentId === parentId);
}

/**
 * 收集分类及其全部后代 ID。
 * REQ-010-AC-001
 */
export function collectCategorySubtreeIds(
  categories: LibraryData['categories'],
  rootId: string
): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        grew = true;
      }
    }
  }
  return ids;
}

/**
 * 若将 category 挂到 newParent 会成环则返回 true。
 * REQ-010-AC-001 / REQ-011-AC-002 预留
 */
export function wouldCreateCategoryCycle(
  categories: LibraryData['categories'],
  input: { categoryId: string; newParentId: string | null }
): boolean {
  if (input.newParentId === null) return false;
  if (input.newParentId === input.categoryId) return true;
  return collectCategorySubtreeIds(categories, input.categoryId).has(input.newParentId);
}

function countDescendantBookmarks(
  categoryId: string,
  categories: LibraryData['categories'],
  bookmarks: LibraryData['bookmarks']
): number {
  const subtree = collectCategorySubtreeIds(categories, categoryId);
  return bookmarks.filter(
    (bookmark) => bookmark.categoryId !== null && subtree.has(bookmark.categoryId)
  ).length;
}

function buildNode(
  category: LibraryData['categories'][number],
  categories: LibraryData['categories'],
  bookmarks: LibraryData['bookmarks']
): CategoryTreeNode {
  return {
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    bookmarkCount: countDescendantBookmarks(category.id, categories, bookmarks),
    children: childrenOf(categories, category.id).map((child) =>
      buildNode(child, categories, bookmarks)
    ),
  };
}

/**
 * 构建可展开的无环分类树，计数含后代书签。
 * REQ-010-AC-001
 */
export function buildCategoryTree(
  categories: LibraryData['categories'],
  bookmarks: LibraryData['bookmarks']
): CategoryTreeNode[] {
  return childrenOf(categories, null).map((root) => buildNode(root, categories, bookmarks));
}

/**
 * 创建分类；名称非空，父级合法且不成环。
 * REQ-010-AC-002
 */
export function createCategory(
  library: LibraryData,
  input: CreateCategoryInput
): CommandResult<LibraryData> {
  const name = normalizeName(input.name);
  if (!name) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.categoryNameInvalid } };
  }

  const parentId = input.parentId ?? null;
  if (parentId !== null && !library.categories.some((category) => category.id === parentId)) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.categoryParentInvalid } };
  }

  const id = (input.idFactory ?? defaultIdFactory)();
  if (wouldCreateCategoryCycle(library.categories, { categoryId: id, newParentId: parentId })) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.categoryParentInvalid } };
  }

  const category = {
    id,
    name,
    icon: input.icon?.trim() || 'Folder',
    parentId,
    color: input.color ?? 'gray',
  };

  return {
    ok: true,
    value: {
      ...library,
      categories: [...library.categories, category],
    },
    events: [{ type: DOMAIN_CONFIG.events.categoryCreated, payload: { categoryId: id } }],
  };
}

/**
 * 重命名分类。
 * REQ-010-AC-002
 */
export function renameCategory(
  library: LibraryData,
  input: RenameCategoryInput
): CommandResult<LibraryData> {
  const name = normalizeName(input.name);
  if (!name) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.categoryNameInvalid } };
  }

  const index = library.categories.findIndex((category) => category.id === input.id);
  if (index < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.categoryNotFound } };
  }

  const categories = [...library.categories];
  categories[index] = { ...categories[index], name };
  return {
    ok: true,
    value: { ...library, categories },
    events: [{ type: DOMAIN_CONFIG.events.categoryRenamed, payload: { categoryId: input.id } }],
  };
}

function moveThenDelete(library: LibraryData, categoryId: string): LibraryData {
  const target = library.categories.find((category) => category.id === categoryId);
  if (!target) return library;
  const fallbackParentId = target.parentId;

  return {
    ...library,
    categories: library.categories
      .filter((category) => category.id !== categoryId)
      .map((category) =>
        category.parentId === categoryId
          ? { ...category, parentId: fallbackParentId }
          : category
      ),
    bookmarks: library.bookmarks.map((bookmark) =>
      bookmark.categoryId === categoryId
        ? { ...bookmark, categoryId: fallbackParentId }
        : bookmark
    ),
  };
}

function recursiveDelete(library: LibraryData, categoryId: string): LibraryData {
  const subtree = collectCategorySubtreeIds(library.categories, categoryId);
  return {
    ...library,
    categories: library.categories.filter((category) => !subtree.has(category.id)),
    bookmarks: library.bookmarks.map((bookmark) =>
      bookmark.categoryId !== null && subtree.has(bookmark.categoryId)
        ? { ...bookmark, categoryId: null }
        : bookmark
    ),
  };
}

/**
 * 删除分类：移动后删 / 递归删（需二次确认） / 取消。
 * REQ-010-AC-003~005
 */
export function deleteCategory(
  library: LibraryData,
  input: DeleteCategoryInput
): CommandResult<LibraryData> {
  if (input.strategy === 'cancel') {
    return {
      ok: true,
      value: library,
      events: [],
    };
  }

  if (!library.categories.some((category) => category.id === input.id)) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.categoryNotFound } };
  }

  if (input.strategy === 'recursive-delete' && !input.recursiveConfirmed) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.categoryRecursiveConfirmRequired } };
  }

  const value =
    input.strategy === 'move-then-delete'
      ? moveThenDelete(library, input.id)
      : recursiveDelete(library, input.id);

  return {
    ok: true,
    value,
    events: [
      {
        type: DOMAIN_CONFIG.events.categoryDeleted,
        payload: { categoryId: input.id, strategy: input.strategy },
      },
    ],
  };
}
