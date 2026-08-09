import { describe, expect, test } from 'vitest';
import { CATEGORY_COLOR_CANDIDATES, CATEGORY_ICON_CANDIDATES } from '../../config/category-icons';
import type { LibraryData } from '../../types';

type PlannedBrowserHtmlModule = {
  buildBrowserBookmarkHtml?: (
    library: LibraryData,
    options: { title?: string; exportedAt: string },
  ) => string;
  parseBrowserBookmarkHtml?: (
    raw: string,
    options: {
      library: LibraryData;
      now: string;
      idFactory?: () => string;
      random?: () => number;
    },
  ) => {
    success: true;
    pendingImport: {
      kind: 'library';
      snapshot: LibraryData;
      summary: {
        mode: 'browser-bookmarks';
        folders: number;
        bookmarks: number;
        newBookmarks: number;
        skippedDuplicates: number;
      };
    };
  } | {
    success: false;
    error: {
      key: 'IMPORT_INVALID';
      message: string;
    };
  };
};

async function loadPlannedBrowserHtmlModule(): Promise<PlannedBrowserHtmlModule> {
  return import('./index') as Promise<PlannedBrowserHtmlModule>;
}

function createLibrary(overrides: Partial<LibraryData> = {}): LibraryData {
  return {
    bookmarks: [],
    categories: [],
    collections: [],
    tags: [],
    ...overrides,
  };
}

function createIdFactory(ids: string[]): () => string {
  let index = 0;
  return () => {
    const next = ids[index];
    index += 1;
    if (!next) {
      throw new Error('idFactory exhausted');
    }
    return next;
  };
}

