import { isHttpFaviconValue } from '../../domain/bookmark-icon';
import {
  BROWSER_BOOKMARKS_AI_TAG_LIMIT,
  BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY,
} from '../../config/browser-bookmarks';
import { normalizeApiBase } from '../../services/settings';
import type { MetadataFetchResult } from '../bookmarks/analysis';
import {
  buildInboundMetadataPreview,
  enhanceInboundAnalysis,
  type AnalyzeBookmarkClient,
  type InboundMetadataResult,
} from '../ai';
import { matchSuggestedTags } from '../tags';
import type { AppSettings, LibraryData, Tag } from '../../types';
import type { BrowserImportProgress, BrowserImportProgressStage } from './restore';

export interface BrowserImportAIResult {
  library: LibraryData;
  updatedBookmarkIds: string[];
  /** AI 开始前的导入后基线，用于合并异步结果并保留用户编辑。 */
  baseLibrary?: LibraryData;
  metadataUpdatedBookmarkIds?: string[];
  aiUpdatedBookmarkIds?: string[];
  metadataFailedBookmarkIds?: string[];
  aiFailedBookmarkIds?: string[];
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

function normalizeTagLabel(label: string): string {
  return label.normalize('NFKC').trim().toLocaleLowerCase();
}

function findUniqueTagByLabel(tags: Tag[], label: string): Tag | null {
  const key = normalizeTagLabel(label);
  if (!key) {
    return null;
  }
  const matches = tags.filter((tag) => normalizeTagLabel(tag.label) === key);
  return matches.length === 1 ? matches[0] : null;
}

function createTagId(idFactory: () => string): string {
  return `tag-${idFactory()}`;
}

function ensureSuggestedTagIds(input: {
  library: LibraryData;
  labels: string[];
  limit: number;
  idFactory: () => string;
}): string[] {
  if (input.limit <= 0) {
    return [];
  }
  const matched = matchSuggestedTags(input.labels, input.library.tags);
  const tagIds = [...matched.tagIds].slice(0, input.limit);

  for (const label of matched.unmatchedLabels) {
    if (tagIds.length >= input.limit) {
      break;
    }
    const existing = findUniqueTagByLabel(input.library.tags, label);
    if (existing) {
      if (!tagIds.includes(existing.id)) {
        tagIds.push(existing.id);
      }
      continue;
    }

    const created: Tag = {
      id: createTagId(input.idFactory),
      label: label.trim(),
      color: 'gray',
    };
    input.library.tags.push(created);
    tagIds.push(created.id);
  }

  return tagIds.slice(0, input.limit);
}

export function shouldEnrichBrowserImportWithAI(
  settings: AppSettings,
  importedBookmarkIds: string[],
): boolean {
  const normalizedApiBase = normalizeApiBase(settings.ai.apiBase);
  const consentMatches = Boolean(
    settings.aiConsent
      && normalizeApiBase(settings.aiConsent.apiBase) === normalizedApiBase,
  );

  return Boolean(
    importedBookmarkIds.length > 0
      && normalizedApiBase
      && settings.ai.model.trim()
      && consentMatches,
  );
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
    // 进度观察者属于 UI 附加能力，异常不得中断导入。
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
  // Linkit 书签 schema 只持久化 HTTP(S) favicon；data URL 仅供预览层使用。
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
 * 合并异步 enrichment 结果：仅将基线未被用户修改的字段替换为增强值。
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
  const knownCategoryIds = new Set(current.categories.map((category) => category.id));
  const knownTagIds = new Set(current.tags.map((tag) => tag.id));
  const newCategories = result.library.categories.filter((category) => !knownCategoryIds.has(category.id));
  const newTags = result.library.tags.filter((tag) => !knownTagIds.has(tag.id));
  const validCategoryIds = new Set([
    ...knownCategoryIds,
    ...newCategories.map((category) => category.id),
  ]);
  const validTagIds = new Set([
    ...knownTagIds,
    ...newTags.map((tag) => tag.id),
  ]);
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
    if (
      untouched('categoryId')
      && enriched.categoryId
      && validCategoryIds.has(enriched.categoryId)
    ) {
      next.categoryId = enriched.categoryId;
    }

    const baselineTagIds = new Set(baseline?.tags ?? []);
    const aiTagIds = enriched.tags.filter(
      (tagId) => validTagIds.has(tagId) && !baselineTagIds.has(tagId),
    );
    next.tags = [...new Set([...bookmark.tags, ...aiTagIds])]
      .slice(0, BROWSER_BOOKMARKS_AI_TAG_LIMIT);
    return next;
  });

  return {
    bookmarks,
    categories: [
      ...current.categories.map((category) => ({ ...category })),
      ...newCategories.map((category) => ({ ...category })),
    ],
    collections: current.collections.map((collection) => ({
      ...collection,
      bookmarkIds: [...collection.bookmarkIds],
    })),
    tags: [
      ...current.tags.map((tag) => ({ ...tag })),
      ...newTags.map((tag) => ({ ...tag })),
    ],
  };
}

/**
 * 浏览器书签导入 enrichment：先逐条获取 metadata，再按条件调用 AI。
 * metadata 或 AI 的单条失败只影响当前条目；所有阶段均通过回调报告进度。
 */
