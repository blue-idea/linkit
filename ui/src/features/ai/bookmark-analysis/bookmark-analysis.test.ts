import { describe, expect, test, vi } from 'vitest';
import {
  analyzeBookmarkResultSchema,
  applyReanalyzeConfirmation,
  buildInboundAnalysis,
  mapAIFailureMessage,
  type AnalyzeBookmarkClient,
  type AnalyzeBookmarkResult,
} from './index';

const validResult: AnalyzeBookmarkResult = {
  title: 'AI Title',
  description: 'AI description in locale',
  summary: 'A concise summary',
  suggestedCategoryId: 'cat-1',
  suggestedTags: ['react', 'docs'],
};

describe('AI 入库分析 DTO', () => {
  // REQ-006-AC-002：标题、摘要、分类 ID 与标签建议必须可校验。
  test('analyzeBookmarkResultSchema 接受合法 DTO', () => {
    expect(analyzeBookmarkResultSchema.parse(validResult)).toEqual(validResult);
  });

  test('analyzeBookmarkResultSchema 拒绝未知分类 ID', () => {
    const parsed = analyzeBookmarkResultSchema.safeParse({
      ...validResult,
      suggestedCategoryId: 'cat-missing',
    });
    // 原始 schema 只校验形态；候选集校验由 buildInboundAnalysis 执行。
    expect(parsed.success).toBe(true);
  });

  test('buildInboundAnalysis 在分类不在候选集时视为无效并降级', async () => {
    const client: AnalyzeBookmarkClient = {
      analyzeBookmark: async () => ({
        ...validResult,
        suggestedCategoryId: 'cat-missing',
      }),
    };
    const result = await buildInboundAnalysis({
      url: 'https://example.test',
      titleHint: 'Hint',
      contentText: 'Body',
      categoryCandidates: [{ id: 'cat-1', name: 'Frontend' }],
      tagCandidates: [],
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client,
      fetchMetadata: async () => ({
        ok: true,
        title: 'Meta Title',
        description: 'Meta desc',
        contentText: 'Body',
      }),
    });
    expect(result.aiErrorMessage).toMatch(/unavailable|manual|invalid/i);
    expect(result.preview.suggestedCategoryId).toBeNull();
    expect(result.preview.suggestedTags).toEqual([]);
    expect(result.preview.aiSummary).toBe('');
  });
});

describe('AI 入库分析与降级', () => {
  // REQ-006-AC-002：有效 AI 时合并可编辑预览，确认前不产生入库副作用。
  test('buildInboundAnalysis 成功时合并 AI 建议且不伪造失败结果', async () => {
    const client: AnalyzeBookmarkClient = {
      analyzeBookmark: async () => validResult,
    };
    const result = await buildInboundAnalysis({
      url: 'https://example.test/page',
      titleHint: '',
      contentText: '',
      categoryCandidates: [{ id: 'cat-1', name: 'Frontend' }],
      tagCandidates: [{ id: 'tag-1', label: 'react' }],
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client,
      fetchMetadata: async () => ({
        ok: true,
        title: 'Meta Title',
        description: 'Meta desc',
        contentText: 'Page body',
      }),
    });
    expect(result.preview.title).toBe('AI Title');
    expect(result.preview.description).toBe('AI description in locale');
    expect(result.preview.aiSummary).toBe('A concise summary');
    expect(result.preview.suggestedCategoryId).toBe('cat-1');
    expect(result.preview.suggestedTags).toEqual(['react', 'docs']);
    expect(result.aiErrorMessage).toBeNull();
    expect(result.source).toBe('ai');
  });

  // REQ-006-AC-006：元数据 favicon 透传到入库预览。
  test('buildInboundAnalysis 在元数据成功时返回 faviconUrl', async () => {
    const client: AnalyzeBookmarkClient = {
      analyzeBookmark: async () => validResult,
    };
    const result = await buildInboundAnalysis({
      url: 'https://example.test/page',
      titleHint: '',
      contentText: '',
      categoryCandidates: [{ id: 'cat-1', name: 'Frontend' }],
      tagCandidates: [],
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client,
      fetchMetadata: async () => ({
        ok: true,
        title: 'Meta Title',
        description: 'Meta desc',
        contentText: 'Page body',
        favicon: 'https://cdn.example.test/icon.ico',
      }),
    });
    expect(result.preview.faviconUrl).toBe('https://cdn.example.test/icon.ico');
  });

  test('buildInboundAnalysis 在 AI description 为空时回退元数据描述', async () => {
    const client: AnalyzeBookmarkClient = {
      analyzeBookmark: async () => ({
        ...validResult,
        description: '   ',
      }),
    };
    const result = await buildInboundAnalysis({
      url: 'https://example.test/page',
      titleHint: '',
      contentText: '',
      categoryCandidates: [{ id: 'cat-1', name: 'Frontend' }],
      tagCandidates: [],
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'zh' },
      client,
      fetchMetadata: async () => ({
        ok: true,
        title: 'Meta Title',
        description: 'Meta desc',
        contentText: 'Page body',
      }),
    });
    expect(result.preview.description).toBe('Meta desc');
  });

  // REQ-006-AC-003：无 Key / AI 失败时英文降级，禁止伪 AI 结果。
  test('buildInboundAnalysis 在 AI 失败时显示英文降级且清空 AI 字段', async () => {
    const client: AnalyzeBookmarkClient = {
      analyzeBookmark: async () => {
        throw { code: 'SECRET_NOT_CONFIGURED', message: 'AI API Key is not configured' };
      },
    };
    const result = await buildInboundAnalysis({
      url: 'https://example.test/down',
      titleHint: 'Manual Title',
      contentText: '',
      categoryCandidates: [],
      tagCandidates: [],
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client,
      fetchMetadata: async () => ({
        ok: false,
        code: 'METADATA_FETCH_FAILED',
        message: 'Failed',
      }),
    });
    expect(result.aiErrorMessage).toMatch(/AI analysis is unavailable|manual/i);
    expect(result.preview.aiSummary).toBe('');
    expect(result.preview.suggestedTags).toEqual([]);
    expect(result.preview.title).toBe('Manual Title');
    expect(result.source).toBe('manual');
  });

  test('mapAIFailureMessage 返回稳定英文文案', () => {
    expect(mapAIFailureMessage({ code: 'SECRET_NOT_CONFIGURED' })).toMatch(/API Key/i);
    expect(mapAIFailureMessage({ code: 'AI_CONSENT_REQUIRED' })).toMatch(/consent/i);
    expect(mapAIFailureMessage({})).toMatch(/unavailable/i);
  });
});

