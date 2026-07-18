import type { LibraryData } from '../../domain/library';

export interface LibraryRecommendation {
  bookmarkId: string;
  score: number;
  reasons: Array<'shared-tag' | 'shared-collection' | 'shared-category'>;
}

export interface ThemeGapSuggestion extends LibraryRecommendation {
  collectionId: string;
}

function overlapCount(left: string[], right: string[]): number {
  const values = new Set(left);
  return right.reduce((count, value) => count + (values.has(value) ? 1 : 0), 0);
}

/** 仅依据当前资料库实体计算推荐，不访问网络或生成外部 URL。 */
export function recommendLibraryBookmarks(
  library: LibraryData,
  anchorId: string,
  limit = 8,
): LibraryRecommendation[] {
  const anchor = library.bookmarks.find(({ id }) => id === anchorId);
  if (!anchor) return [];

  return library.bookmarks
    .filter(({ id }) => id !== anchorId)
    .map((bookmark) => {
      const sharedTags = overlapCount(anchor.tagIds, bookmark.tagIds);
      const sharedCollections = overlapCount(anchor.collectionIds, bookmark.collectionIds);
      const sharedCategory = anchor.categoryId !== null && anchor.categoryId === bookmark.categoryId;
      const reasons: LibraryRecommendation['reasons'] = [];
      if (sharedTags > 0) reasons.push('shared-tag');
      if (sharedCollections > 0) reasons.push('shared-collection');
      if (sharedCategory) reasons.push('shared-category');
      return {
        bookmarkId: bookmark.id,
        score: Math.min(1, sharedTags * 0.35 + sharedCollections * 0.45 + (sharedCategory ? 0.2 : 0)),
        reasons,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.bookmarkId.localeCompare(right.bookmarkId))
    .slice(0, limit);
}

/** 为每个主题寻找尚未加入、但与现有成员存在规则关联的候选。 */
export function suggestThemeGaps(library: LibraryData, limitPerCollection = 3): ThemeGapSuggestion[] {
  const suggestions: ThemeGapSuggestion[] = [];
  for (const collection of [...library.collections].sort((a, b) => a.id.localeCompare(b.id))) {
    const members = collection.bookmarkIds
      .map((id) => library.bookmarks.find((bookmark) => bookmark.id === id))
      .filter((bookmark): bookmark is LibraryData['bookmarks'][number] => Boolean(bookmark));
    if (members.length === 0) continue;
    const memberTagIds = [...new Set(members.flatMap(({ tagIds }) => tagIds))];
    const memberCategoryIds = new Set(members.map(({ categoryId }) => categoryId).filter(Boolean));
    const memberIds = new Set(collection.bookmarkIds);
    const candidates = library.bookmarks
      .filter(({ id }) => !memberIds.has(id))
      .map((bookmark) => {
        const sharedTags = overlapCount(memberTagIds, bookmark.tagIds);
        const sharedCategory = bookmark.categoryId !== null && memberCategoryIds.has(bookmark.categoryId);
        const reasons: LibraryRecommendation['reasons'] = [];
        if (sharedTags > 0) reasons.push('shared-tag');
        if (sharedCategory) reasons.push('shared-category');
        return {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
          score: Math.min(1, sharedTags * 0.45 + (sharedCategory ? 0.3 : 0)),
          reasons,
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.bookmarkId.localeCompare(b.bookmarkId))
      .slice(0, limitPerCollection);
    suggestions.push(...candidates);
  }
  return suggestions;
}

export { ExploreDialog } from './ExploreDialog';
