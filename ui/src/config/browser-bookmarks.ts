import type { TagColor } from '../types';

export const BROWSER_BOOKMARKS_DEFAULT_TITLE = 'Bookmarks';
export const BROWSER_BOOKMARKS_MIME_TYPE = 'text/html;charset=utf-8';
export const BROWSER_BOOKMARKS_FOLDER_ICON = 'Folder';
export const BROWSER_BOOKMARKS_FOLDER_COLOR: TagColor = 'blue';
export const BROWSER_BOOKMARKS_FAVICON_COLOR: TagColor = 'blue';
export const BROWSER_BOOKMARKS_AI_TAG_LIMIT = 3;

export function buildBrowserBookmarksFileName(now: string): string {
  return `linkit-bookmarks-${now.slice(0, 10)}.html`;
}
