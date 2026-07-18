import { describe, expect, test } from 'vitest';
import {
  createBookmark,
  createCollection,
  createCoreJourneySeed,
} from '../../testing/factories';
import type { LibraryData } from '../library';

type CollectionColor = LibraryData['collections'][number]['color'];

type CommandOk = {
  ok: true;
  value: LibraryData;
  events: Array<{ type: string; payload: Record<string, unknown> }>;
};

type CommandFail = {
  ok: false;
  error: { code: string; message: string };
};

type CommandResult = CommandOk | CommandFail;

interface CollectionsModule {
  createCollection: (
    library: LibraryData,
    input: {
      name: string;
      emoji?: string;
      color?: CollectionColor;
      description?: string;
      idFactory?: () => string;
      now?: () => string;
    }
  ) => CommandResult;
  updateCollection: (
    library: LibraryData,
    input: {
      id: string;
      name?: string;
      emoji?: string;
      color?: CollectionColor;
      description?: string;
      now?: () => string;
    }
  ) => CommandResult;
  deleteCollection: (
    library: LibraryData,
    input: { id: string }
  ) => CommandResult;
  listCollectionMembers: (
    library: LibraryData,
    collectionId: string
  ) => LibraryData['bookmarks'] | null;
}

async function loadCollections(): Promise<Partial<CollectionsModule>> {
  return import(/* @vite-ignore */ './index').catch(() => ({}));
}

function sampleLibrary(): LibraryData {
  const seed = createCoreJourneySeed().library.data;
  return {
    ...seed,
    collections: [
      createCollection({
        id: 'col-design',
        name: 'Design',
        emoji: '🎨',
        color: 'violet',
        description: 'Design refs',
        bookmarkIds: ['bm-a', 'bm-b'],
      }),
    ],
    bookmarks: [
      createBookmark({
        id: 'bm-a',
        title: 'A',
        collectionIds: ['col-design'],
      }),
      createBookmark({
        id: 'bm-b',
        title: 'B',
        collectionIds: ['col-design'],
      }),
      createBookmark({
        id: 'bm-c',
        title: 'C',
        collectionIds: [],
      }),
    ],
  };
}