describe('重新分析确认', () => {
  // REQ-020-AC-001 / REQ-020-AC-002：确认前不改库；确认后仅写入采纳字段。
  test('applyReanalyzeConfirmation 仅在确认时写入摘要、描述与采纳标签', () => {
    const bookmark = {
      id: 'b-1',
      title: 'Old',
      description: 'Old description',
      aiSummary: 'Old summary',
      tags: ['tag-old'],
      aiSuggestedTags: [] as string[],
    };
    const preview = {
      description: 'New description',
      summary: 'New summary',
      suggestedTags: ['fresh', 'docs'],
    };

    const rejected = applyReanalyzeConfirmation({
      bookmark,
      preview,
      confirmed: false,
      acceptedTagLabels: ['fresh'],
      resolveTagId: (label) => (label === 'fresh' ? 'tag-fresh' : null),
    });
    expect(rejected).toBeNull();

    const accepted = applyReanalyzeConfirmation({
      bookmark,
      preview,
      confirmed: true,
      acceptedTagLabels: ['fresh'],
      resolveTagId: (label) => (label === 'fresh' ? 'tag-fresh' : null),
    });
    expect(accepted).toEqual({
      description: 'New description',
      aiSummary: 'New summary',
      tags: ['tag-old', 'tag-fresh'],
      aiSuggestedTags: [],
    });
  });

  test('applyReanalyzeConfirmation 拒绝的标签不会被持久化', () => {
    const patch = applyReanalyzeConfirmation({
      bookmark: { id: 'b-1', title: 'T', aiSummary: '', tags: [], aiSuggestedTags: [] },
      preview: { description: 'D', summary: 'S', suggestedTags: ['a', 'b'] },
      confirmed: true,
      acceptedTagLabels: ['a'],
      resolveTagId: (label) => `id-${label}`,
    });
    expect(patch?.tags).toEqual(['id-a']);
    expect(patch?.tags).not.toContain('id-b');
    expect(patch?.description).toBe('D');
  });
});

describe('无模拟结果检查', () => {
  test('AI 客户端未被调用失败路径不得注入固定伪摘要', async () => {
    const analyzeBookmark = vi.fn(async () => {
      throw { code: 'AI_TIMEOUT', message: 'AI request timed out' };
    });
    const result = await buildInboundAnalysis({
      url: 'https://example.test',
      titleHint: 'T',
      contentText: 'C',
      categoryCandidates: [],
      tagCandidates: [],
      context: { apiBase: 'https://api.example.test/v1', model: 'm', locale: 'en' },
      client: { analyzeBookmark },
      fetchMetadata: async () => ({
        ok: true,
        title: 'Meta',
        description: '',
        contentText: 'C',
      }),
    });
    expect(analyzeBookmark).toHaveBeenCalledOnce();
    expect(result.preview.aiSummary).toBe('');
    expect(result.preview.suggestedTags).toEqual([]);
  });
});
