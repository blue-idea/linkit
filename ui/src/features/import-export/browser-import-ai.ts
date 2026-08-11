import { isHttpFaviconValue } from '../../domain/bookmark-icon';
import { BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY } from '../../config/browser-bookmarks';
import type { AppSettings, LibraryData } from '../../types';
import type { MetadataFetchResult } from '../bookmarks/analysis';
import type { AnalyzeBookmarkClient } from '../ai';
import type { BrowserImportProgress, BrowserImportProgressStage } from './restore';

export interface BrowserImportAIResult {
  library: LibraryData;
  updatedBookmarkIds: string[];
  // metadata 合并前的导入基线，用于保护导入后用户的即时编辑。
  baseLibrary?: LibraryData;
  metadataUpdatedBookmarkIds?: string[];
  metadataFailedBookmarkIds?: string[];
}

export interface BrowserImportEnrichmentInput {
  library: LibraryData;
  importedBookmarkIds: string[];
  settings: AppSettings;
  client?: AnalyzeBookmarkClient;
  fetchMetadata: (url: string) => Promise<MetadataFetchResult>;
  idFactory?: () => string;
  onProgress?: (progress: BrowserImportProgress) => void;
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

function reportProgress(
  callback: BrowserImportEnrichmentInput['onProgress'],
  stage: BrowserImportProgressStage,
  completed: number,
  total: number,
): void {
  try {
    callback?.({ stage, completed, total });
  } catch {
    // 进度回调属于界面附加能力，异常不得中断导入。
  }
}

type PoolResult<T> = {
  value?: T;
  error?: unknown;
};

/**
 * 受控并发执行异步任务，结果数组始终保持输入顺序。
 * 单项异常收集到对应位置，不会取消其他 worker。
 */
async function mapWithConcurrency<T>(input: {
  items: readonly string[];
  limit: number;
  worker: (item: string) => Promise<T>;
  onSettled?: () => void;
}): Promise<Array<PoolResult<T>>> {
  const results: Array<PoolResult<T>> = Array.from({ length: input.items.length }, () => ({}));
  let nextIndex = 0;
  const workerCount = Math.min(
    input.items.length,
    Math.max(1, Math.floor(input.limit)),
  );

  const run = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= input.items.length) {
        return;
      }

      try {
        results[index] = { value: await input.worker(input.items[index]) };
      } catch (error) {
        results[index] = { error };
      } finally {
        input.onSettled?.();
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => run()));
  return results;
}

function hasHttpFavicon(value: string | null | undefined): value is string {
  return Boolean(value && isHttpFaviconValue(value));
}

function applyMetadataToBookmark(
  bookmark: LibraryData['bookmarks'][number],
  metadata: MetadataFetchResult,
): boolean {
  if (!metadata.ok) {
    return false;
  }

  let changed = false;
  const title = metadata.title.trim();
  const description = metadata.description.trim();
  const favicon = metadata.favicon?.trim() ?? '';

  if (title && bookmark.title !== title) {
    bookmark.title = title;
    changed = true;
  }
  if (description && bookmark.description !== description) {
    bookmark.description = description;
    changed = true;
  }
  // 仅持久化 HTTP(S) favicon，避免把 data URL 写入正式库。
  if (hasHttpFavicon(favicon) && bookmark.favicon !== favicon) {
    bookmark.favicon = favicon;
    changed = true;
  }

  return changed;
}

