import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed } from '../../../testing/factories';
import { applyCollectionSuggestion, collectionSuggestionSchema } from './index';

const preview = {
  name: 'Frontend Research',
  description: 'A focused reading list',
  suggestedTags: ['frontend', 'research'],
  bookmarkIds: ['bookmark-reference', 'bookmark-health-changed'],
};

describe('AI 主题建议', () => {
  test('响应 Schema 拒绝资料库之外的成员 ID', () => {
    const result = collectionSuggestionSchema(['bookmark-reference']).safeParse(preview);
    expect(result.success).toBe(false);
  });

  test('取消建议时资料库保持零副作用', () => {
    const library = createCoreJourneySeed().library.data;
    const before = structuredClone(library);
    const result = applyCollectionSuggestion(library, {
      preview,
      confirmed: false,
      acceptedBookmarkIds: preview.bookmarkIds,
    });
    expect(result).toEqual({ ok: true, value: library, events: [] });
    expect(library).toStrictEqual(before);
  });

  test('确认后仅创建选定主题成员并保持双向关系', () => {
    const library = createCoreJourneySeed().library.data;
    const result = applyCollectionSuggestion(library, {
      preview,
      confirmed: true,
      acceptedBookmarkIds: ['bookmark-health-changed'],
      idFactory: () => 'collection-ai',
      now: () => '2026-07-19T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collections[result.value.collections.length - 1]).toMatchObject({
      id: 'collection-ai', name: 'Frontend Research',
      description: 'A focused reading list', bookmarkIds: ['bookmark-health-changed'],
    });
    expect(result.value.bookmarks.find(({ id }) => id === 'bookmark-health-changed')?.collectionIds)
      .toContain('collection-ai');
    expect(result.value.bookmarks.find(({ id }) => id === 'bookmark-reference')?.collectionIds)
      .not.toContain('collection-ai');
  });
});
