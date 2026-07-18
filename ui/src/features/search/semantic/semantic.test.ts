import { describe, expect, test, vi } from 'vitest';
import {
  buildSemanticCandidates,
  runSemanticSearch,
  validateSemanticResults,
  type SemanticRerankClient,
} from './index';
import type { Bookmark } from '../../../types';

const bookmarks: Bookmark[] = [
  {
    id: 'b-1',
    title: 'Coolors',
    url: 'https://coolors.co',
    domain: 'coolors.co',
    favicon: 'C',
    faviconColor: 'blue',
    description: 'Color palette generator',
    notes: 'daily tool',
    tags: ['t-color'],
    categoryId: 'c-1',
    collectionIds: [],
    starred: false,
    pinned: false,
    thumbnail: 'blue',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastVisitedAt: null,
    visitCount: 1,
    health: 'ok',
    aiSummary: '',
    aiSuggestedTags: [],
  },
  {
    id: 'b-2',
    title: 'React Docs',
    url: 'https://react.dev',
    domain: 'react.dev',
    favicon: 'R',
    faviconColor: 'blue',
    description: 'Official React documentation',
    notes: '',
    tags: ['t-react'],
    categoryId: 'c-2',
    collectionIds: [],
    starred: false,
    pinned: false,
    thumbnail: 'blue',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastVisitedAt: null,
    visitCount: 1,
    health: 'ok',
    aiSummary: '',
    aiSuggestedTags: [],
  },
];

describe('语义搜索本地候选', () => {
  // REQ-018-AC-001：仅从当前资料库生成候选，不引入外部 URL。
  test('buildSemanticCandidates 仅返回库内 ID 与最小字段', () => {
    const candidates = buildSemanticCandidates({
      query: 'color palette',
      bookmarks,
      tagLabelsById: { 't-color': 'color', 't-react': 'react' },
      limit: 10,
    });
    expect(candidates.every((item) => bookmarks.some((b) => b.id === item.id))).toBe(true);
    expect(candidates[0]).toMatchObject({
      id: 'b-1',
      title: 'Coolors',
      domain: 'coolors.co',
    });
    expect(candidates.some((item) => item.id === 'https://evil.example')).toBe(false);
  });
});

describe('语义结果校验', () => {
  test('validateSemanticResults 拒绝候选外 ID 与非法 score', () => {
    const candidateIds = new Set(['b-1', 'b-2']);
    expect(
      validateSemanticResults(
        [{ bookmarkId: 'external', score: 0.9, reason: 'x' }],
        candidateIds
      )
    ).toBeNull();
    expect(
      validateSemanticResults([{ bookmarkId: 'b-1', score: 1.2, reason: 'x' }], candidateIds)
    ).toBeNull();
    expect(
      validateSemanticResults([{ bookmarkId: 'b-1', score: 0.8, reason: 'ok' }], candidateIds)
    ).toEqual([{ bookmarkId: 'b-1', score: 0.8, reason: 'ok' }]);
  });
});

describe('语义搜索执行与降级', () => {
  // REQ-018-AC-001：成功时按相关度返回库内结果。
  test('runSemanticSearch 成功时返回 AI 重排结果', async () => {
    const client: SemanticRerankClient = {
      rerankSemanticSearch: async () => ({
        results: [
          { bookmarkId: 'b-1', score: 0.95, reason: 'palette' },
          { bookmarkId: 'b-2', score: 0.2, reason: 'weak' },
        ],
      }),
    };
    const result = await runSemanticSearch({
      query: 'color tools',
      bookmarks,
      tagLabelsById: { 't-color': 'color', 't-react': 'react' },
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client,
      keywordLimit: 8,
    });
    expect(result.mode).toBe('semantic');
    expect(result.results.map((item) => item.bookmarkId)).toEqual(['b-1', 'b-2']);
    expect(result.fallbackMessage).toBeNull();
    expect(result.results.every((item) => item.score >= 0 && item.score <= 1)).toBe(true);
  });

  // REQ-018-AC-002：AI 失败时英文降级并回退关键词，不伪造语义分。
  test('runSemanticSearch 在 AI 失败时回退关键词且无伪造语义分', async () => {
    const client: SemanticRerankClient = {
      rerankSemanticSearch: async () => {
        throw { code: 'SECRET_NOT_CONFIGURED', message: 'AI API Key is not configured' };
      },
    };
    const result = await runSemanticSearch({
      query: 'Coolors',
      bookmarks,
      tagLabelsById: { 't-color': 'color' },
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client,
      keywordLimit: 8,
    });
    expect(result.mode).toBe('keyword-fallback');
    expect(result.fallbackMessage).toMatch(/unavailable|Key|keyword/i);
    expect(result.results.some((item) => item.bookmarkId === 'b-1')).toBe(true);
    expect(result.results.every((item) => item.reason === 'keyword')).toBe(true);
  });

  // REQ-018-AC-003：无匹配时空状态，不推荐公网 URL。
  test('runSemanticSearch 无结果时返回空列表且不含外部 URL', async () => {
    const client: SemanticRerankClient = {
      rerankSemanticSearch: vi.fn(async () => ({ results: [] })),
    };
    const result = await runSemanticSearch({
      query: 'zzzz-no-match-zzzz',
      bookmarks,
      tagLabelsById: {},
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client,
      keywordLimit: 8,
    });
    expect(result.results).toEqual([]);
    expect(result.empty).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/https?:\/\/(?!coolors|react)/i);
  });
});
