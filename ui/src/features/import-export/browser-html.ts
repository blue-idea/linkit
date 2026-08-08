import {
  BROWSER_BOOKMARKS_DEFAULT_TITLE,
  BROWSER_BOOKMARKS_FAVICON_COLOR,
  BROWSER_BOOKMARKS_FOLDER_COLOR,
  BROWSER_BOOKMARKS_FOLDER_ICON,
} from '../../config/browser-bookmarks';
import { normalizeBookmarkUrl } from '../../domain/commands';
import type { Bookmark, Category, LibraryData } from '../../types';
import { IMPORT_ERROR_MESSAGES, type ImportErrorKey } from './document';

export type BrowserBookmarkImportSummary = {
  mode: 'browser-bookmarks';
  folders: number;
  bookmarks: number;
  newBookmarks: number;
  skippedDuplicates: number;
};

export type BrowserBookmarkPendingImport = {
  kind: 'library';
  snapshot: LibraryData;
  summary: BrowserBookmarkImportSummary;
  importedBookmarkIds: string[];
};

export type BrowserBookmarkParseResult =
  | {
      success: true;
      pendingImport: BrowserBookmarkPendingImport;
    }
  | {
      success: false;
      error: {
        key: ImportErrorKey;
        message: string;
      };
    };

type ParsedBrowserBookmark = {
  title: string;
  url: string;
  folderPath: string[];
};

const ROOT_CATEGORY_KEY = '__root__';

function invalidImport(): BrowserBookmarkParseResult {
  return {
    success: false,
    error: {
      key: 'IMPORT_INVALID',
      message: IMPORT_ERROR_MESSAGES.IMPORT_INVALID.en,
    },
  };
}

function cloneLibrary(library: LibraryData): LibraryData {
  return {
    bookmarks: library.bookmarks.map((bookmark) => ({
      ...bookmark,
      tags: [...bookmark.tags],
      collectionIds: [...bookmark.collectionIds],
      aiSuggestedTags: bookmark.aiSuggestedTags ? [...bookmark.aiSuggestedTags] : undefined,
      spark: bookmark.spark ? [...bookmark.spark] : undefined,
    })),
    categories: library.categories.map((category) => ({ ...category })),
    collections: library.collections.map((collection) => ({
      ...collection,
      bookmarkIds: [...collection.bookmarkIds],
    })),
    tags: library.tags.map((tag) => ({ ...tag })),
  };
}

function pathKey(path: string[]): string {
  return JSON.stringify(path);
}

function pathFromKey(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(key);
    return Array.isArray(parsed) && parsed.every((segment) => typeof segment === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function toBookmarkTimestamp(value: string): string | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return null;
  }
  return String(Math.floor(time / 1000));
}

function normalizeUrlKey(raw: string): string | null {
  const normalized = normalizeBookmarkUrl(raw);
  if (!normalized.ok) {
    return null;
  }
  return normalized.url.replace(/\/+$/, '');
}

function collectExistingCategoryPaths(categories: Category[]): Map<string, string> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const cache = new Map<string, string[]>();

  const resolvePath = (categoryId: string): string[] => {
    const cached = cache.get(categoryId);
    if (cached) {
      return cached;
    }
    const visited = new Set<string>();
    const segments: string[] = [];
    let current = byId.get(categoryId) ?? null;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      segments.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) ?? null : null;
    }
    cache.set(categoryId, segments);
    return segments;
  };

  return new Map(categories.map((category) => [pathKey(resolvePath(category.id)), category.id]));
}

function findNestedDl(node: Element): HTMLDListElement | null {
  const nestedChild = Array.from(node.children).find((child) => child.tagName === 'DL');
  if (nestedChild instanceof HTMLDListElement) {
    return nestedChild;
  }
  let sibling = node.nextElementSibling;
  while (sibling && sibling.tagName === 'P') {
    sibling = sibling.nextElementSibling;
  }
  return sibling instanceof HTMLDListElement ? sibling : null;
}