export async function enrichImportedBookmarks(
  input: BrowserImportEnrichmentInput,
): Promise<BrowserImportAIResult> {
  const baseLibrary = cloneLibrary(input.library);
  const snapshot = cloneLibrary(baseLibrary);
  const bookmarkIds = [...new Set(input.importedBookmarkIds)];
  const total = bookmarkIds.length;
  const updatedIds = new Set<string>();
  const metadataUpdatedIds = new Set<string>();
  const aiUpdatedIds = new Set<string>();
  const metadataFailedIds = new Set<string>();
  const aiFailedIds = new Set<string>();
  const metadataByBookmarkId = new Map<string, InboundMetadataResult>();
  const nextId = input.idFactory ?? (() => crypto.randomUUID());

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
      const base = await buildInboundMetadataPreview({
        url: bookmark.url,
        titleHint: bookmark.title,
        contentText: '',
        fetchMetadata: async () => metadata,
      });
      return { bookmarkId, metadata, base };
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
      if (bookmarkId) metadataFailedIds.add(bookmarkId);
      return;
    }
    const { bookmarkId, metadata, base } = entry.value;
    metadataByBookmarkId.set(bookmarkId, base);
    const bookmark = snapshot.bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) {
      return;
    }
    if (!metadata.ok) {
      metadataFailedIds.add(bookmarkId);
    } else if (applyMetadataToBookmark(bookmark, metadata)) {
      metadataUpdatedIds.add(bookmarkId);
      updatedIds.add(bookmarkId);
    }
  });

  const aiEnabled = Boolean(
    input.client && shouldEnrichBrowserImportWithAI(input.settings, bookmarkIds),
  );
  if (aiEnabled && input.client) {
    const client = input.client;
    reportProgress(input.onProgress, 'ai', 0, total);
    const context = {
      apiBase: input.settings.ai.apiBase.trim(),
      model: input.settings.ai.model.trim(),
      locale: input.settings.locale ?? 'en',
    } as const;

    let aiCompleted = 0;
    const aiResults = await mapWithConcurrency({
      items: bookmarkIds,
      limit: BROWSER_BOOKMARKS_ENRICHMENT_CONCURRENCY,
      worker: async (bookmarkId) => {
        const bookmark = snapshot.bookmarks.find((item) => item.id === bookmarkId);
        const base = metadataByBookmarkId.get(bookmarkId);
        if (!bookmark || !base) {
          return null;
        }
        return {
          bookmarkId,
          result: await enhanceInboundAnalysis({
            base,
            url: bookmark.url,
            categoryCandidates: snapshot.categories.map((category) => ({
              id: category.id,
              name: category.name,
            })),
            tagCandidates: snapshot.tags.map((tag) => ({
              id: tag.id,
              label: tag.label,
            })),
            context,
            client,
          }),
        };
      },
      onSettled: () => {
        aiCompleted += 1;
        reportProgress(input.onProgress, 'ai', aiCompleted, total);
      },
    });

    // AI 请求可并发，但 Category/Tag 共享状态必须按导入顺序串行应用。
    aiResults.forEach((entry, index) => {
      if (entry.error || !entry.value) {
        const bookmarkId = bookmarkIds[index];
        if (bookmarkId) aiFailedIds.add(bookmarkId);
        return;
      }
      const { bookmarkId, result } = entry.value;
      const bookmark = snapshot.bookmarks.find((item) => item.id === bookmarkId);
      if (!bookmark) {
        return;
      }

      if (result.source === 'ai') {
        let changed = false;
        if (
          result.preview.suggestedCategoryId
          && snapshot.categories.some((category) => category.id === result.preview.suggestedCategoryId)
          && bookmark.categoryId !== result.preview.suggestedCategoryId
        ) {
          bookmark.categoryId = result.preview.suggestedCategoryId;
          changed = true;
        }

        const availableSlots = Math.max(
          0,
          BROWSER_BOOKMARKS_AI_TAG_LIMIT - bookmark.tags.length,
        );
        const suggestedTagIds = ensureSuggestedTagIds({
          library: snapshot,
          labels: result.preview.suggestedTags,
          limit: availableSlots,
          idFactory: nextId,
        });
        const mergedTagIds = [...new Set([...bookmark.tags, ...suggestedTagIds])]
          .slice(0, BROWSER_BOOKMARKS_AI_TAG_LIMIT);
        if (
          mergedTagIds.length !== bookmark.tags.length
          || mergedTagIds.some((tagId, tagIndex) => tagId !== bookmark.tags[tagIndex])
        ) {
          bookmark.tags = mergedTagIds;
          changed = true;
        }

        if (changed) {
          aiUpdatedIds.add(bookmarkId);
          updatedIds.add(bookmarkId);
        }
      } else if (result.aiErrorMessage) {
        aiFailedIds.add(bookmarkId);
      }
    });
  }

  reportProgress(input.onProgress, 'complete', total, total);
  if (updatedIds.size === 0) {
    return {
      library: input.library,
      updatedBookmarkIds: [],
      metadataUpdatedBookmarkIds: [],
      aiUpdatedBookmarkIds: [],
      metadataFailedBookmarkIds: [...metadataFailedIds],
      aiFailedBookmarkIds: [...aiFailedIds],
    };
  }

  return {
    library: snapshot,
    updatedBookmarkIds: bookmarkIds.filter((id) => updatedIds.has(id)),
    baseLibrary,
    metadataUpdatedBookmarkIds: bookmarkIds.filter((id) => metadataUpdatedIds.has(id)),
    aiUpdatedBookmarkIds: bookmarkIds.filter((id) => aiUpdatedIds.has(id)),
    metadataFailedBookmarkIds: [...metadataFailedIds],
    aiFailedBookmarkIds: [...aiFailedIds],
  };
}

/** 兼容 TASK-080 调用方的旧函数名。 */
export const enrichImportedBookmarksWithAI = enrichImportedBookmarks;
