import { describe, expect, test } from 'vitest';
import { createBookmark, createTag } from '../../testing/factories';
import type { Bookmark } from '../../types';
import type { Tag } from '../../types';

async function loadPresenter() {
  return import(/* @vite-ignore */ './presenter').catch(() => null);
}

describe('BookmarkPresenter 共享投影', () => {
  // REQ-015：三视图共享同一元数据投影，保证标题/域名/标签一致。
  test('presentBookmark 输出三视图共用的可读元数据', async () => {
    const mod = await loadPresenter();
    expect(mod?.presentBookmark).toBeTypeOf('function');
    if (!mod?.presentBookmark) throw new Error('presentBookmark is required');

    const tags = [
      { id: 't-css', label: 'CSS', color: 'blue' as const },
      { id: 't-doc', label: '文档', color: 'gray' as const },
    ];
    // UI Bookmark 使用 tags 字段
    const bookmark: Bookmark = {
      id: 'b-1',
      title: 'CSS Tricks',
      url: 'https://css-tricks.com',
      domain: 'css-tricks.com',
      favicon: 'C',
      faviconColor: 'blue',
      description: 'CSS articles',
      notes: '',
      tags: ['t-css', 't-doc'],
      categoryId: 'c-1',
      collectionIds: [],
      createdAt: '2026-07-01T00:00:00.000Z',
      lastVisitedAt: null,
      visitCount: 3,
      starred: true,
      pinned: false,
      thumbnail: 'blue',
      health: 'ok',
      aiSummary: 'A CSS resource site',
      aiSuggestedTags: [],
      spark: [],
    };

    const presented = mod.presentBookmark(bookmark, tags);
    expect(presented).toMatchObject({
      id: 'b-1',
      title: 'CSS Tricks',
      domain: 'css-tricks.com',
      description: 'CSS articles',
      summary: 'A CSS resource site',
      starred: true,
      pinned: false,
      health: 'ok',
      visitCount: 3,
      thumbnail: 'blue',
    });
    expect(presented.tags).toEqual([
      { id: 't-css', label: 'CSS', color: 'blue' },
      { id: 't-doc', label: '文档', color: 'gray' },
    ]);
  });

  // 列表/卡片摘要：优先 aiSummary，缺失时回退 description，避免有描述却空白。
  test('presentBookmark 在无 aiSummary 时 summary 回退为 description', async () => {
    const mod = await loadPresenter();
    expect(mod?.presentBookmark).toBeTypeOf('function');
    if (!mod?.presentBookmark) throw new Error('presentBookmark is required');

    const bookmark: Bookmark = {
      id: 'b-desc',
      title: '哔哩哔哩',
      url: 'https://www.bilibili.com/',
      domain: 'www.bilibili.com',
      favicon: 'B',
      faviconColor: 'coral',
      description: '国内知名的视频弹幕网站',
      notes: '',
      tags: [],
      categoryId: 'c-1',
      collectionIds: [],
      createdAt: '2026-07-01T00:00:00.000Z',
      lastVisitedAt: null,
      visitCount: 0,
      starred: false,
      pinned: false,
      thumbnail: undefined,
      health: 'ok',
      aiSummary: '',
      aiSuggestedTags: [],
      spark: [],
    };

    const presented = mod.presentBookmark(bookmark, []);
    expect(presented.description).toBe('国内知名的视频弹幕网站');
    expect(presented.summary).toBe('国内知名的视频弹幕网站');
  });

  test('presentBookmarks 保持顺序并映射全部条目', async () => {
    const mod = await loadPresenter();
    expect(mod?.presentBookmarks).toBeTypeOf('function');
    if (!mod?.presentBookmarks) throw new Error('presentBookmarks is required');

    const tags = [createTag({ id: 'tag-reference', label: 'Reference', color: 'blue' })];
    // factories create domain bookmarks — map to UI shape
    const domain = createBookmark({ id: 'bm-a', title: 'A' });
    const ui: Bookmark = {
      id: domain.id,
      title: domain.title,
      url: domain.url,
      domain: domain.domain,
      favicon: 'A',
      faviconColor: 'blue',
      description: domain.description,
      notes: domain.notes,
      tags: domain.tagIds,
      categoryId: domain.categoryId ?? '',
      collectionIds: domain.collectionIds,
      createdAt: domain.createdAt,
      lastVisitedAt: domain.lastVisitedAt,
      visitCount: domain.visitCount,
      starred: domain.starred,
      pinned: domain.pinned,
      thumbnail: undefined,
      health: domain.health,
      aiSummary: domain.aiSummary,
      aiSuggestedTags: domain.aiSuggestedTags,
      spark: [],
    };

    const list = mod.presentBookmarks([ui], tags as Tag[]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('bm-a');
  });
});