function collectBookmarksFromDl(
  dl: HTMLDListElement,
  folderPath: string[],
  folders: Set<string>,
  bookmarks: ParsedBrowserBookmark[],
): void {
  for (const child of Array.from(dl.children)) {
    if (!(child instanceof HTMLElement) || child.tagName !== 'DT') {
      continue;
    }

    const folder = Array.from(child.children).find(
      (element): element is HTMLHeadingElement => element instanceof HTMLHeadingElement && element.tagName === 'H3',
    );
    if (folder) {
      const name = folder.textContent?.trim() ?? '';
      const nextPath = name ? [...folderPath, name] : [...folderPath];
      if (name) {
        folders.add(pathKey(nextPath));
      }
      const nestedDl = findNestedDl(child);
      if (nestedDl) {
        collectBookmarksFromDl(nestedDl, nextPath, folders, bookmarks);
      }
      continue;
    }

    const anchor = Array.from(child.children).find(
      (element): element is HTMLAnchorElement => element instanceof HTMLAnchorElement && element.tagName === 'A',
    );
    if (!anchor) {
      continue;
    }

    const href = anchor.getAttribute('href')?.trim() ?? '';
    const title = anchor.textContent?.trim() || href;
    if (!href) {
      continue;
    }
    bookmarks.push({ title, url: href, folderPath: [...folderPath] });
  }
}

function ensureCategoryPath(
  snapshot: LibraryData,
  categoryIdsByPath: Map<string, string>,
  path: string[],
  idFactory: () => string,
): string {
  let parentId: string | null = null;
  let currentPath: string[] = [];

  for (const name of path) {
    currentPath = [...currentPath, name];
    const key = pathKey(currentPath);
    const existing = categoryIdsByPath.get(key);
    if (existing) {
      parentId = existing;
      continue;
    }

    const createdId = idFactory();
    snapshot.categories.push({
      id: createdId,
      name,
      icon: BROWSER_BOOKMARKS_FOLDER_ICON,
      parentId,
      color: BROWSER_BOOKMARKS_FOLDER_COLOR,
    });
    categoryIdsByPath.set(key, createdId);
    parentId = createdId;
  }

  return parentId ?? '';
}

function createImportedBookmark(
  candidate: ParsedBrowserBookmark,
  now: string,
  id: string,
  categoryId: string,
): Bookmark {
  const normalized = normalizeBookmarkUrl(candidate.url);
  if (!normalized.ok) {
    throw new Error('createImportedBookmark requires a normalized URL');
  }
  const fallbackTitle = candidate.title.trim() || normalized.domain;
  return {
    id,
    title: fallbackTitle,
    url: normalized.url,
    domain: normalized.domain,
    favicon: normalized.domain.charAt(0).toUpperCase() || '?',
    faviconColor: BROWSER_BOOKMARKS_FAVICON_COLOR,
    description: '',
    notes: '',
    tags: [],
    categoryId,
    collectionIds: [],
    createdAt: now,
    lastVisitedAt: null,
    visitCount: 0,
    starred: false,
    pinned: false,
    readStatus: 'unread',
  };
}

function renderBookmark(bookmark: Bookmark): string {
  const addDate = toBookmarkTimestamp(bookmark.createdAt);
  const timestamp = addDate ? ` ADD_DATE="${addDate}"` : '';
  return `<DT><A HREF="${escapeAttribute(bookmark.url)}"${timestamp}>${escapeHtml(bookmark.title)}</A>`;
}

function groupBookmarksByCategory(bookmarks: Bookmark[]): Map<string, Bookmark[]> {
  const grouped = new Map<string, Bookmark[]>();
  for (const bookmark of bookmarks) {
    const key = bookmark.categoryId || ROOT_CATEGORY_KEY;
    const list = grouped.get(key) ?? [];
    list.push(bookmark);
    grouped.set(key, list);
  }
  return grouped;
}

function groupCategoriesByParent(categories: Category[]): Map<string, Category[]> {
  const grouped = new Map<string, Category[]>();
  const byId = new Map(categories.map((category) => [category.id, category]));

  // 防御异常数据中的父子环：将环上的节点降级到根层，避免导出递归溢出或静默丢失。
  const hasInvalidParentChain = (category: Category): boolean => {
    const visited = new Set<string>();
    let current: Category | undefined = category;
    while (current) {
      if (visited.has(current.id)) {
        return true;
      }
      visited.add(current.id);
      if (!current.parentId) {
        return false;
      }
      current = byId.get(current.parentId);
      if (!current) {
        return true;
      }
    }
    return false;
  };

  for (const category of categories) {
    const parentKey =
      !hasInvalidParentChain(category) && category.parentId && byId.has(category.parentId)
        ? category.parentId
        : ROOT_CATEGORY_KEY;
    const list = grouped.get(parentKey) ?? [];
    list.push(category);
    grouped.set(parentKey, list);
  }
  return grouped;
}