describe('主题 CRUD 与成员视图', () => {
  // REQ-012-AC-001：创建主题并持久化全部字段。
  test('createCollection 在有效输入时创建主题并记录时间戳', async () => {
    const { createCollection: createCol } = await loadCollections();
    expect(createCol).toBeTypeOf('function');
    if (!createCol) throw new Error('createCollection is required');

    const library = sampleLibrary();
    const result = createCol(library, {
      name: '  Launch week  ',
      emoji: '🚀',
      color: 'amber',
      description: 'Ship goals',
      idFactory: () => 'col-new',
      now: () => '2026-07-18T12:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collections.find((c) => c.id === 'col-new')).toMatchObject({
      id: 'col-new',
      name: 'Launch week',
      emoji: '🚀',
      color: 'amber',
      description: 'Ship goals',
      bookmarkIds: [],
      createdAt: '2026-07-18T12:00:00.000Z',
      updatedAt: '2026-07-18T12:00:00.000Z',
    });
    expect(result.events).toEqual([
      { type: 'collection.created', payload: { collectionId: 'col-new' } },
    ]);
    expect(library.collections).toHaveLength(1);
  });

  // REQ-012-AC-001：名称 trim 后必须非空。
  test('createCollection 在空名称时返回 COLLECTION_NAME_INVALID', async () => {
    const { createCollection: createCol } = await loadCollections();
    expect(createCol).toBeTypeOf('function');
    if (!createCol) throw new Error('createCollection is required');

    expect(createCol(sampleLibrary(), { name: '   ' })).toEqual({
      ok: false,
      error: { code: 'COLLECTION_NAME_INVALID', message: 'Collection name is required' },
    });
  });

  // REQ-012-AC-001：编辑主题元数据并更新 updatedAt。
  test('updateCollection 更新名称 emoji 颜色与描述', async () => {
    const { updateCollection } = await loadCollections();
    expect(updateCollection).toBeTypeOf('function');
    if (!updateCollection) throw new Error('updateCollection is required');

    const library = sampleLibrary();
    const result = updateCollection(library, {
      id: 'col-design',
      name: 'Design system',
      emoji: '✨',
      color: 'blue',
      description: 'Updated',
      now: () => '2026-07-18T13:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collections[0]).toMatchObject({
      id: 'col-design',
      name: 'Design system',
      emoji: '✨',
      color: 'blue',
      description: 'Updated',
      bookmarkIds: ['bm-a', 'bm-b'],
      updatedAt: '2026-07-18T13:00:00.000Z',
    });
  });

  // REQ-012-AC-002：删除主题但保留成员书签，并清理 collectionIds。
  test('deleteCollection 删除主题并保留全部成员书签', async () => {
    const { deleteCollection } = await loadCollections();
    expect(deleteCollection).toBeTypeOf('function');
    if (!deleteCollection) throw new Error('deleteCollection is required');

    const library = sampleLibrary();
    const result = deleteCollection(library, { id: 'col-design' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collections.find((c) => c.id === 'col-design')).toBeUndefined();
    expect(result.value.bookmarks.map((b) => b.id).sort()).toEqual(['bm-a', 'bm-b', 'bm-c']);
    expect(result.value.bookmarks.find((b) => b.id === 'bm-a')?.collectionIds).toEqual([]);
    expect(result.value.bookmarks.find((b) => b.id === 'bm-b')?.collectionIds).toEqual([]);
    expect(result.events).toEqual([
      { type: 'collection.deleted', payload: { collectionId: 'col-design' } },
    ]);
  });

  // REQ-012-AC-002：主题不存在时返回结构化错误。
  test('deleteCollection 在主题不存在时返回 COLLECTION_NOT_FOUND', async () => {
    const { deleteCollection } = await loadCollections();
    expect(deleteCollection).toBeTypeOf('function');
    if (!deleteCollection) throw new Error('deleteCollection is required');

    expect(deleteCollection(sampleLibrary(), { id: 'col-missing' })).toEqual({
      ok: false,
      error: { code: 'COLLECTION_NOT_FOUND', message: 'Collection was not found' },
    });
  });

  // REQ-012-AC-004：打开主题时仅返回当前成员。
  test('listCollectionMembers 仅返回主题现有成员', async () => {
    const { listCollectionMembers } = await loadCollections();
    expect(listCollectionMembers).toBeTypeOf('function');
    if (!listCollectionMembers) throw new Error('listCollectionMembers is required');

    const members = listCollectionMembers(sampleLibrary(), 'col-design');
    expect(members?.map((b) => b.id)).toEqual(['bm-a', 'bm-b']);
  });

  // REQ-026-AC-003：成员加入后两侧无重复且对称。
  test('setBookmarkCollectionMembership 加入成员后无重复且双向一致', async () => {
    const membership = await import('../commands/index').catch(() => null);
    expect(membership?.setBookmarkCollectionMembership).toBeTypeOf('function');
    if (!membership?.setBookmarkCollectionMembership) {
      throw new Error('setBookmarkCollectionMembership is required');
    }

    const library = sampleLibrary();
    const first = membership.setBookmarkCollectionMembership(library, {
      bookmarkId: 'bm-c',
      collectionId: 'col-design',
      member: true,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const again = membership.setBookmarkCollectionMembership(first.value, {
      bookmarkId: 'bm-c',
      collectionId: 'col-design',
      member: true,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;

    const collection = again.value.collections.find((c) => c.id === 'col-design');
    const bookmark = again.value.bookmarks.find((b) => b.id === 'bm-c');
    expect(collection?.bookmarkIds).toEqual(['bm-a', 'bm-b', 'bm-c']);
    expect(bookmark?.collectionIds).toEqual(['col-design']);
  });
});
