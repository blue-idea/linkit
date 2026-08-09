import { describe, expect, test, vi } from 'vitest';
import { BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY } from '../../config/browser-bookmarks';
import type { AppSettings, LibraryData } from '../../types';
import {
  enrichImportedBookmarksWithAI,
  mergeBrowserImportAIResult,
  shouldEnrichBrowserImportWithAI,
} from './browser-import-ai';

const baseSettings: AppSettings = {
  storageMode: 'local',
  theme: 'midnight',
  locale: 'en',
  ai: {
    apiBase: 'https://api.example.test/v1',
    model: 'gpt-4o-mini',
  },
  aiConsent: {
    apiBase: 'https://api.example.test/v1',
    grantedAt: '2026-08-08T08:00:00.000Z',
  },
  uiSize: 'medium',
};

function createLibrary(): LibraryData {
  return {
    bookmarks: [
      {
        id: 'bookmark-existing',
        title: 'Existing bookmark',
        url: 'https://existing.example.test/',
        domain: 'existing.example.test',
        favicon: 'E',
        faviconColor: 'blue',
        description: '',
        notes: '',
        tags: [],
        categoryId: 'category-existing',
        collectionIds: [],
        createdAt: '2026-08-08T08:00:00.000Z',
        lastVisitedAt: null,
        visitCount: 0,
        starred: false,
        pinned: false,
        readStatus: 'unread',
      },
      {
        id: 'bookmark-react',
        title: 'React',
        url: 'https://react.dev/',
        domain: 'react.dev',
        favicon: 'R',
        faviconColor: 'blue',
        description: '',
        notes: '',
        tags: [],
        categoryId: '',
        collectionIds: [],
        createdAt: '2026-08-08T08:00:00.000Z',
        lastVisitedAt: null,
        visitCount: 0,
        starred: false,
        pinned: false,
        readStatus: 'unread',
      },
      {
        id: 'bookmark-vite',
        title: 'Vite',
        url: 'https://vite.dev/',
        domain: 'vite.dev',
        favicon: 'V',
        faviconColor: 'blue',
        description: '',
        notes: '',
        tags: [],
        categoryId: '',
        collectionIds: [],
        createdAt: '2026-08-08T08:00:00.000Z',
        lastVisitedAt: null,
        visitCount: 0,
        starred: false,
        pinned: false,
        readStatus: 'unread',
      },
    ],
    categories: [
      { id: 'category-existing', name: 'Existing', icon: 'Folder', parentId: null, color: 'blue' },
      { id: 'category-frontend', name: 'Frontend', icon: 'Folder', parentId: null, color: 'blue' },
    ],
    collections: [],
    tags: [
      { id: 'tag-react', label: 'React', color: 'blue' },
    ],
  };
}

