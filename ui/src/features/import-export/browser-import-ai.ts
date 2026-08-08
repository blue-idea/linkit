import { BROWSER_BOOKMARKS_AI_TAG_LIMIT } from '../../config/browser-bookmarks';
import { normalizeApiBase } from '../../services/settings';
import type { MetadataFetchResult } from '../bookmarks/analysis';
import { buildInboundMetadataPreview, enhanceInboundAnalysis, type AnalyzeBookmarkClient } from '../ai';
import { matchSuggestedTags } from '../tags';
import type { AppSettings, LibraryData, Tag } from '../../types';

export interface BrowserImportAIResult {
  library: LibraryData;
  updatedBookmarkIds: string[];
  /** AI 开始前的导入后基线，用于只合并 AI 增量并保留用户编辑。 */
  baseLibrary?: LibraryData;
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
  const knownTagIds = new Set(current.tags.map((tag) => tag.id));
  const newTags = result.library.tags.filter((tag) => !knownTagIds.has(tag.id));
  const validCategoryIds = new Set(current.categories.map((category) => category.id));
  const validTagIds = new Set([...knownTagIds, ...newTags.map((tag) => tag.id)]);
  const baseBookmarkById = new Map(
    (result.baseLibrary?.bookmarks ?? []).map((bookmark) => [bookmark.id, bookmark]),
  );

  return {
    bookmarks: current.bookmarks.map((bookmark) =>
      updatedBookmarkIds.has(bookmark.id) && bookmarkById.has(bookmark.id)
        ? (() => {
            const enriched = bookmarkById.get(bookmark.id);
            if (!enriched) return bookmark;
            const baseline = baseBookmarkById.get(bookmark.id);
            const categoryChangedByUser = Boolean(
              baseline && bookmark.categoryId !== baseline.categoryId,
            );
            const categoryId = !categoryChangedByUser && validCategoryIds.has(enriched.categoryId)
              ? enriched.categoryId
              : bookmark.categoryId;
            const baselineTagIds = new Set(baseline?.tags ?? []);
            const aiTagIds = enriched.tags.filter(
              (tagId) => validTagIds.has(tagId) && !baselineTagIds.has(tagId),
            );
            const tags = [...new Set([...bookmark.tags, ...aiTagIds])].slice(
              0,
              BROWSER_BOOKMARKS_AI_TAG_LIMIT,
            );
            return {
              ...bookmark,
              categoryId,
              tags,
            };
          })()
        : bookmark,
    ),
    categories: current.categories.map((category) => ({ ...category })),
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
 * 浏览器书签导入后的 AI 整理仅作用于新增书签，且失败不得影响已落库数据。
 */
export async function enrichImportedBookmarksWithAI(input: {
  library: LibraryData;
  importedBookmarkIds: string[];
  settings: AppSettings;
  client: AnalyzeBookmarkClient;
  fetchMetadata: (url: string) => Promise<MetadataFetchResult>;
  idFactory?: () => string;
}): Promise<BrowserImportAIResult> {
  if (!shouldEnrichBrowserImportWithAI(input.settings, input.importedBookmarkIds)) {
    return { library: input.library, updatedBookmarkIds: [] };
  }

  const baseLibrary = cloneLibrary(input.library);
  const snapshot = cloneLibrary(baseLibrary);
  const updatedBookmarkIds: string[] = [];
  const nextId = input.idFactory ?? (() => crypto.randomUUID());
  const context = {
    apiBase: input.settings.ai.apiBase.trim(),
    model: input.settings.ai.model.trim(),
    locale: input.settings.locale ?? 'en',
  } as const;
  const bookmarkIds = [...new Set(input.importedBookmarkIds)];

  for (const bookmarkId of bookmarkIds) {
    const bookmark = snapshot.bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) {
      continue;
    }

    try {
      const base = await buildInboundMetadataPreview({
        url: bookmark.url,
        titleHint: bookmark.title,
        contentText: '',
        fetchMetadata: input.fetchMetadata,
      });
      const result = await enhanceInboundAnalysis({
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
        client: input.client,
      });
      if (result.source !== 'ai') {
        continue;
      }

      let changed = false;

      if (
        result.preview.suggestedCategoryId
        && snapshot.categories.some((category) => category.id === result.preview.suggestedCategoryId)
        && bookmark.categoryId !== result.preview.suggestedCategoryId
      ) {
        bookmark.categoryId = result.preview.suggestedCategoryId;
        changed = true;
      }

      const suggestedTagIds = ensureSuggestedTagIds({
        library: snapshot,
        labels: result.preview.suggestedTags,
        limit: BROWSER_BOOKMARKS_AI_TAG_LIMIT,
        idFactory: nextId,
      });
      const mergedTagIds = [...new Set([...bookmark.tags, ...suggestedTagIds])]
        .slice(0, BROWSER_BOOKMARKS_AI_TAG_LIMIT);

      if (
        mergedTagIds.length !== bookmark.tags.length
        || mergedTagIds.some((tagId, index) => tagId !== bookmark.tags[index])
      ) {
        bookmark.tags = mergedTagIds;
        changed = true;
      }

      if (changed) {
        updatedBookmarkIds.push(bookmark.id);
      }
    } catch {
      // 单条书签整理失败时继续后续书签，禁止回滚已成功导入的资料库。
      continue;
    }
  }

  if (updatedBookmarkIds.length === 0) {
    return { library: input.library, updatedBookmarkIds: [] };
  }

  return { library: snapshot, updatedBookmarkIds, baseLibrary };
}
