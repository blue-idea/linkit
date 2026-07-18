import { describe, expect, test } from 'vitest';
import { createBookmark, createCoreJourneySeed } from '../../testing/factories';
import type { LibraryData } from '../library';

type ReadStatus = 'unread' | 'reading' | 'read' | 'archived';

interface BookmarkStateCommands {
  toggleBookmarkStarred: (
    library: LibraryData,
    input: { id: string; now?: () => Date }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  toggleBookmarkPinned: (
    library: LibraryData,
    input: { id: string; now?: () => Date }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  setBookmarkReadStatus: (
    library: LibraryData,
    input: { id: string; readStatus: ReadStatus; now?: () => Date }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  recordBookmarkVisit: (
    library: LibraryData,
    input: { id: string; now?: () => Date }
  ) =>
    | { ok: true; value: LibraryData; events: Array<{ type: string; payload: Record<string, unknown> }> }
    | { ok: false; error: { code: string; message: string } };
  filterBookmarksByReadStatus: (
    bookmarks: LibraryData['bookmarks'],
    readStatus: ReadStatus
  ) => LibraryData['bookmarks'];
}

async function loadCommands(): Promise<Partial<BookmarkStateCommands>> {
  return import(/* @vite-ignore */ './bookmark-state').catch(() => ({}));
}

describe('书签状态领域命令', () => {
  // REQ-008-AC-001：切换 starred 后库内值取反且不修改原数组引用内容。
  test('toggleBookmarkStarred 切换星标状态并更新 updatedAt', async () => {
    const { toggleBookmarkStarred } = await loadCommands();
    expect(toggleBookmarkStarred).toBeTypeOf('function');
    if (!toggleBookmarkStarred) throw new Error('toggleBookmarkStarred is required');

    const library = createCoreJourneySeed().library.data;
    const target = library.bookmarks[0];
    const before = target.starred;
    const result = toggleBookmarkStarred(library, {
      id: target.id,
      now: () => new Date('2026-07-18T03:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = result.value.bookmarks.find((b) => b.id === target.id);
    expect(updated?.starred).toBe(!before);
    expect(updated?.updatedAt).toBe('2026-07-18T03:00:00.000Z');
    expect(library.bookmarks.find((b) => b.id === target.id)?.starred).toBe(before);
  });

  // REQ-008-AC-001：切换 pinned 后库内值取反。
  test('toggleBookmarkPinned 切换置顶状态并更新 updatedAt', async () => {
    const { toggleBookmarkPinned } = await loadCommands();
    expect(toggleBookmarkPinned).toBeTypeOf('function');
    if (!toggleBookmarkPinned) throw new Error('toggleBookmarkPinned is required');

    const library = createCoreJourneySeed().library.data;
    const target = library.bookmarks[0];
    const before = target.pinned;
    const result = toggleBookmarkPinned(library, {
      id: target.id,
      now: () => new Date('2026-07-18T03:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = result.value.bookmarks.find((b) => b.id === target.id);
    expect(updated?.pinned).toBe(!before);
    expect(updated?.updatedAt).toBe('2026-07-18T03:00:00.000Z');
  });

  // REQ-008-AC-003：readStatus 只能是四种枚举之一。
  test('setBookmarkReadStatus 将阅读状态更新为所选枚举值', async () => {
    const { setBookmarkReadStatus } = await loadCommands();
    expect(setBookmarkReadStatus).toBeTypeOf('function');
    if (!setBookmarkReadStatus) throw new Error('setBookmarkReadStatus is required');

    const library = createCoreJourneySeed().library.data;
    const id = library.bookmarks[0].id;
    for (const status of ['unread', 'reading', 'read', 'archived'] as const) {
      const result = setBookmarkReadStatus(library, {
        id,
        readStatus: status,
        now: () => new Date('2026-07-18T03:10:00.000Z'),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.bookmarks.find((b) => b.id === id)?.readStatus).toBe(status);
    }
  });

  test('setBookmarkReadStatus 在非法状态时返回 READ_STATUS_INVALID', async () => {
    const { setBookmarkReadStatus } = await loadCommands();
    expect(setBookmarkReadStatus).toBeTypeOf('function');
    if (!setBookmarkReadStatus) throw new Error('setBookmarkReadStatus is required');

    const library = createCoreJourneySeed().library.data;
    const result = setBookmarkReadStatus(library, {
      id: library.bookmarks[0].id,
      // 强制传入非法值以验证守卫
      readStatus: 'done' as unknown as ReadStatus,
    });
    expect(result).toEqual({
      ok: false,
      error: { code: 'READ_STATUS_INVALID', message: 'Read status must be unread, reading, read or archived' },
    });
  });

  // REQ-008-AC-002：成功访问后 visitCount +1 且写入 lastVisitedAt。
  test('recordBookmarkVisit 将 visitCount 加一并更新 lastVisitedAt', async () => {
    const { recordBookmarkVisit } = await loadCommands();
    expect(recordBookmarkVisit).toBeTypeOf('function');
    if (!recordBookmarkVisit) throw new Error('recordBookmarkVisit is required');

    const library: LibraryData = {
      ...createCoreJourneySeed().library.data,
      bookmarks: [
        createBookmark({
          id: 'bookmark-visit',
          visitCount: 4,
          lastVisitedAt: null,
        }),
      ],
    };
    const result = recordBookmarkVisit(library, {
      id: 'bookmark-visit',
      now: () => new Date('2026-07-18T04:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = result.value.bookmarks[0];
    expect(updated.visitCount).toBe(5);
    expect(updated.lastVisitedAt).toBe('2026-07-18T04:00:00.000Z');
    expect(library.bookmarks[0].visitCount).toBe(4);
  });

  // REQ-008-AC-004：按阅读状态筛选只返回匹配项。
  test('filterBookmarksByReadStatus 仅返回匹配所选状态的书签', async () => {
    const { filterBookmarksByReadStatus } = await loadCommands();
    expect(filterBookmarksByReadStatus).toBeTypeOf('function');
    if (!filterBookmarksByReadStatus) throw new Error('filterBookmarksByReadStatus is required');

    const bookmarks = [
      createBookmark({ id: 'b1', readStatus: 'unread' }),
      createBookmark({ id: 'b2', readStatus: 'reading' }),
      createBookmark({ id: 'b3', readStatus: 'read' }),
      createBookmark({ id: 'b4', readStatus: 'archived' }),
      createBookmark({ id: 'b5', readStatus: 'reading' }),
    ];

    const reading = filterBookmarksByReadStatus(bookmarks, 'reading');
    expect(reading.map((b) => b.id)).toEqual(['b2', 'b5']);
    expect(reading.every((b) => b.readStatus === 'reading')).toBe(true);

    for (const status of ['unread', 'read', 'archived'] as const) {
      const filtered = filterBookmarksByReadStatus(bookmarks, status);
      expect(filtered.every((b) => b.readStatus === status)).toBe(true);
      expect(filtered).toHaveLength(1);
    }
  });
});
