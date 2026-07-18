import { recordBookmarkVisit } from '../../domain/commands/bookmark-state';
import type { LibraryData } from '../../domain/library';
import { openExternalUrl } from './external-url';

/**
 * 打开书签 URL；仅在外部打开成功后记录访问。
 * REQ-008-AC-002
 */
export async function visitBookmark(input: {
  library: LibraryData;
  bookmarkId: string;
  openExternal?: (url: string) => Promise<void>;
  now?: () => Date;
}): Promise<
  | { ok: true; library: LibraryData }
  | { ok: false; library: LibraryData; message: string }
> {
  const bookmark = input.library.bookmarks.find((item) => item.id === input.bookmarkId);
  if (!bookmark) {
    return {
      ok: false,
      library: input.library,
      message: 'Bookmark was not found',
    };
  }

  const opened = await openBookmarkUrl({
    url: bookmark.url,
    openExternal: input.openExternal,
  });
  if (!opened.ok) {
    return { ok: false, library: input.library, message: opened.message };
  }

  const recorded = recordBookmarkVisit(input.library, {
    id: input.bookmarkId,
    now: input.now,
  });
  if (!recorded.ok) {
    return { ok: false, library: input.library, message: recorded.error.message };
  }
  return { ok: true, library: recorded.value };
}

/**
 * 调用外部打开适配层；不修改资料库。
 */
export async function openBookmarkUrl(input: {
  url: string;
  openExternal?: (url: string) => Promise<void>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const open = input.openExternal ?? openExternalUrl;
    await open(input.url);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open external URL';
    return { ok: false, message };
  }
}
