import { describe, expect, test } from 'vitest';
import {
  createBookmark,
  createCollection,
  createCoreJourneySeed,
} from '../../../testing/factories';
import type { LibraryData } from '../../../domain/library';

type Preview = {
  bookmarkIds: string[];
  members: Array<{ id: string; title: string }>;
};

type CommandResult =
  | {
      ok: true;
      value: LibraryData;
      events: Array<{ type: string; payload: Record<string, unknown> }>;
    }
  | { ok: false; error: { code: string; message: string } };

interface ComposeModule {
  buildComposePreview: (
    selectedIds: string[],
    bookmarks: LibraryData['bookmarks']
  ) => Preview | { ok: false; error: { code: string; message: string } };
  confirmComposeCollection: (
    library: LibraryData,
    input: {
      name: string;
      emoji?: string;
      color?: LibraryData['collections'][number]['color'];
      description?: string;
      bookmarkIds: string[];
      idFactory?: () => string;
      now?: () => string;
    }
  ) => CommandResult;
  cancelCompose: () => { status: 'cancelled' };
}

async function loadCompose(): Promise<Partial<ComposeModule>> {
  return import(/* @vite-ignore */ './index').catch(() => ({}));
}

function sampleLibrary(): LibraryData {
  const seed = createCoreJourneySeed().library.data;
  return {
    ...seed,
    collections: [
      createCollection({
        id: 'col-existing',
        name: 'Existing',
        bookmarkIds: [],
      }),
    ],
    bookmarks: [
      createBookmark({ id: 'bm-1', title: 'Alpha', collectionIds: [] }),
      createBookmark({ id: 'bm-2', title: 'Beta', collectionIds: [] }),
      createBookmark({ id: 'bm-3', title: 'Gamma', collectionIds: [] }),
    ],
  };
}

describe('手动拖出创建主题组合', () => {
  // REQ-013-AC-001：预览列出全部所选成员，且不修改资料库。
  test('buildComposePreview 列出所选成员且不修改原数据', async () => {
    const mod = await loadCompose();
    expect(mod.buildComposePreview).toBeTypeOf('function');
    if (!mod.buildComposePreview) throw new Error('buildComposePreview is required');

    const library = sampleLibrary();
    const snapshot = structuredClone(library);
    const preview = mod.buildComposePreview(['bm-1', 'bm-3'], library.bookmarks);

    expect(preview).toMatchObject({
      bookmarkIds: ['bm-1', 'bm-3'],
      members: [
        { id: 'bm-1', title: 'Alpha' },
        { id: 'bm-3', title: 'Gamma' },
      ],
    });
    expect(library).toStrictEqual(snapshot);
  });

  // REQ-013-AC-001：少于 2 个选择时不得进入预览。
  test('buildComposePreview 在选择不足 2 个时返回 COMPOSE_SELECTION_TOO_SMALL', async () => {
    const mod = await loadCompose();
    expect(mod.buildComposePreview).toBeTypeOf('function');
    if (!mod.buildComposePreview) throw new Error('buildComposePreview is required');

    expect(mod.buildComposePreview(['bm-1'], sampleLibrary().bookmarks)).toEqual({
      ok: false,
      error: {
        code: 'COMPOSE_SELECTION_TOO_SMALL',
        message: 'Select at least two bookmarks to create a collection',
      },
    });
  });

  // REQ-013-AC-002：确认后恰好创建一个主题并建立双向成员。
  test('confirmComposeCollection 一次创建主题并建立全部双向成员', async () => {
    const mod = await loadCompose();
    expect(mod.confirmComposeCollection).toBeTypeOf('function');
    if (!mod.confirmComposeCollection) throw new Error('confirmComposeCollection is required');

    const library = sampleLibrary();
    const beforeCount = library.collections.length;
    const result = mod.confirmComposeCollection(library, {
      name: 'Compose Theme',
      emoji: '🧩',
      color: 'violet',
      description: 'From selection',
      bookmarkIds: ['bm-1', 'bm-2'],
      idFactory: () => 'col-compose',
      now: () => '2026-07-18T14:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collections).toHaveLength(beforeCount + 1);
    const created = result.value.collections.find((c) => c.id === 'col-compose');
    expect(created).toMatchObject({
      name: 'Compose Theme',
      emoji: '🧩',
      color: 'violet',
      description: 'From selection',
      bookmarkIds: ['bm-1', 'bm-2'],
    });
    expect(result.value.bookmarks.find((b) => b.id === 'bm-1')?.collectionIds).toEqual([
      'col-compose',
    ]);
    expect(result.value.bookmarks.find((b) => b.id === 'bm-2')?.collectionIds).toEqual([
      'col-compose',
    ]);
    expect(result.value.bookmarks.find((b) => b.id === 'bm-3')?.collectionIds).toEqual([]);
    // 确认前原库不变
    expect(library.collections).toHaveLength(beforeCount);
  });

  // 取消路径：不产生任何持久化副作用（返回 cancelled，调用方不得写库）。
  test('cancelCompose 返回 cancelled 且可安全丢弃预览', async () => {
    const mod = await loadCompose();
    expect(mod.cancelCompose).toBeTypeOf('function');
    if (!mod.cancelCompose) throw new Error('cancelCompose is required');

    expect(mod.cancelCompose()).toEqual({ status: 'cancelled' });
  });

  // REQ-013-AC-002：成员书签缺失时返回错误，不创建主题。
  test('confirmComposeCollection 在成员缺失时返回 BOOKMARK_NOT_FOUND', async () => {
    const mod = await loadCompose();
    expect(mod.confirmComposeCollection).toBeTypeOf('function');
    if (!mod.confirmComposeCollection) throw new Error('confirmComposeCollection is required');

    const library = sampleLibrary();
    const result = mod.confirmComposeCollection(library, {
      name: 'Broken',
      bookmarkIds: ['bm-1', 'bm-missing'],
      idFactory: () => 'col-broken',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_NOT_FOUND', message: 'Bookmark was not found' },
    });
    expect(library.collections.find((c) => c.id === 'col-broken')).toBeUndefined();
  });
});
