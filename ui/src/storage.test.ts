import { describe, expect, test } from 'vitest';
import { normalizeLocalLibrary } from './storage';

describe('normalizeLocalLibrary', () => {
  // REQ-002-AC-002：本机恢复的不完整书签须可渲染，不能因缺失 UI 字段崩溃。
  test('补齐缺失的 favicon 与 faviconColor', () => {
    const lib = normalizeLocalLibrary({
      bookmarks: [
        {
          id: 'bm-1',
          title: 'Partial Bookmark',
          url: 'https://example.test/a',
          domain: 'example.test',
          description: '',
          tags: [],
          categoryId: null,
          collectionIds: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          lastVisited: null,
          visitCount: 0,
          starred: false,
          pinned: false,
          readStatus: 'unread',
          health: 'ok',
          notes: '',
          aiSummary: '',
          aiSuggestedTags: [],
          favicon: null,
          thumbnail: null,
        } as never,
      ],
      categories: [],
      collections: [],
      tags: [],
    });

    expect(lib.bookmarks[0]?.favicon).toBe('E');
    expect(lib.bookmarks[0]?.faviconColor).toBe('blue');
  });
});
