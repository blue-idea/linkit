import { describe, expect, test } from 'vitest';
import type { LibraryData } from '../library';
import { createCoreJourneySeed } from '../../testing/factories';

interface MembershipCommandInput {
  bookmarkId: string;
  collectionId: string;
  member: boolean;
}

interface CommandModule {
  setBookmarkCollectionMembership: (
    library: LibraryData,
    input: MembershipCommandInput,
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
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
});