function renderCategoryEntries(
  categoryId: string | null,
  categoriesByParent: Map<string, Category[]>,
  bookmarksByCategory: Map<string, Bookmark[]>,
  exportedAt: string,
  depth = 0,
  visited = new Set<string>(),
): string[] {
  const key = categoryId ?? ROOT_CATEGORY_KEY;
  const indent = '    '.repeat(depth + 1);
  const lines: string[] = [];

  for (const category of categoriesByParent.get(key) ?? []) {
    if (visited.has(category.id)) {
      continue;
    }
    visited.add(category.id);
    const modifiedAt = toBookmarkTimestamp(exportedAt);
    const folderHeader = modifiedAt
      ? `${indent}<DT><H3 LAST_MODIFIED="${modifiedAt}">${escapeHtml(category.name)}</H3>`
      : `${indent}<DT><H3>${escapeHtml(category.name)}</H3>`;
    lines.push(folderHeader);
    lines.push(`${indent}<DL><p>`);
    lines.push(
      ...renderCategoryEntries(
        category.id,
        categoriesByParent,
        bookmarksByCategory,
        exportedAt,
        depth + 1,
        visited,
      ),
    );
    lines.push(`${indent}</DL><p>`);
  }

  for (const bookmark of bookmarksByCategory.get(key) ?? []) {
    lines.push(`${indent}${renderBookmark(bookmark)}`);
  }

  return lines;
}

export function buildBrowserBookmarkHtml(
  library: LibraryData,
  options: { title?: string; exportedAt: string },
): string {
  const title = options.title?.trim() || BROWSER_BOOKMARKS_DEFAULT_TITLE;
  const categoriesByParent = groupCategoriesByParent(library.categories);
  const bookmarksByCategory = groupBookmarksByCategory(library.bookmarks);

  return [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    `<TITLE>${escapeHtml(title)}</TITLE>`,
    `<H1>${escapeHtml(title)}</H1>`,
    '<DL><p>',
    ...renderCategoryEntries(null, categoriesByParent, bookmarksByCategory, options.exportedAt),
    '</DL><p>',
  ].join('\n');
}

export function parseBrowserBookmarkHtml(
  raw: string,
  options: {
    library: LibraryData;
    now: string;
    idFactory?: () => string;
  },
): BrowserBookmarkParseResult {
  const document = new DOMParser().parseFromString(raw, 'text/html');
  const rootDl = document.querySelector('dl');
  if (!(rootDl instanceof HTMLDListElement)) {
    return invalidImport();
  }

  const folders = new Set<string>();
  const parsedBookmarks: ParsedBrowserBookmark[] = [];
  collectBookmarksFromDl(rootDl, [], folders, parsedBookmarks);

  if (folders.size === 0 && parsedBookmarks.length === 0) {
    return invalidImport();
  }

  const snapshot = cloneLibrary(options.library);
  const nextId = options.idFactory ?? (() => crypto.randomUUID());
  const categoryIdsByPath = collectExistingCategoryPaths(snapshot.categories);

  const seenUrls = new Set(
    snapshot.bookmarks
      .map((bookmark) => normalizeUrlKey(bookmark.url))
      .filter((value): value is string => Boolean(value)),
  );

  let skippedDuplicates = 0;
  const acceptedBookmarks: ParsedBrowserBookmark[] = [];
  const newFolderPaths = new Set<string>();

  for (const parsedBookmark of parsedBookmarks) {
    const normalizedKey = normalizeUrlKey(parsedBookmark.url);
    if (!normalizedKey) {
      continue;
    }
    if (seenUrls.has(normalizedKey)) {
      skippedDuplicates += 1;
      continue;
    }
    seenUrls.add(normalizedKey);
    if (parsedBookmark.folderPath.length > 0) {
      newFolderPaths.add(pathKey(parsedBookmark.folderPath));
    }
    acceptedBookmarks.push(parsedBookmark);
  }

  // 只有确认会新增的书签才创建对应分类，重复项不产生空分类副作用。
  for (const folder of newFolderPaths) {
    const segments = pathFromKey(folder);
    ensureCategoryPath(snapshot, categoryIdsByPath, segments, nextId);
  }

  const newBookmarks = acceptedBookmarks.map((parsedBookmark) => {
    const categoryId = parsedBookmark.folderPath.length
      ? categoryIdsByPath.get(pathKey(parsedBookmark.folderPath)) ?? ''
      : '';
    return createImportedBookmark(parsedBookmark, options.now, nextId(), categoryId);
  });

  snapshot.bookmarks = [...snapshot.bookmarks, ...newBookmarks];

  return {
    success: true,
    pendingImport: {
      kind: 'library',
      snapshot,
      importedBookmarkIds: newBookmarks.map((bookmark) => bookmark.id),
      summary: {
        mode: 'browser-bookmarks',
        folders: folders.size,
        bookmarks: parsedBookmarks.length,
        newBookmarks: newBookmarks.length,
        skippedDuplicates,
      },
    },
  };
}
