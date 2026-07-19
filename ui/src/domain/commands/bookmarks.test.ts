import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed, createBookmark as factoryBookmark } from '../../testing/factories';
import type { LibraryData } from '../library';

interface BookmarkCommands {
  createBookmark: (
    library: LibraryData,
    input: {
      url: string;
      title?: string;
      description?: string;
      notes?: string;
      tagIds?: string[];
      categoryId?: string | null;
      collectionIds?: string[];
      idFactory?: () => string;
      now?: () => Date;
    }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  updateBookmark: (
    library: LibraryData,
    input: { id: string; patch: Partial<LibraryData['bookmarks'][number]>; now?: () => Date }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  deleteBookmark: (
    library: LibraryData,
    input: { id: string }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
}

async function loadCommands(): Promise<Partial<BookmarkCommands>> {
  return import(/* @vite-ignore */ './bookmarks').catch(() => ({}));
}

describe('书签领域命令', () => {
  // REQ-006-AC-004：确认保存后创建唯一 ID、规范化 URL 与 createdAt，且只添加一次。
  test('createBookmark 在有效 URL 时创建唯一书签并规范化 URL', async () => {
    const { createBookmark } = await loadCommands();
    expect(createBookmark).toBeTypeOf('function');
    if (!createBookmark) throw new Error('createBookmark is required');

    const library = createCoreJourneySeed().library.data;
    const before = library.bookmarks.length;
    const result = createBookmark(library, {
      url: 'example.test/new-page',
      title: 'New Page',
      idFactory: () => 'bookmark-created-1',
      now: () => new Date('2026-07-18T02:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks).toHaveLength(before + 1);
    const created = result.value.bookmarks.find((b) => b.id === 'bookmark-created-1');
    expect(created).toMatchObject({
      id: 'bookmark-created-1',
      title: 'New Page',
      url: 'https://example.test/new-page',
      domain: 'example.test',
      createdAt: '2026-07-18T02:00:00.000Z',
      updatedAt: '2026-07-18T02:00:00.000Z',
    });
    expect(result.events).toEqual([
      { type: 'bookmark.created', payload: { bookmarkId: 'bookmark-created-1' } },
    ]);
    expect(library.bookmarks).toHaveLength(before);
  });

  test('createBookmark 在非法 URL 时返回 BOOKMARK_URL_INVALID', async () => {
    const { createBookmark } = await loadCommands();
    expect(createBookmark).toBeTypeOf('function');
    if (!createBookmark) throw new Error('createBookmark is required');

    const library = createCoreJourneySeed().library.data;
    expect(createBookmark(library, { url: 'javascript:alert(1)' })).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_URL_INVALID', message: 'Bookmark URL must be http or https' },
    });
  });

  // REQ-006-AC-005：创建书签时 URL 必须唯一，规范化后重复应阻止创建。
  test('createBookmark 在 URL 已存在时返回 BOOKMARK_URL_DUPLICATE 且不修改资料库', async () => {
    const { createBookmark } = await loadCommands();
    expect(createBookmark).toBeTypeOf('function');
    if (!createBookmark) throw new Error('createBookmark is required');

    const library = createCoreJourneySeed().library.data;
    const before = library.bookmarks.length;
    const result = createBookmark(library, {
      url: 'example.test/reference/',
      title: 'Duplicate URL',
      idFactory: () => 'bookmark-duplicate',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_URL_DUPLICATE', message: 'Bookmark URL already exists' },
    });
    expect(library.bookmarks).toHaveLength(before);
    expect(library.bookmarks.some((bookmark) => bookmark.id === 'bookmark-duplicate')).toBe(false);
  });

  test('createBookmark 同步主题成员引用', async () => {
    const { createBookmark } = await loadCommands();
    expect(createBookmark).toBeTypeOf('function');
    if (!createBookmark) throw new Error('createBookmark is required');

    const library = createCoreJourneySeed().library.data;
    const result = createBookmark(library, {
      url: 'https://example.test/member',
      title: 'Member',
      collectionIds: ['collection-reference'],
      idFactory: () => 'bookmark-member',
      now: () => new Date('2026-07-18T02:00:00.000Z'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks.find((b) => b.id === 'bookmark-member')?.collectionIds).toEqual([
      'collection-reference',
    ]);
    expect(result.value.collections[0].bookmarkIds).toContain('bookmark-member');
  });

  // REQ-007-AC-002：更新后列表与领域数据一致，且更新 updatedAt。
  test('updateBookmark 合并字段并刷新 updatedAt', async () => {
    const { updateBookmark } = await loadCommands();
    expect(updateBookmark).toBeTypeOf('function');
    if (!updateBookmark) throw new Error('updateBookmark is required');

    const library = createCoreJourneySeed().library.data;
    const result = updateBookmark(library, {
      id: 'bookmark-reference',
      patch: { title: 'Updated title', description: 'Updated description' },
      now: () => new Date('2026-07-18T03:00:00.000Z'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = result.value.bookmarks.find((b) => b.id === 'bookmark-reference');
    expect(updated?.title).toBe('Updated title');
    expect(updated?.description).toBe('Updated description');
    expect(updated?.updatedAt).toBe('2026-07-18T03:00:00.000Z');
    expect(result.events[0]?.type).toBe('bookmark.updated');
  });

  test('updateBookmark 在书签不存在时返回 BOOKMARK_NOT_FOUND', async () => {
    const { updateBookmark } = await loadCommands();
    expect(updateBookmark).toBeTypeOf('function');
    if (!updateBookmark) throw new Error('updateBookmark is required');

    const library = createCoreJourneySeed().library.data;
    expect(updateBookmark(library, { id: 'missing', patch: { title: 'x' } })).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_NOT_FOUND', message: 'Bookmark was not found' },
    });
  });

  // REQ-007-AC-004：确认删除后移除书签并清理主题成员悬挂引用。
  test('deleteBookmark 移除书签并清理主题 bookmarkIds', async () => {
    const { deleteBookmark } = await loadCommands();
    expect(deleteBookmark).toBeTypeOf('function');
    if (!deleteBookmark) throw new Error('deleteBookmark is required');

    const library: LibraryData = structuredClone(createCoreJourneySeed().library.data);
    library.bookmarks.push(
      factoryBookmark({
        id: 'bookmark-to-delete',
        title: 'To delete',
        url: 'https://example.test/delete',
        domain: 'example.test',
        collectionIds: ['collection-reference'],
      })
    );
    library.collections[0].bookmarkIds = ['bookmark-reference', 'bookmark-to-delete'];

    const result = deleteBookmark(library, { id: 'bookmark-to-delete' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks.find((b) => b.id === 'bookmark-to-delete')).toBeUndefined();
    expect(result.value.collections[0].bookmarkIds).toEqual(['bookmark-reference']);
    expect(result.events).toEqual([
      { type: 'bookmark.deleted', payload: { bookmarkId: 'bookmark-to-delete' } },
    ]);
    expect(library.bookmarks.some((b) => b.id === 'bookmark-to-delete')).toBe(true);
  });
});
