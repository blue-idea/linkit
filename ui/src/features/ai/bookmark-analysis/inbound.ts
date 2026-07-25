import type { MetadataFetchResult } from '../../bookmarks/analysis';
import { buildManualFallbackPreview } from '../../bookmarks/analysis';
import { mapAIFailureMessage } from './messages';
import {
  analyzeBookmarkResultSchema,
  type AIContext,
  type AnalyzeBookmarkClient,
  type AnalyzeBookmarkResult,
} from './schema';

export type InboundAnalysisSource = 'ai' | 'metadata' | 'manual';

export interface InboundAnalysisPreview {
  title: string;
  description: string;
  aiSummary: string;
  suggestedTags: string[];
  suggestedCategoryId: string | null;
  faviconUrl: string | null;
  faviconDataUrl: string | null;
}

export interface InboundAnalysisResult {
  source: InboundAnalysisSource;
  preview: InboundAnalysisPreview;
  metadataErrorMessage: string | null;
  aiErrorMessage: string | null;
}

export interface InboundMetadataResult {
  source: Exclude<InboundAnalysisSource, 'ai'>;
  preview: InboundAnalysisPreview;
  metadataErrorMessage: string | null;
  /** 仅供后续 AI 增强使用，不直接展示或持久化。 */
  contentText: string;
}

function extractError(error: unknown): { code?: string; message?: string } {
  if (error && typeof error === 'object') {
    const record = error as { code?: string; message?: string };
    return { code: record.code, message: record.message };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return {};
}

function validateAgainstCandidates(
  result: AnalyzeBookmarkResult,
  categoryIds: Set<string>
): AnalyzeBookmarkResult | null {
  const parsed = analyzeBookmarkResultSchema.safeParse(result);
  if (!parsed.success) {
    return null;
  }
  const categoryId = parsed.data.suggestedCategoryId;
  if (categoryId && !categoryIds.has(categoryId)) {
    return null;
  }
  return parsed.data;
}

export async function buildInboundMetadataPreview(input: {
  url: string;
  titleHint: string;
  contentText: string;
  fetchMetadata: (url: string) => Promise<MetadataFetchResult>;
}): Promise<InboundMetadataResult> {
  const metadata = await input.fetchMetadata(input.url.trim());

  let baseTitle = input.titleHint.trim();
  let description = '';
  let contentText = input.contentText;
  let metadataErrorMessage: string | null = null;
  let source: InboundAnalysisSource = 'manual';

  if (metadata.ok) {
    baseTitle = metadata.title.trim() || baseTitle;
    description = metadata.description;
    contentText = metadata.contentText || contentText;
    source = 'metadata';
  } else {
    metadataErrorMessage = metadata.message;
    const manual = buildManualFallbackPreview(input.url, input.titleHint);
    baseTitle = manual.title;
  }

  return {
    source,
    metadataErrorMessage,
    contentText,
    preview: {
      title: baseTitle,
      description,
      aiSummary: '',
      suggestedTags: [],
      suggestedCategoryId: null,
      faviconUrl: metadata.ok ? (metadata.favicon ?? null) : null,
      faviconDataUrl: metadata.ok ? (metadata.faviconDataUrl ?? null) : null,
    },
  };
}

/**
 * 基于已完成的元数据预览执行 AI 增强。失败时保留元数据结果，禁止伪造建议。
 */
export async function enhanceInboundAnalysis(input: {
  base: InboundMetadataResult;
  url: string;
  categoryCandidates: Array<{ id: string; name: string }>;
  tagCandidates: Array<{ id: string; label: string }>;
  context: AIContext;
  client: AnalyzeBookmarkClient;
}): Promise<InboundAnalysisResult> {
  const categoryIds = new Set(input.categoryCandidates.map((item) => item.id));

  try {
    const raw = await input.client.analyzeBookmark({
      context: input.context,
      url: input.url.trim(),
      title: input.base.preview.title,
      description: input.base.preview.description,
      contentText: input.base.contentText,
      categoryCandidates: input.categoryCandidates,
      tagCandidates: input.tagCandidates,
    });
    const validated = validateAgainstCandidates(raw, categoryIds);
    if (!validated) {
      return {
        source: input.base.source,
        metadataErrorMessage: input.base.metadataErrorMessage,
        aiErrorMessage: mapAIFailureMessage({ code: 'AI_RESPONSE_INVALID' }),
        preview: input.base.preview,
      };
    }
    return {
      source: 'ai',
      metadataErrorMessage: input.base.metadataErrorMessage,
      aiErrorMessage: null,
      preview: {
        title: validated.title.trim() || input.base.preview.title,
        // AI 按 locale 重写 description；为空时回退元数据原文。
        description: validated.description.trim() || input.base.preview.description,
        aiSummary: validated.summary,
        suggestedTags: validated.suggestedTags,
        suggestedCategoryId: validated.suggestedCategoryId,
        faviconUrl: input.base.preview.faviconUrl,
        faviconDataUrl: input.base.preview.faviconDataUrl,
      },
    };
  } catch (error) {
    return {
      source: input.base.source,
      metadataErrorMessage: input.base.metadataErrorMessage,
      aiErrorMessage: mapAIFailureMessage(extractError(error)),
      preview: input.base.preview,
    };
  }
}

/**
 * 元数据 + AI 的兼容组合入口；渐进式 UI 可分别调用两个阶段。
 * REQ-006-AC-002 / REQ-006-AC-003
 */
export async function buildInboundAnalysis(input: {
  url: string;
  titleHint: string;
  contentText: string;
  categoryCandidates: Array<{ id: string; name: string }>;
  tagCandidates: Array<{ id: string; label: string }>;
  context: AIContext;
  client: AnalyzeBookmarkClient;
  fetchMetadata: (url: string) => Promise<MetadataFetchResult>;
}): Promise<InboundAnalysisResult> {
  const base = await buildInboundMetadataPreview(input);
  return enhanceInboundAnalysis({
    base,
    url: input.url,
    categoryCandidates: input.categoryCandidates,
    tagCandidates: input.tagCandidates,
    context: input.context,
    client: input.client,
  });
}
