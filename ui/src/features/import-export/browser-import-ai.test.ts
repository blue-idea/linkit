import { describe, expect, test, vi } from 'vitest';
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
    expect(result.updatedBookmarkIds).toEqual(['bookmark-react']);

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
});
