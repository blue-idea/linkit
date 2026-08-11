import { describe, expect, test, vi } from 'vitest';
import { BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY } from '../../config/browser-bookmarks';
import type { AppSettings, LibraryData } from '../../types';
import {
  enrichImportedBookmarksWithAI,
  mergeBrowserImportAIResult,
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
  test('REQ-035-AC-008 导入后即使提供 AI client 也不发起 AI 请求，且 metadata 不修改分类或标签', async () => {
    const analyzeBookmark = vi.fn(async ({ url }: { url: string }) => {
      return {
        title: `AI title for ${url}`,
        description: 'AI description',
        summary: 'AI summary',
        suggestedCategoryId: 'category-frontend',
        suggestedTags: ['React', 'Docs'],
      };
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

    expect(analyzeBookmark).not.toHaveBeenCalled();
    expect(fetchMetadata).toHaveBeenCalledTimes(2);
    expect(result.updatedBookmarkIds).toEqual(['bookmark-react', 'bookmark-vite']);

    const reactBookmark = result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-react');
    const viteBookmark = result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-vite');
    const existingBookmark = result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-existing');

    expect(reactBookmark).toMatchObject({
      categoryId: '',
      tags: [],
      title: 'Metadata for https://react.dev/',
      description: 'Metadata description',
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
    expect(result.library.tags).toEqual([{ id: 'tag-react', label: 'React', color: 'blue' }]);
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

  // REQ-035-AC-010：导入增强通过阶段和 completed/total 回调报告进度。
  test('导入增强按 metadata、complete 阶段报告进度', async () => {
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
      { stage: 'complete', completed: 2, total: 2 },
    ]));
  });

  test('REQ-035-AC-008 metadata 合并不得覆盖导入后的分类和标签', () => {
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
      { id: 'category-user', name: 'User category', icon: 'Folder', parentId: null, color: 'violet' },
    ];
    current.tags = [{ id: 'tag-user', label: 'User tag', color: 'blue' }];
    const result = mergeBrowserImportAIResult(current, {
      library: {
        ...current,
        bookmarks: [{
          ...current.bookmarks[0],
          title: 'Metadata title',
          description: 'Metadata description',
          categoryId: 'category-folder',
          tags: ['tag-ai'],
        }],
        tags: [{ id: 'tag-user', label: 'User tag', color: 'blue' }],
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
      tags: ['tag-user'],
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

  test('REQ-035-AC-008 配置了 AI 也不改变导入时已确定的分类和标签', async () => {
    const library = createLibrary();
    library.bookmarks[1] = {
      ...library.bookmarks[1],
      categoryId: 'category-frontend',
      tags: ['tag-react'],
    };
    const analyzeBookmark = vi.fn(async () => ({
      title: 'AI title',
      description: 'AI description',
      summary: 'AI summary',
      suggestedCategoryId: 'category-existing',
      suggestedTags: ['Docs'],
    }));

    const result = await enrichImportedBookmarksWithAI({
      library,
      importedBookmarkIds: ['bookmark-react'],
      settings: baseSettings,
      client: { analyzeBookmark },
      fetchMetadata: vi.fn(async () => ({
        ok: true as const,
        title: 'React metadata',
        description: 'React description',
        contentText: 'Metadata text',
        favicon: 'https://react.dev/favicon.ico',
      })),
    });

    expect(analyzeBookmark).not.toHaveBeenCalled();
    expect(result.library.bookmarks.find((bookmark) => bookmark.id === 'bookmark-react')).toMatchObject({
      categoryId: 'category-frontend',
      tags: ['tag-react'],
      title: 'React metadata',
      description: 'React description',
      favicon: 'https://react.dev/favicon.ico',
    });
    expect(result.library.tags).toEqual([{ id: 'tag-react', label: 'React', color: 'blue' }]);
  });
});
