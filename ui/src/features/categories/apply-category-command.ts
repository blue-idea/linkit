import {
  createCategory as createCategoryCommand,
  deleteCategory as deleteCategoryCommand,
  renameCategory as renameCategoryCommand,
  setCategoryIcon as setCategoryIconCommand,
  type DeleteCategoryStrategy,
} from '../../domain/categories';
import type { LibraryData } from '../../domain/library';
import type { Bookmark, Category, Collection, Tag } from '../../types';

/**
 * 将 UI 实体投影为领域 LibraryData，供分类命令使用。
 * REQ-010
 */
export function toCategoryLibrary(input: {
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
}): LibraryData {
  return {
    tags: input.tags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      color: tag.color,
    })),
    categories: input.categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      parentId: category.parentId,
      color: category.color ?? 'gray',
    })),
    collections: input.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      emoji: collection.emoji,
      color: collection.color,
      description: collection.description,
      bookmarkIds: [...collection.bookmarkIds],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })),
    bookmarks: input.bookmarks.map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url.startsWith('http') ? bookmark.url : `https://${bookmark.url}`,
      domain: bookmark.domain || 'unknown',
      favicon: null,
      description: bookmark.description ?? '',
      notes: bookmark.notes ?? '',
      tagIds: [...(bookmark.tags ?? [])],
      categoryId: bookmark.categoryId ? bookmark.categoryId : null,
      collectionIds: [...(bookmark.collectionIds ?? [])],
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.createdAt,
      lastVisitedAt: bookmark.lastVisitedAt,
      visitCount: bookmark.visitCount,
      starred: bookmark.starred,
      pinned: bookmark.pinned,
      readStatus: bookmark.readStatus ?? 'unread',
      health: bookmark.health ?? 'ok',
      healthCheckedAt: null,
      healthHttpStatus: null,
      healthFingerprint: null,
      healthErrorCode: null,
      aiSummary: bookmark.aiSummary ?? '',
      aiSuggestedTags: [...(bookmark.aiSuggestedTags ?? [])],
      thumbnail: bookmark.thumbnail ?? null,
    })),
  };
}

export function applyCategoryLibraryResult(
  result: LibraryData,
  currentBookmarks: Bookmark[],
  currentCategories: Category[]
): { bookmarks: Bookmark[]; categories: Category[] } {
  const categoryById = new Map(result.categories.map((category) => [category.id, category]));
  const bookmarkCategory = new Map(
    result.bookmarks.map((bookmark) => [bookmark.id, bookmark.categoryId])
  );

  return {
    categories: result.categories.map((category) => {
      const previous = currentCategories.find((item) => item.id === category.id);
      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        parentId: category.parentId,
        color: category.color ?? undefined,
        count: previous?.count,
      };
    }),
    bookmarks: currentBookmarks
      .filter((bookmark) => bookmarkCategory.has(bookmark.id))
      .map((bookmark) => ({
        ...bookmark,
        categoryId: bookmarkCategory.get(bookmark.id) ?? '',
      }))
      // 保留仍存在的分类引用；空字符串表示未分类
      .map((bookmark) =>
        bookmark.categoryId && !categoryById.has(bookmark.categoryId)
          ? { ...bookmark, categoryId: '' }
          : bookmark
      ),
  };
}

export function runCreateCategory(
  input: {
    bookmarks: Bookmark[];
    categories: Category[];
    collections: Collection[];
    tags: Tag[];
    name: string;
    parentId?: string | null;
  }
) {
  return createCategoryCommand(toCategoryLibrary(input), {
    name: input.name,
    parentId: input.parentId ?? null,
  });
}

export function runRenameCategory(input: {
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
  id: string;
  name: string;
}) {
  return renameCategoryCommand(toCategoryLibrary(input), {
    id: input.id,
    name: input.name,
  });
}

export function runDeleteCategory(input: {
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
  id: string;
  strategy: DeleteCategoryStrategy;
  recursiveConfirmed?: boolean;
}) {
  return deleteCategoryCommand(toCategoryLibrary(input), {
    id: input.id,
    strategy: input.strategy,
    recursiveConfirmed: input.recursiveConfirmed,
  });
}

/** fix_task 1.2：应用分类图标与颜色变更。 */
export function runSetCategoryIcon(input: {
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
  id: string;
  icon: string;
  color?: string;
}) {
  return setCategoryIconCommand(toCategoryLibrary(input), {
    id: input.id,
    icon: input.icon,
    color: input.color,
  });
}