describe('浏览器书签 HTML 导入导出', () => {
  test('REQ-035-AC-001/006 导出为兼容主流浏览器的 HTML 且不包含 Linkit 专有字段', async () => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.buildBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.buildBrowserBookmarkHtml) {
      throw new Error('buildBrowserBookmarkHtml is required');
    }

    const library = createLibrary({
      categories: [
        { id: 'cat-tech', name: 'Tech', icon: 'Folder', parentId: null, color: 'blue' },
        { id: 'cat-react', name: 'React', icon: 'Folder', parentId: 'cat-tech', color: 'green' },
      ],
      bookmarks: [
        {
          id: 'bookmark-react',
          title: 'React',
          url: 'https://react.dev/',
          domain: 'react.dev',
          favicon: 'R',
          faviconColor: 'blue',
          description: 'React docs',
          notes: 'Do not export me',
          tags: ['tag-react'],
          categoryId: 'cat-react',
          collectionIds: ['collection-ui'],
          createdAt: '2026-08-07T08:00:00.000Z',
          lastVisitedAt: null,
          visitCount: 0,
          starred: false,
          pinned: false,
          readStatus: 'unread',
          aiSummary: 'Do not export me',
          aiSuggestedTags: ['react'],
        },
      ],
      collections: [
        {
          id: 'collection-ui',
          name: 'UI',
          emoji: '🎨',
          color: 'blue',
          description: 'UI picks',
          bookmarkIds: ['bookmark-react'],
        },
      ],
      tags: [{ id: 'tag-react', label: 'React', color: 'blue' }],
    });

    const html = module.buildBrowserBookmarkHtml(library, {
      title: 'Linkit Export',
      exportedAt: '2026-08-08T08:00:00.000Z',
    });

    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(html).toContain('<TITLE>Linkit Export</TITLE>');
    expect(html).toContain('<H3');
    expect(html).toContain('>Tech<');
    expect(html).toContain('>React<');
    expect(html).toContain('<A HREF="https://react.dev/"');
    expect(html).not.toContain('collectionIds');
    expect(html).not.toContain('tag-react');
    expect(html).not.toContain('Do not export me');
    expect(html).not.toContain('aiSummary');
    expect(html).not.toContain('aiSuggestedTags');
  });

  test('REQ-035-AC-002 导入浏览器 HTML 时先给出摘要并按规范化 URL 跳过重复', async () => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.parseBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.parseBrowserBookmarkHtml) {
      throw new Error('parseBrowserBookmarkHtml is required');
    }

    const currentLibrary = createLibrary({
      bookmarks: [
        {
          id: 'bookmark-existing',
          title: 'Existing',
          url: 'https://example.com/duplicate/',
          domain: 'example.com',
          favicon: 'E',
          faviconColor: 'blue',
          description: '',
          notes: '',
          tags: [],
          categoryId: '',
          collectionIds: [],
          createdAt: '2026-08-01T08:00:00.000Z',
          lastVisitedAt: null,
          visitCount: 0,
          starred: false,
          pinned: false,
          readStatus: 'unread',
        },
      ],
    });
    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>',
      '  <DT><H3>Tech</H3>',
      '  <DL><p>',
      '    <DT><A HREF="https://example.com/duplicate">Duplicate</A>',
      '    <DT><A HREF="https://react.dev/">React</A>',
      '  </DL><p>',
      '</DL><p>',
    ].join('\n');

    const result = module.parseBrowserBookmarkHtml(html, {
      library: currentLibrary,
      now: '2026-08-08T08:00:00.000Z',
      idFactory: createIdFactory(['category-tech', 'bookmark-react']),
    });

    if (!result.success) {
      throw new Error('browser bookmark import should succeed');
    }
    expect(result.pendingImport.summary).toEqual({
      mode: 'browser-bookmarks',
      folders: 1,
      bookmarks: 2,
      newBookmarks: 1,
      skippedDuplicates: 1,
    });

    expect(result.pendingImport.snapshot.categories).toEqual([
      expect.objectContaining({ id: 'category-tech', name: 'Tech', parentId: null }),
    ]);
    expect(result.pendingImport.snapshot.bookmarks).toEqual([
      expect.objectContaining({ id: 'bookmark-existing', url: 'https://example.com/duplicate/' }),
      expect.objectContaining({
        id: 'bookmark-react',
        title: 'React',
        url: 'https://react.dev/',
        domain: 'react.dev',
        categoryId: 'category-tech',
      }),
    ]);
  });

  test('REQ-035-AC-003 全部为重复书签时不创建空分类，保持资料库零副作用', async () => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.parseBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.parseBrowserBookmarkHtml) {
      throw new Error('parseBrowserBookmarkHtml is required');
    }

    const currentLibrary = createLibrary({
      bookmarks: [
        {
          id: 'bookmark-existing',
          title: 'Existing',
          url: 'https://example.com/duplicate/',
          domain: 'example.com',
          favicon: 'E',
          faviconColor: 'blue',
          description: '',
          notes: '',
          tags: [],
          categoryId: '',
          collectionIds: [],
          createdAt: '2026-08-01T08:00:00.000Z',
          lastVisitedAt: null,
          visitCount: 0,
          starred: false,
          pinned: false,
          readStatus: 'unread',
        },
      ],
    });
    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<DL><p>',
      '  <DT><H3>Only duplicates</H3>',
      '  <DL><p><DT><A HREF="https://example.com/duplicate">Duplicate</A></DL><p>',
      '</DL><p>',
    ].join('\n');

    const result = module.parseBrowserBookmarkHtml(html, {
      library: currentLibrary,
      now: '2026-08-08T08:00:00.000Z',
      idFactory: () => 'unexpected-id',
    });

    if (!result.success) {
      throw new Error('browser bookmark import should succeed');
    }
    expect(result.pendingImport.summary).toMatchObject({
      newBookmarks: 0,
      skippedDuplicates: 1,
    });
    expect(result.pendingImport.snapshot.categories).toEqual([]);
    expect(result.pendingImport.snapshot.bookmarks).toEqual(currentLibrary.bookmarks);
  });

  // REQ-035-AC-009：分类路径使用 NFKC、去空白和大小写不敏感 key 融合现有分类。
  test('导入分类路径规范化后复用现有 Category ID', async () => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.parseBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.parseBrowserBookmarkHtml) {
      throw new Error('parseBrowserBookmarkHtml is required');
    }

    const currentLibrary = createLibrary({
      categories: [
        { id: 'category-tech', name: 'Tech', icon: 'Folder', parentId: null, color: 'blue' },
        { id: 'category-react', name: 'React', icon: 'Folder', parentId: 'category-tech', color: 'green' },
      ],
    });
    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<DL><p>',
      '  <DT><H3> tech </H3>',
      '  <DL><p>',
      '    <DT><H3>ＲＥＡＣＴ</H3>',
      '    <DL><p>',
      '      <DT><A HREF="https://react.dev/">React docs</A>',
      '    </DL><p>',
      '  </DL><p>',
      '</DL><p>',
    ].join('\n');

    const result = module.parseBrowserBookmarkHtml(html, {
      library: currentLibrary,
      now: '2026-08-08T08:00:00.000Z',
      idFactory: createIdFactory(['bookmark-react']),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pendingImport.snapshot.categories).toEqual(currentLibrary.categories);
      expect(result.pendingImport.snapshot.bookmarks).toEqual([
        expect.objectContaining({ id: 'bookmark-react', categoryId: 'category-react' }),
      ]);
    }
  });

  test('REQ-035-AC-001 异常分类环不会导致导出递归溢出', async () => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.buildBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.buildBrowserBookmarkHtml) {
      throw new Error('buildBrowserBookmarkHtml is required');
    }

    const library = createLibrary({
      categories: [
        { id: 'category-a', name: 'A', icon: 'Folder', parentId: 'category-b', color: 'blue' },
        { id: 'category-b', name: 'B', icon: 'Folder', parentId: 'category-a', color: 'blue' },
      ],
    });

    const html = module.buildBrowserBookmarkHtml!(library, {
      title: 'Cyclic library',
      exportedAt: '2026-08-08T08:00:00.000Z',
    });
    expect(html).toContain('>A<');
    expect(html).toContain('>B<');
  });

  test.each([
    ['Chrome', 'Bookmarks bar'],
    ['Edge', 'Favorites bar'],
    ['Firefox', 'Bookmarks Toolbar'],
  ])('REQ-035-AC-001/003 解析 %s 常见 Netscape 书签结构', async (browser, folderName) => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.parseBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.parseBrowserBookmarkHtml) {
      throw new Error('parseBrowserBookmarkHtml is required');
    }
    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>',
      `  <DT><H3 ADD_DATE="1786204800" LAST_MODIFIED="1786204800" PERSONAL_TOOLBAR_FOLDER="true">${folderName}</H3>`,
      '  <DL><p>',
      `    <DT><A HREF="https://${browser.toLowerCase()}.example.test/" ADD_DATE="1786204801" ICON="data:image/png;base64,ignored">${browser} link</A>`,
      '  </DL><p>',
      '</DL><p>',
    ].join('\n');

    const result = module.parseBrowserBookmarkHtml(html, {
      library: createLibrary(),
      now: '2026-08-08T08:00:00.000Z',
      idFactory: (() => {
        let index = 0;
        return () => `id-${++index}`;
      })(),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pendingImport.summary).toMatchObject({
        folders: 0,
        bookmarks: 1,
        newBookmarks: 1,
        skippedDuplicates: 0,
      });
      expect(result.pendingImport.snapshot.bookmarks[0]?.title).toBe(`${browser} link`);
    }
  });

  // REQ-035-AC-003/009/012：浏览器虚拟根只作为解析边界，不创建 Category。
  test('浏览器虚拟根下的直属书签落到 Linkit 根层且子文件夹从根层融合', async () => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.parseBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.parseBrowserBookmarkHtml) throw new Error('parseBrowserBookmarkHtml is required');

    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<DL><p>',
      '  <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>',
      '  <DL><p>',
      '    <DT><A HREF="https://root.example.test">Root bookmark</A>',
      '    <DT><H3>Engineering</H3>',
      '    <DL><p><DT><A HREF="https://engineering.example.test">Engineering bookmark</A></DL><p>',
      '  </DL><p>',
      '</DL><p>',
    ].join('\n');

    const result = module.parseBrowserBookmarkHtml(html, {
      library: createLibrary(),
      now: '2026-08-08T08:00:00.000Z',
      idFactory: (() => {
        let index = 0;
        return () => `id-${index++}`;
      })(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.pendingImport.summary.folders).toBe(1);
    expect(result.pendingImport.snapshot.categories).toEqual([
      expect.objectContaining({ name: 'Engineering', parentId: null }),
    ]);
    const engineering = result.pendingImport.snapshot.categories[0];
    expect(result.pendingImport.snapshot.bookmarks).toEqual([
      expect.objectContaining({ categoryId: '' }),
      expect.objectContaining({ categoryId: engineering?.id }),
    ]);
  });

  // REQ-035-AC-012：导入新 Category 的外观来自受控候选集并可注入随机源。
  test('导入新分类时随机生成受控 icon 和 color', async () => {
    const module = await loadPlannedBrowserHtmlModule();
    expect(module.parseBrowserBookmarkHtml).toBeTypeOf('function');
    if (!module.parseBrowserBookmarkHtml) throw new Error('parseBrowserBookmarkHtml is required');

    const html = '<DL><p><DT><H3>Random folder</H3><DL><p><DT><A HREF="https://random.example.test">Random</A></DL><p></DL><p>';
    const result = module.parseBrowserBookmarkHtml(html, {
      library: createLibrary(),
      now: '2026-08-08T08:00:00.000Z',
      idFactory: createIdFactory(['category-random', 'bookmark-random']),
      random: () => 0.5,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.pendingImport.snapshot.categories[0]).toMatchObject({
      icon: CATEGORY_ICON_CANDIDATES[Math.floor(CATEGORY_ICON_CANDIDATES.length * 0.5)],
      color: CATEGORY_COLOR_CANDIDATES[Math.floor(CATEGORY_COLOR_CANDIDATES.length * 0.5)],
    });
  });
});
