export type AnalysisStage = 'review';

export type MetadataFetchResult =
  | {
      ok: true;
      title: string;
      description: string;
      contentText: string;
      favicon?: string | null;
      faviconDataUrl?: string | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export interface BookmarkPreviewDraft {
  title: string;
  description: string;
  aiSummary: string;
  suggestedTags: string[];
  suggestedCategoryId: string | null;
  faviconUrl: string | null;
  faviconDataUrl: string | null;
}

export interface BookmarkAnalysisResult {
  stage: AnalysisStage;
  source: 'metadata' | 'manual';
  preview: BookmarkPreviewDraft;
  fallbackMessage: string | null;
}

const MANUAL_FALLBACK =
  'Could not fetch page metadata. Fill in the fields manually — no simulated AI result was used.';

function domainFromUrl(url: string): string {
  try {
    const withProtocol = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    return new URL(withProtocol).hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 构建纯手动预览，禁止注入伪 AI 摘要/标签。
 * REQ-006-AC-003
 */
export function buildManualFallbackPreview(url: string, titleHint: string): BookmarkPreviewDraft {
  const domain = domainFromUrl(url);
  return {
    title: titleHint.trim() || domain,
    description: '',
    aiSummary: '',
    suggestedTags: [],
    suggestedCategoryId: null,
    faviconUrl: null,
    faviconDataUrl: null,
  };
}

/**
 * 分析 URL：成功则用元数据填充预览；失败则英文降级并允许手动入库。
 * REQ-006-AC-001 / REQ-006-AC-003
 */
export async function resolveBookmarkAnalysis(input: {
  url: string;
  titleHint: string;
  fetchMetadata: (url: string) => Promise<MetadataFetchResult>;
}): Promise<BookmarkAnalysisResult> {
  const result = await input.fetchMetadata(input.url.trim());
  if (result.ok) {
    return {
      stage: 'review',
      source: 'metadata',
      fallbackMessage: null,
      preview: {
        title: result.title.trim() || input.titleHint.trim() || domainFromUrl(input.url),
        description: result.description,
        aiSummary: '',
        suggestedTags: [],
        suggestedCategoryId: null,
        faviconUrl: result.favicon ?? null,
        faviconDataUrl: result.faviconDataUrl ?? null,
      },
    };
  }

  return {
    stage: 'review',
    source: 'manual',
    fallbackMessage: MANUAL_FALLBACK,
    preview: buildManualFallbackPreview(input.url, input.titleHint),
  };
}
