import { describe, expect, test, vi } from 'vitest';
import { createBookmark, createCoreJourneySeed } from '../../testing/factories';
import type { LibraryData } from '../../domain/library';
import { recordBookmarkVisit } from '../../domain/commands/bookmark-state';

interface VisitModule {
  openBookmarkUrl: (input: {
    url: string;
    openExternal?: (url: string) => Promise<void>;
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
  visitBookmark: (input: {
    library: LibraryData;
    bookmarkId: string;
    openExternal?: (url: string) => Promise<void>;
    now?: () => Date;
  }) => Promise<
    | { ok: true; library: LibraryData }
    | { ok: false; library: LibraryData; message: string }
  >;
}

async function loadVisit(): Promise<Partial<VisitModule>> {
  return import(/* @vite-ignore */ './visit').catch(() => ({}));
}

describe('书签外部访问编排', () => {
  // REQ-008-AC-002：打开成功后才增加 visitCount。
  test('visitBookmark 在外部打开成功时将 visitCount 加一', async () => {
    const { visitBookmark } = await loadVisit();
    expect(visitBookmark).toBeTypeOf('function');
    if (!visitBookmark) throw new Error('visitBookmark is required');

    const library: LibraryData = {
      ...createCoreJourneySeed().library.data,
      bookmarks: [createBookmark({ id: 'bookmark-visit', visitCount: 2, lastVisitedAt: null })],
    };
    const openExternal = vi.fn(async () => undefined);

    const result = await visitBookmark({
      library,
      bookmarkId: 'bookmark-visit',
      openExternal,
      now: () => new Date('2026-07-18T05:00:00.000Z'),
    });

    expect(openExternal).toHaveBeenCalledWith('https://example.test/reference');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.library.bookmarks[0].visitCount).toBe(3);
    expect(result.library.bookmarks[0].lastVisitedAt).toBe('2026-07-18T05:00:00.000Z');
  });

  // TASK-012：打开失败不得增加计数。
  test('visitBookmark 在外部打开失败时不修改 visitCount', async () => {
    const { visitBookmark } = await loadVisit();
    expect(visitBookmark).toBeTypeOf('function');
    if (!visitBookmark) throw new Error('visitBookmark is required');

    const library: LibraryData = {
      ...createCoreJourneySeed().library.data,
      bookmarks: [createBookmark({ id: 'bookmark-visit', visitCount: 2, lastVisitedAt: null })],
    };
    const openExternal = vi.fn(async () => {
      throw new Error('External open failed');
    });

    const result = await visitBookmark({
      library,
      bookmarkId: 'bookmark-visit',
      openExternal,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.library.bookmarks[0].visitCount).toBe(2);
    expect(result.library.bookmarks[0].lastVisitedAt).toBeNull();
    expect(result.message).toMatch(/failed|open/i);
  });

  test('recordBookmarkVisit 可被 visitBookmark 成功路径复用', () => {
    const library: LibraryData = {
      ...createCoreJourneySeed().library.data,
      bookmarks: [createBookmark({ id: 'bookmark-visit', visitCount: 0 })],
    };
    const recorded = recordBookmarkVisit(library, {
      id: 'bookmark-visit',
      now: () => new Date('2026-07-18T05:00:00.000Z'),
    });
    expect(recorded.ok).toBe(true);
  });
});
