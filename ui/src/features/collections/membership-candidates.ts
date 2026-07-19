/**
 * 主题成员候选过滤与多选（REQ-012-AC-007）。
 * 纯函数：不修改资料库；确认前零副作用由调用方保证。
 */

export type MembershipCandidate = {
  id: string;
  title: string;
  url: string;
  collectionIds: string[];
};

/** 排除已成员，并按 title/URL 不区分大小写搜索。 */
export function listMembershipCandidates(input: {
  bookmarks: MembershipCandidate[];
  collectionId: string;
  query: string;
}): MembershipCandidate[] {
  const needle = input.query.trim().toLowerCase();
  return input.bookmarks.filter((bookmark) => {
    if (bookmark.collectionIds.includes(input.collectionId)) return false;
    if (!needle) return true;
    return (
      bookmark.title.toLowerCase().includes(needle)
      || bookmark.url.toLowerCase().includes(needle)
    );
  });
}

/** 切换候选多选集合，保持去重顺序。 */
export function toggleCandidateSelection(selectedIds: string[], bookmarkId: string): string[] {
  if (selectedIds.includes(bookmarkId)) {
    return selectedIds.filter((id) => id !== bookmarkId);
  }
  return [...selectedIds, bookmarkId];
}
