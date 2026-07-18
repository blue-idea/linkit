import type { AIContext } from '../../ai';
import type { Bookmark } from '../../../types';
import { searchBookmarks } from '../../../domain/search';

export interface SemanticCandidate {
  id: string;
  title: string;
  domain: string;
  description: string;
  notesExcerpt: string;
  tagLabels: string[];
}

export interface SemanticHit {
  bookmarkId: string;
  score: number;
  reason: string;
}

export interface SemanticRerankClient {
  rerankSemanticSearch(input: {
    context: AIContext;
    query: string;
    candidates: SemanticCandidate[];
  }): Promise<{ results: SemanticHit[] }>;
}

const DEFAULT_CANDIDATE_LIMIT = 40;
const NOTES_EXCERPT_MAX = 240;

/**
 * 本地候选筛选：关键词命中优先，不足时补齐库内条目；仅库内 ID。
 * REQ-018-AC-001
 */
export function buildSemanticCandidates(input: {
  query: string;
  bookmarks: Bookmark[];
  tagLabelsById: Record<string, string>;
  limit?: number;
}): SemanticCandidate[] {
  const limit = input.limit ?? DEFAULT_CANDIDATE_LIMIT;
  const hits = searchBookmarks(input.query, input.bookmarks, limit);
  const orderedIds = hits.map((hit) => hit.id);
  if (orderedIds.length < limit) {
    for (const bookmark of input.bookmarks) {
      if (orderedIds.includes(bookmark.id)) continue;
      orderedIds.push(bookmark.id);
      if (orderedIds.length >= limit) break;
    }
  }

  const byId = new Map(input.bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  return orderedIds
    .map((id) => byId.get(id))
    .filter((bookmark): bookmark is Bookmark => Boolean(bookmark))
    .map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      domain: bookmark.domain,
      description: bookmark.description ?? '',
      notesExcerpt: (bookmark.notes ?? '').slice(0, NOTES_EXCERPT_MAX),
      tagLabels: bookmark.tags
        .map((tagId) => input.tagLabelsById[tagId])
        .filter((label): label is string => Boolean(label)),
    }));
}

export function validateSemanticResults(
  results: SemanticHit[],
  candidateIds: Set<string>
): SemanticHit[] | null {
  const seen = new Set<string>();
  const validated: SemanticHit[] = [];
  for (const item of results) {
    if (!candidateIds.has(item.bookmarkId)) {
      return null;
    }
    if (!Number.isFinite(item.score) || item.score < 0 || item.score > 1) {
      return null;
    }
    if (seen.has(item.bookmarkId)) {
      continue;
    }
    seen.add(item.bookmarkId);
    validated.push({
      bookmarkId: item.bookmarkId,
      score: item.score,
      reason: item.reason ?? '',
    });
  }
  return validated;
}

export type SemanticSearchMode = 'semantic' | 'keyword-fallback';

export interface SemanticSearchOutcome {
  mode: SemanticSearchMode;
  results: SemanticHit[];
  fallbackMessage: string | null;
  empty: boolean;
}

function mapSemanticFailure(error: { code?: string; message?: string }): string {
  const code = error.code ?? '';
  if (code === 'SECRET_NOT_CONFIGURED') {
    return 'AI API Key is not configured. Showing keyword results instead — no fabricated semantic score was used.';
  }
  if (code === 'AI_CONSENT_REQUIRED') {
    return 'AI data consent is required. Showing keyword results instead.';
  }
  return 'Semantic search is unavailable. Showing keyword results instead — no fabricated semantic score was used.';
}

function extractError(error: unknown): { code?: string; message?: string } {
  if (error && typeof error === 'object') {
    const record = error as { code?: string; message?: string };
    return { code: record.code, message: record.message };
  }
  return {};
}

/**
 * 语义搜索：AI 重排成功则返回库内排序；失败回退关键词。
 * REQ-018-AC-001~003
 */
export async function runSemanticSearch(input: {
  query: string;
  bookmarks: Bookmark[];
  tagLabelsById: Record<string, string>;
  context: AIContext;
  client: SemanticRerankClient;
  keywordLimit?: number;
  candidateLimit?: number;
}): Promise<SemanticSearchOutcome> {
  const query = input.query.trim();
  const keywordLimit = input.keywordLimit ?? 8;
  if (!query) {
    return { mode: 'semantic', results: [], fallbackMessage: null, empty: true };
  }

  const candidates = buildSemanticCandidates({
    query,
    bookmarks: input.bookmarks,
    tagLabelsById: input.tagLabelsById,
    limit: input.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT,
  });
  const candidateIds = new Set(candidates.map((item) => item.id));

  const toKeywordFallback = (message: string): SemanticSearchOutcome => {
    const keywordHits = searchBookmarks(query, input.bookmarks, keywordLimit).map((hit) => ({
      bookmarkId: hit.id,
      // 关键词回退不展示伪造语义分；固定占位且 reason=keyword 供 UI 区分。
      score: 0,
      reason: 'keyword',
    }));
    return {
      mode: 'keyword-fallback',
      results: keywordHits,
      fallbackMessage: message,
      empty: keywordHits.length === 0,
    };
  };

  if (candidates.length === 0) {
    return {
      mode: 'semantic',
      results: [],
      fallbackMessage: null,
      empty: true,
    };
  }

  try {
    const response = await input.client.rerankSemanticSearch({
      context: input.context,
      query,
      candidates,
    });
    const validated = validateSemanticResults(response.results ?? [], candidateIds);
    if (!validated) {
      return toKeywordFallback(mapSemanticFailure({ code: 'AI_RESPONSE_INVALID' }));
    }
    return {
      mode: 'semantic',
      results: validated,
      fallbackMessage: null,
      empty: validated.length === 0,
    };
  } catch (error) {
    return toKeywordFallback(mapSemanticFailure(extractError(error)));
  }
}
