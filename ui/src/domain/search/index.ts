/** Spotlight 关键词搜索投影（REQ-017-AC-002） */

export type SearchableBookmark = {
  id: string;
  title: string;
  description: string;
  domain: string;
  notes: string;
};

export type SearchHit = {
  id: string;
  score: number;
};

const FIELD_WEIGHT = {
  title: 100,
  domain: 50,
  description: 30,
  notes: 20,
} as const;

function scoreBookmark(bookmark: SearchableBookmark, query: string): number {
  let score = 0;
  if (bookmark.title.toLowerCase().includes(query)) score += FIELD_WEIGHT.title;
  if (bookmark.domain.toLowerCase().includes(query)) score += FIELD_WEIGHT.domain;
  if (bookmark.description.toLowerCase().includes(query)) score += FIELD_WEIGHT.description;
  if (bookmark.notes.toLowerCase().includes(query)) score += FIELD_WEIGHT.notes;
  return score;
}

/**
 * 在标题、描述、域名、备注中做不区分大小写匹配，并按字段权重排序。
 */
export function searchBookmarks(
  rawQuery: string,
  bookmarks: SearchableBookmark[],
  limit = 50
): SearchHit[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  return bookmarks
    .map((bookmark) => ({ id: bookmark.id, score: scoreBookmark(bookmark, query) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}