describe('browser-import-ai', () => {
  test('REQ-035-AC-004 导入后仅整理新增书签，优先复用现有标签且每条最多 3 个标签', async () => {
    const analyzeBookmark = vi.fn(async ({ url }: { url: string }) => {
      if (url === 'https://react.dev/') {
        return {
          title: 'React',
          description: 'React docs',
          summary: 'Official React docs',
          suggestedCategoryId: 'category-frontend',
          suggestedTags: ['React', 'Docs', 'Frontend', 'Guides'],
        };
      }

      throw { code: 'AI_TIMEOUT', message: 'AI request timed out' };
    });
    const fetchMetadata = vi.fn(async (url: string) => ({
      ok: true as const,
      title: `Metadata for ${url}`,
      description: 'Metadata description',
      contentText: 'Metadata body',
    }));

    const result = await enrichImportedBookmarksWithAI({
      library: createLibrary(),
      importedBookmarkIds: ['bookmark-react', 'bookmark-vite'],
      settings: baseSettings,
      client: { analyzeBookmark },
      fetchMetadata,
      idFactory: (() => {
        let index = 0;
        return () => `ai-${++index}`;
      })(),
    });

    expect(analyzeBookmark).toHaveBeenCalledTimes(2);
    expect(fetchMetadata).toHaveBeenCalledTimes(2);
    expect(result.updatedBookmarkIds).toEqual(['bookmark-react', 'bookmark-vite']);

    const reactBookmark = result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-react');
    const viteBookmark = result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-vite');
    const existingBookmark = result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-existing');

    expect(reactBookmark).toMatchObject({
      categoryId: 'category-frontend',
      tags: ['tag-react', 'tag-ai-1', 'tag-ai-2'],
    });
    expect(viteBookmark).toMatchObject({
      categoryId: '',
      tags: [],
      title: 'Metadata for https://vite.dev/',
      description: 'Metadata description',
    });
    expect(existingBookmark).toMatchObject({
      categoryId: 'category-existing',
      tags: [],
    });
    expect(result.library.tags).toEqual([
      { id: 'tag-react', label: 'React', color: 'blue' },
      { id: 'tag-ai-1', label: 'Docs', color: 'gray' },
      { id: 'tag-ai-2', label: 'Frontend', color: 'gray' },
    ]);
  });

  // REQ-035-AC-007：AI 未配置时仍必须为每一条新增书签获取并补全 metadata。
  test('AI 未配置时仍获取 metadata 并补全标题、描述和 favicon', async () => {
    const library = createLibrary();
    const settings: AppSettings = {
      ...baseSettings,
      ai: { apiBase: '', model: '' },
      aiConsent: null,
    };
    const analyzeBookmark = vi.fn();
    const fetchMetadata = vi.fn(async (url: string) => ({
      ok: true as const,
      title: `Page title for ${url}`,
      description: 'Page description',
      contentText: 'Page content',
      favicon: 'https://example.com/favicon.ico',
      faviconDataUrl: 'data:image/png;base64,ignored',
    }));

    const result = await enrichImportedBookmarksWithAI({
      library,
      importedBookmarkIds: ['bookmark-react', 'bookmark-vite'],
      settings,
      client: { analyzeBookmark },
      fetchMetadata,
    });

    expect(fetchMetadata).toHaveBeenCalledTimes(2);
    expect(analyzeBookmark).not.toHaveBeenCalled();
    expect(result.updatedBookmarkIds).toEqual(['bookmark-react', 'bookmark-vite']);
    expect(result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-react')).toMatchObject({
      title: 'Page title for https://react.dev/',
      description: 'Page description',
      favicon: 'https://example.com/favicon.ico',
    });
  });

  // REQ-035-AC-007：单条 metadata 失败不得中断其他书签处理。
  test('单条 metadata 失败时保留原值并继续处理其他书签', async () => {
    const fetchMetadata = vi.fn(async (url: string) => {
      if (url === 'https://react.dev/') {
        return {
          ok: false as const,
          code: 'METADATA_FETCH_FAILED',
          message: 'Metadata request failed',
        };
      }
      return {
        ok: true as const,
        title: 'Vite metadata',
        description: 'Vite description',
        contentText: 'Vite content',
        favicon: 'https://vite.dev/icon.ico',
      };
    });

    const result = await enrichImportedBookmarksWithAI({
      library: createLibrary(),
      importedBookmarkIds: ['bookmark-react', 'bookmark-vite'],
      settings: { ...baseSettings, ai: { apiBase: '', model: '' }, aiConsent: null },
      client: { analyzeBookmark: vi.fn() },
      fetchMetadata,
    });

    expect(result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-react')).toMatchObject({
      title: 'React',
      description: '',
      favicon: 'R',
    });
    expect(result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-vite')).toMatchObject({
      title: 'Vite metadata',
      description: 'Vite description',
      favicon: 'https://vite.dev/icon.ico',
    });
  });

  // REQ-035-AC-008：metadata contentText 必须传给 AI 作为分类/标签上下文。
  test('AI 请求包含 metadata contentText 上下文', async () => {
    const analyzeBookmark = vi.fn(async () => ({
      title: 'React',
      description: '',
      summary: 'React docs',
      suggestedCategoryId: null,
      suggestedTags: [],
    }));
    const fetchMetadata = vi.fn(async () => ({
      ok: true as const,
      title: 'React metadata',
      description: 'React description',
      contentText: 'Full page text used for AI',
      favicon: null,
    }));

    await enrichImportedBookmarksWithAI({
      library: createLibrary(),
      importedBookmarkIds: ['bookmark-react'],
      settings: baseSettings,
      client: { analyzeBookmark },
      fetchMetadata,
    });

    expect(analyzeBookmark).toHaveBeenCalledWith(expect.objectContaining({
      contentText: 'Full page text used for AI',
      title: 'React metadata',
      description: 'React description',
    }));
  });

  // REQ-035-AC-010：导入增强通过阶段和 completed/total 回调报告进度。
  test('导入增强按 metadata、ai、complete 阶段报告进度', async () => {
    const progress: Array<{ stage: string; completed: number; total: number }> = [];
    const input = {
      library: createLibrary(),
      importedBookmarkIds: ['bookmark-react', 'bookmark-vite'],
      settings: baseSettings,
      client: {
        analyzeBookmark: vi.fn(async () => ({
          title: '', description: '', summary: 'ok', suggestedCategoryId: null, suggestedTags: [],
        })),
      },
      fetchMetadata: vi.fn(async () => ({
        ok: true as const, title: '', description: '', contentText: '', favicon: null,
      })),
      onProgress: (value: { stage: string; completed: number; total: number }) => progress.push(value),
    };

    await enrichImportedBookmarksWithAI(input);

    expect(progress).toEqual(expect.arrayContaining([
      { stage: 'metadata', completed: 0, total: 2 },
      { stage: 'metadata', completed: 2, total: 2 },
      { stage: 'ai', completed: 0, total: 2 },
      { stage: 'ai', completed: 2, total: 2 },
      { stage: 'complete', completed: 2, total: 2 },
    ]));
  });

  test('AI 未授权时应直接跳过整理且不发起请求', async () => {
    const analyzeBookmark = vi.fn();
    const library = createLibrary();
    const settings: AppSettings = {
      ...baseSettings,
      aiConsent: null,
    };

    expect(shouldEnrichBrowserImportWithAI(settings, ['bookmark-react'])).toBe(false);

    const result = await enrichImportedBookmarksWithAI({
      library,
      importedBookmarkIds: ['bookmark-react'],
      settings,
      client: { analyzeBookmark },
      fetchMetadata: vi.fn(),
    });

    expect(analyzeBookmark).not.toHaveBeenCalled();
    expect(result.updatedBookmarkIds).toEqual([]);
    expect(result.library).toBe(library);
  });

  test('REQ-014-AC-003 标签候选存在歧义时不应错误复用第一个标签', async () => {
    const analyzeBookmark = vi.fn(async () => ({
      title: 'React',
      description: '',
      summary: 'React documentation',
      suggestedCategoryId: null,
      suggestedTags: ['machine_learning'],
    }));
    const library = createLibrary();
    library.tags = [
      { id: 'tag-ml-a', label: 'Machine Learning', color: 'blue' },
      { id: 'tag-ml-b', label: 'Machine-Learning', color: 'violet' },
    ];

    const result = await enrichImportedBookmarksWithAI({
      library,
      importedBookmarkIds: ['bookmark-react'],
      settings: baseSettings,
      client: { analyzeBookmark },
      fetchMetadata: vi.fn(async () => ({
        ok: true as const,
        title: 'React',
        description: '',
        contentText: '',
      })),
      idFactory: () => 'new-tag',
    });

    const bookmark = result.library.bookmarks.find((item) => item.id === 'bookmark-react');
    expect(bookmark?.tags).toEqual(['tag-new-tag']);
    expect(result.library.tags).toContainEqual({
      id: 'tag-new-tag',
      label: 'machine_learning',
      color: 'gray',
    });
    expect(bookmark?.tags).not.toContain('tag-ml-a');
    expect(bookmark?.tags).not.toContain('tag-ml-b');
  });

  test('REQ-035-AC-004 AI 合并只更新分类和标签，不覆盖导入后的用户编辑', () => {
    const current = createLibrary();
    current.bookmarks = [{
      ...current.bookmarks[0],
      id: 'bookmark-react',
      title: 'User edited title',
      url: 'https://react.dev/',
      domain: 'react.dev',
      description: 'User edited description',
      categoryId: 'category-user',
      tags: ['tag-user'],
    }];
    current.categories = [
      { id: 'category-folder', name: 'Imported folder', icon: 'Folder', parentId: null, color: 'blue' },
      { id: 'category-ai', name: 'AI category', icon: 'Folder', parentId: null, color: 'green' },
      { id: 'category-user', name: 'User category', icon: 'Folder', parentId: null, color: 'violet' },
    ];
    current.tags = [{ id: 'tag-user', label: 'User tag', color: 'blue' }];
    const result = mergeBrowserImportAIResult(current, {
      library: {
        ...current,
        bookmarks: [{
          ...current.bookmarks[0],
          title: 'Old AI snapshot title',
          description: 'Old AI snapshot description',
          categoryId: 'category-ai',
          tags: ['tag-ai'],
        }],
        tags: [
          { id: 'tag-user', label: 'User tag', color: 'blue' },
          { id: 'tag-ai', label: 'AI tag', color: 'gray' },
        ],
      },
      updatedBookmarkIds: ['bookmark-react'],
      baseLibrary: {
        ...current,
        bookmarks: [{
          ...current.bookmarks[0],
          title: 'Imported title',
          description: '',
          categoryId: 'category-folder',
          tags: [],
        }],
        tags: [],
      },
    });

    expect(result.bookmarks[0]).toMatchObject({
      title: 'User edited title',
      description: 'User edited description',
      categoryId: 'category-user',
      tags: ['tag-user', 'tag-ai'],
    });
  });

  // DATA-INV-019：用户在 enrichment 期间修改 favicon 时，metadata 结果不得覆盖用户值。
  test('metadata 合并保护用户编辑的标题、描述和 favicon', () => {
    const current = createLibrary();
    current.bookmarks = [{
      ...current.bookmarks[1],
      title: 'User title',
      description: 'User description',
      favicon: 'U',
    }];
    const result = mergeBrowserImportAIResult(current, {
      library: {
        ...current,
        bookmarks: [{
          ...current.bookmarks[0],
          title: 'Metadata title',
          description: 'Metadata description',
          favicon: 'https://example.com/favicon.ico',
          categoryId: '',
          tags: [],
        }],
      },
      updatedBookmarkIds: ['bookmark-react'],
      baseLibrary: {
        ...current,
        bookmarks: [{
          ...current.bookmarks[0],
          title: 'React',
          description: '',
          favicon: 'R',
          categoryId: '',
          tags: [],
        }],
      },
    });

    expect(result.bookmarks[0]).toMatchObject({
      title: 'User title',
      description: 'User description',
      favicon: 'U',
    });
  });

  // REQ-035-AC-011：metadata 请求必须受控并发，不能逐条串行等待。
  test('多条书签 metadata 使用受控并发且不超过配置上限', async () => {
    const library = createLibrary();
    let active = 0;
    let maxActive = 0;
    const fetchMetadata = vi.fn(async (url: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 8));
      active -= 1;
      return {
        ok: true as const,
        title: `Metadata ${url}`,
        description: 'Concurrent metadata',
        contentText: 'Concurrent content',
      };
    });

    const result = await enrichImportedBookmarksWithAI({
      library,
      importedBookmarkIds: ['bookmark-react', 'bookmark-vite', 'bookmark-existing'],
      settings: { ...baseSettings, ai: { apiBase: '', model: '' }, aiConsent: null },
      fetchMetadata,
    });

    expect(fetchMetadata).toHaveBeenCalledTimes(3);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY);
    expect(result.updatedBookmarkIds).toEqual([
      'bookmark-react',
      'bookmark-vite',
      'bookmark-existing',
    ]);
  });

  // REQ-035-AC-011：并发 AI 结果必须按输入顺序串行应用，避免 Tag ID/标签状态竞态。
  test('AI 并发返回顺序变化时仍按导入顺序创建和应用标签', async () => {
    const library = createLibrary();
    let active = 0;
    let maxActive = 0;
    const analyzeBookmark = vi.fn(async ({ url }: { url: string }) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, url.includes('vite') ? 1 : 20));
      active -= 1;
      return {
        title: url.includes('vite') ? 'Vite' : 'React',
        description: '',
        summary: 'AI result',
        suggestedCategoryId: null,
        suggestedTags: [url.includes('vite') ? 'Vite tag' : 'React tag'],
      };
    });

    const result = await enrichImportedBookmarksWithAI({
      library,
      importedBookmarkIds: ['bookmark-react', 'bookmark-vite'],
      settings: baseSettings,
      client: { analyzeBookmark },
      fetchMetadata: vi.fn(async (url: string) => ({
        ok: true as const,
        title: url.includes('vite') ? 'Vite' : 'React',
        description: '',
        contentText: `Metadata for ${url}`,
      })),
      idFactory: (() => {
        let index = 0;
        return () => `ordered-${++index}`;
      })(),
    });

    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY);
    expect(result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-react')?.tags)
      .toEqual(['tag-ordered-1']);
    expect(result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-vite')?.tags)
      .toEqual(['tag-ordered-2']);
    expect(result.library.tags.map((tag) => tag.label)).toEqual(['React', 'React tag', 'Vite tag']);
  });
});
