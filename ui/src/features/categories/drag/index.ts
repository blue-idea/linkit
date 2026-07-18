import {
  wouldCreateCategoryCycle,
} from '../../../domain/categories';
import type { LibraryData } from '../../../domain/library';
import { DOMAIN_CONFIG } from '../../../config/domain';

/**
 * 非法分类移动错误（拖入自身或后代）。
 * REQ-011-AC-002
 */
export class InvalidCategoryMoveError extends Error {
  readonly code = 'INVALID_CATEGORY_MOVE';

  constructor(message = 'Cannot move a category into itself or its descendants') {
    super(message);
    this.name = 'InvalidCategoryMoveError';
  }
}

/**
 * 将分类挂到新父级；非法目标抛出 InvalidCategoryMoveError。
 * REQ-011-AC-001 / REQ-011-AC-002
 */
export function moveCategoryUnder(
  library: LibraryData,
  input: { categoryId: string; newParentId: string | null }
): LibraryData {
  if (!library.categories.some((category) => category.id === input.categoryId)) {
    throw new InvalidCategoryMoveError(DOMAIN_CONFIG.errors.categoryNotFound.message);
  }
  if (
    input.newParentId !== null &&
    !library.categories.some((category) => category.id === input.newParentId)
  ) {
    throw new InvalidCategoryMoveError(DOMAIN_CONFIG.errors.categoryParentInvalid.message);
  }
  if (
    wouldCreateCategoryCycle(library.categories, {
      categoryId: input.categoryId,
      newParentId: input.newParentId,
    })
  ) {
    throw new InvalidCategoryMoveError();
  }

  return {
    ...library,
    categories: library.categories.map((category) =>
      category.id === input.categoryId
        ? { ...category, parentId: input.newParentId }
        : category
    ),
  };
}

/**
 * 将书签归入分类并返回英文成功提示。
 * REQ-011-AC-003
 */
export function assignBookmarkToCategory(
  library: LibraryData,
  input: { bookmarkId: string; categoryId: string }
): { library: LibraryData; message: string } {
  if (!library.bookmarks.some((bookmark) => bookmark.id === input.bookmarkId)) {
    throw new Error(DOMAIN_CONFIG.errors.bookmarkNotFound.message);
  }
  if (!library.categories.some((category) => category.id === input.categoryId)) {
    throw new Error(DOMAIN_CONFIG.errors.categoryNotFound.message);
  }

  const categoryName =
    library.categories.find((category) => category.id === input.categoryId)?.name ?? 'category';

  return {
    library: {
      ...library,
      bookmarks: library.bookmarks.map((bookmark) =>
        bookmark.id === input.bookmarkId
          ? { ...bookmark, categoryId: input.categoryId }
          : bookmark
      ),
    },
    message: `Moved to category “${categoryName}”`,
  };
}

/**
 * 键盘可达的分类移动目标解析（等价于拖拽落点校验）。
 * REQ-024-AC-006 / REQ-011-AC-002
 */
export function resolveKeyboardCategoryMove(input: {
  categories: LibraryData['categories'];
  categoryId: string;
  targetParentId: string | null;
}): { ok: true; newParentId: string | null } | { ok: false; reason: string } {
  if (
    wouldCreateCategoryCycle(input.categories, {
      categoryId: input.categoryId,
      newParentId: input.targetParentId,
    })
  ) {
    return { ok: false, reason: 'INVALID_CATEGORY_MOVE' };
  }
  if (
    input.targetParentId !== null &&
    !input.categories.some((category) => category.id === input.targetParentId)
  ) {
    return { ok: false, reason: 'INVALID_CATEGORY_MOVE' };
  }
  return { ok: true, newParentId: input.targetParentId };
}
