import { describe, expect, test } from 'vitest';
import type { LibraryData } from '../library';
import { createCoreJourneySeed } from '../../testing/factories';

interface MembershipCommandInput {
  bookmarkId: string;
  collectionId: string;
  member: boolean;
}

interface BatchMembershipCommandInput {
  bookmarkIds: string[];
  collectionId: string;
  member: boolean;
}

type CommandResult =
  | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
  | { ok: false; error: { code: string; message: string } };

interface CommandModule {
  setBookmarkCollectionMembership: (
    library: LibraryData,
    input: MembershipCommandInput,
  ) => CommandResult;
  batchSetBookmarkCollectionMembership: (
    library: LibraryData,
    input: BatchMembershipCommandInput,
  ) => CommandResult;
}

async function loadCommandModule(): Promise<Partial<CommandModule>> {
  const modulePath = './index.ts';
  return import(/* @vite-ignore */ modulePath).catch(() => ({}));
}

describe('主题成员关系命令', () => {
  // REQ-026-AC-003：添加成员时必须同时更新书签与主题，并返回领域事件。
  test('成员命令在添加关系时保持双向一致且不修改原数据', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.setBookmarkCollectionMembership;
    const original = createCoreJourneySeed().library.data;
    const input = { bookmarkId: 'bookmark-health-changed', collectionId: 'collection-reference', member: true };

    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('Membership command is required');

    const withoutMembership = structuredClone(original);
    withoutMembership.bookmarks[1].collectionIds = [];
    withoutMembership.collections[0].bookmarkIds = ['bookmark-reference'];
    const result = command(withoutMembership, input);

    expect(result).toMatchObject({
      ok: true,
      events: [{
        type: 'bookmark.collection-membership.changed',
        payload: input,
      }],
    });
    if (result.ok) {
      expect(result.value.bookmarks[1].collectionIds).toEqual(['collection-reference']);
      expect(result.value.collections[0].bookmarkIds).toEqual([
        'bookmark-reference',
        'bookmark-health-changed',
      ]);
    }
    expect(withoutMembership.bookmarks[1].collectionIds).toEqual([]);
  });

  // REQ-026-AC-003：移除成员时必须同时移除两侧引用。
  test('成员命令在移除关系时清理书签与主题两侧引用', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.setBookmarkCollectionMembership;
    const library = createCoreJourneySeed().library.data;

    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('Membership command is required');

    const result = command(library, {
      bookmarkId: 'bookmark-health-changed',
      collectionId: 'collection-reference',
      member: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.bookmarks[1].collectionIds).toEqual([]);
      expect(result.value.collections[0].bookmarkIds).toEqual(['bookmark-reference']);
    }
  });

  // REQ-026-AC-002：不存在的书签必须返回结构化错误，不能产生部分修改。
  test('成员命令在书签不存在时返回 BOOKMARK_NOT_FOUND', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.setBookmarkCollectionMembership;
    const library = createCoreJourneySeed().library.data;

    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('Membership command is required');

    const result = command(library, {
      bookmarkId: 'bookmark-missing',
      collectionId: 'collection-reference',
      member: true,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_NOT_FOUND', message: 'Bookmark was not found' },
    });
    expect(library).toStrictEqual(createCoreJourneySeed().library.data);
  });

  // REQ-026-AC-002：不存在的主题必须返回结构化错误，不能静默创建引用。
  test('成员命令在主题不存在时返回 COLLECTION_NOT_FOUND', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.setBookmarkCollectionMembership;
    const library = createCoreJourneySeed().library.data;

    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('Membership command is required');

    expect(command(library, {
      bookmarkId: 'bookmark-reference',
      collectionId: 'collection-missing',
      member: true,
    })).toEqual({
      ok: false,
      error: { code: 'COLLECTION_NOT_FOUND', message: 'Collection was not found' },
    });
  });

  // REQ-012-AC-008 / REQ-026-AC-003：批量加入一次返回双向一致的 LibraryData。
  test('批量成员命令一次加入多本书签并保持双向一致', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.batchSetBookmarkCollectionMembership;
    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('batchSetBookmarkCollectionMembership is required');

    const original = createCoreJourneySeed().library.data;
    const library = structuredClone(original);
    library.bookmarks = library.bookmarks.map((bookmark) => ({
      ...bookmark,
      collectionIds: [],
    }));
    library.collections[0].bookmarkIds = [];
    const snapshot = structuredClone(library);
    const bookmarkIds = library.bookmarks.map(({ id }) => id);

    const result = command(library, {
      bookmarkIds,
      collectionId: 'collection-reference',
      member: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collections[0].bookmarkIds).toEqual(bookmarkIds);
    for (const bookmark of result.value.bookmarks) {
      expect(bookmark.collectionIds).toEqual(['collection-reference']);
    }
    expect(result.events).toEqual([{
      type: 'bookmark.collection-membership.batch-changed',
      payload: {
        bookmarkIds,
        collectionId: 'collection-reference',
        member: true,
      },
    }]);
    expect(library).toStrictEqual(snapshot);
  });

  // REQ-012-AC-011 / REQ-026-AC-003：批量移出保留书签并清理两侧引用。
  test('批量成员命令移出后保留书签并清理两侧引用', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.batchSetBookmarkCollectionMembership;
    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('batchSetBookmarkCollectionMembership is required');

    const library = createCoreJourneySeed().library.data;
    const bookmarkIds = library.bookmarks.map(({ id }) => id);
    const result = command(library, {
      bookmarkIds,
      collectionId: 'collection-reference',
      member: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks).toHaveLength(library.bookmarks.length);
    expect(result.value.collections[0].bookmarkIds).toEqual([]);
    expect(result.value.bookmarks.every((bookmark) => bookmark.collectionIds.length === 0)).toBe(true);
  });

  // REQ-012-AC-008：任一无效 ID 时整批失败且零副作用。
  test('批量成员命令在含无效书签 ID 时整批失败且不修改资料库', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.batchSetBookmarkCollectionMembership;
    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('batchSetBookmarkCollectionMembership is required');

    const library = createCoreJourneySeed().library.data;
    const snapshot = structuredClone(library);
    const result = command(library, {
      bookmarkIds: ['bookmark-reference', 'bookmark-missing'],
      collectionId: 'collection-reference',
      member: true,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_NOT_FOUND', message: 'One or more bookmarks were not found' },
    });
    expect(library).toStrictEqual(snapshot);
  });

  // REQ-012-AC-009：空列表确认前视为零副作用（整批失败不改库）。
  test('批量成员命令在空书签列表时返回错误且不修改资料库', async () => {
    const commandModule = await loadCommandModule();
    const command = commandModule.batchSetBookmarkCollectionMembership;
    expect(command).toBeTypeOf('function');
    if (!command) throw new Error('batchSetBookmarkCollectionMembership is required');

    const library = createCoreJourneySeed().library.data;
    const snapshot = structuredClone(library);
    expect(command(library, {
      bookmarkIds: [],
      collectionId: 'collection-reference',
      member: true,
    })).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_NOT_FOUND', message: 'One or more bookmarks were not found' },
    });
    expect(library).toStrictEqual(snapshot);
  });
});
