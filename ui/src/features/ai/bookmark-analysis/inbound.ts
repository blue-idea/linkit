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

/**
 * 元数据 + AI 入库分析。AI 失败时英文降级，禁止伪造建议。
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
  const metadata = await input.fetchMetadata(input.url.trim());
  const categoryIds = new Set(input.categoryCandidates.map((item) => item.id));

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

  try {
    const raw = await input.client.analyzeBookmark({
      context: input.context,
      url: input.url.trim(),
      title: baseTitle,
      description,
      contentText,
      categoryCandidates: input.categoryCandidates,
      tagCandidates: input.tagCandidates,
    });
    const validated = validateAgainstCandidates(raw, categoryIds);
    if (!validated) {
      return {
        source,
        metadataErrorMessage,
        aiErrorMessage: mapAIFailureMessage({ code: 'AI_RESPONSE_INVALID' }),
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
    return {
      source: 'ai',
      metadataErrorMessage,
      aiErrorMessage: null,
      preview: {
        title: validated.title.trim() || baseTitle,
        // AI 按 locale 重写 description；为空时回退元数据原文。
        description: validated.description.trim() || description,
        aiSummary: validated.summary,
        suggestedTags: validated.suggestedTags,
        suggestedCategoryId: validated.suggestedCategoryId,
        faviconUrl: metadata.ok ? (metadata.favicon ?? null) : null,
        faviconDataUrl: metadata.ok ? (metadata.faviconDataUrl ?? null) : null,
      },
    };
  } catch (error) {
    return {
      source,
      metadataErrorMessage,
      aiErrorMessage: mapAIFailureMessage(extractError(error)),
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
}