async function fetchMetadataSafely(
  fetchMetadata: (url: string) => Promise<MetadataFetchResult>,
  url: string,
): Promise<MetadataFetchResult> {
  try {
    const result = await fetchMetadata(url);
    if (!result || typeof result.ok !== 'boolean') {
      return {
        ok: false,
        code: 'METADATA_FETCH_FAILED',
        message: 'Metadata service returned an invalid response',
      };
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch page metadata';
    return { ok: false, code: 'METADATA_FETCH_FAILED', message };
  }
}

/**
 * 合并异步 metadata 结果：仅替换标题、描述和 favicon，
 * 且只在这些字段未被用户二次编辑时才应用。
 * REQ-035-AC-007 / REQ-035-AC-008 / DATA-INV-019
 */
export function mergeBrowserImportAIResult(
  current: LibraryData,
  result: BrowserImportAIResult,
): LibraryData {
  if (result.updatedBookmarkIds.length === 0) {
    return current;
  }

  const updatedBookmarkIds = new Set(result.updatedBookmarkIds);
  const bookmarkById = new Map(
    result.library.bookmarks.map((bookmark) => [bookmark.id, bookmark]),
  );
  const baseBookmarkById = new Map(
    (result.baseLibrary?.bookmarks ?? []).map((bookmark) => [bookmark.id, bookmark]),
  );

  const bookmarks = current.bookmarks.map((bookmark) => {
    if (!updatedBookmarkIds.has(bookmark.id)) {
      return bookmark;
    }
    const enriched = bookmarkById.get(bookmark.id);
    if (!enriched) {
      return bookmark;
    }

    const baseline = baseBookmarkById.get(bookmark.id);
    const untouched = <K extends keyof typeof bookmark>(field: K): boolean =>
      !baseline || bookmark[field] === baseline[field];
    const next = { ...bookmark };

    if (untouched('title') && enriched.title.trim()) {
      next.title = enriched.title;
    }
    if (untouched('description') && enriched.description.trim()) {
      next.description = enriched.description;
    }
    if (untouched('favicon') && enriched.favicon.trim()) {
      next.favicon = enriched.favicon;
    }

    return next;
  });

  return {
    bookmarks,
    categories: current.categories.map((category) => ({ ...category })),
    collections: current.collections.map((collection) => ({
      ...collection,
      bookmarkIds: [...collection.bookmarkIds],
    })),
    tags: current.tags.map((tag) => ({ ...tag })),
  };
}

/**
 * 浏览器书签导入 enrichment：仅执行 metadata 补全，不再触发任何 AI 后处理。
 * metadata 单条失败只影响当前项，整体仍继续完成。
 */
export async function enrichImportedBookmarks(
  input: BrowserImportEnrichmentInput,
): Promise<BrowserImportAIResult> {
  // 保留旧输入字段以兼容现有调用方；metadata-only 模式下不再使用这些字段。
  void input.settings;
  void input.client;
  void input.idFactory;

  const baseLibrary = cloneLibrary(input.library);
  const snapshot = cloneLibrary(baseLibrary);
  const bookmarkIds = [...new Set(input.importedBookmarkIds)];
  const total = bookmarkIds.length;
  const updatedIds = new Set<string>();
  const metadataUpdatedIds = new Set<string>();
  const metadataFailedIds = new Set<string>();

  reportProgress(input.onProgress, 'metadata', 0, total);
  let metadataCompleted = 0;
  const metadataResults = await mapWithConcurrency({
    items: bookmarkIds,
    limit: BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY,
    worker: async (bookmarkId) => {
      const bookmark = snapshot.bookmarks.find((item) => item.id === bookmarkId);
      if (!bookmark) {
        return null;
      }

      const metadata = await fetchMetadataSafely(input.fetchMetadata, bookmark.url);
      return { bookmarkId, metadata };
    },
    onSettled: () => {
      metadataCompleted += 1;
      reportProgress(input.onProgress, 'metadata', metadataCompleted, total);
    },
  });

  // 只在 worker 完成后按输入顺序应用 metadata，避免并发写共享快照。
  metadataResults.forEach((entry, index) => {
    if (entry.error || !entry.value) {
      const bookmarkId = bookmarkIds[index];
      if (bookmarkId) {
        metadataFailedIds.add(bookmarkId);
      }
      return;
    }

    const { bookmarkId, metadata } = entry.value;
    const bookmark = snapshot.bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) {
      return;
    }
    if (!metadata.ok) {
      metadataFailedIds.add(bookmarkId);
      return;
    }
    if (applyMetadataToBookmark(bookmark, metadata)) {
      metadataUpdatedIds.add(bookmarkId);
      updatedIds.add(bookmarkId);
    }
  });

  reportProgress(input.onProgress, 'complete', total, total);
  if (updatedIds.size === 0) {
    return {
      library: input.library,
      updatedBookmarkIds: [],
      metadataUpdatedBookmarkIds: [],
      metadataFailedBookmarkIds: [...metadataFailedIds],
    };
  }

  return {
    library: snapshot,
    updatedBookmarkIds: bookmarkIds.filter((id) => updatedIds.has(id)),
    baseLibrary,
    metadataUpdatedBookmarkIds: bookmarkIds.filter((id) => metadataUpdatedIds.has(id)),
    metadataFailedBookmarkIds: [...metadataFailedIds],
  };
}

/** 兼容旧调用方的函数名。*/
export const enrichImportedBookmarksWithAI = enrichImportedBookmarks;
