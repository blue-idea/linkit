import type { TagColor } from '../types';

export const BROWSER_BOOKMARKS_DEFAULT_TITLE = 'Bookmarks';
export const BROWSER_BOOKMARKS_MIME_TYPE = 'text/html;charset=utf-8';
export const BROWSER_BOOKMARKS_FAVICON_COLOR: TagColor = 'blue';
export const BROWSER_BOOKMARKS_AI_TAG_LIMIT = 3;
/** 浏览器导入 metadata/AI worker 的最大并发数，避免逐条串行请求拖慢导入。 */
export const BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY = 4;

/**
 * Chrome、Edge、Firefox 导出文件中常见的虚拟根名称。
 * 虚拟根只用于解析边界，不应持久化为 Linkit Category。
 */
export const BROWSER_BOOKMARKS_VIRTUAL_ROOT_NAMES = [
  'Bookmarks Bar',
  'Bookmarks bar',
  'Bookmarks Toolbar',
  'Bookmarks Menu',
  'Favorites Bar',
  'Favorites bar',
  'Other Bookmarks',
  'Mobile Bookmarks',
  'Browser Toolbar',
  '书签栏',
  '书签工具栏',
  '书签菜单',
  '收藏夹栏',
  '其他书签',
  '移动设备书签',
] as const;

const normalizedVirtualRootNames = new Set(
  BROWSER_BOOKMARKS_VIRTUAL_ROOT_NAMES.map((name) => name.normalize('NFKC').trim().toLocaleLowerCase()),
);

export function isBrowserBookmarkVirtualRootName(name: string): boolean {
  return normalizedVirtualRootNames.has(name.normalize('NFKC').trim().toLocaleLowerCase());
}

export function buildBrowserBookmarksFileName(now: string): string {
  return `linkit-bookmarks-${now.slice(0, 10)}.html`;
}
