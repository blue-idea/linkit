import { analyzeBookmarkResultSchema, type AnalyzeBookmarkInput, type AnalyzeBookmarkResult } from './schema';

type GoAIService = {
  AnalyzeBookmark?: (request: unknown) => Promise<unknown>;
  ReanalyzeBookmark?: (request: unknown) => Promise<unknown>;
};

function getGoAIService(): GoAIService | null {
  const go = (window as unknown as { go?: { ai?: { Service?: GoAIService } } }).go?.ai?.Service;
  return go ?? null;
}

async function callAnalyze(
  method: 'AnalyzeBookmark' | 'ReanalyzeBookmark',
  input: AnalyzeBookmarkInput
): Promise<AnalyzeBookmarkResult> {
  const service = getGoAIService();
  const invoke = service?.[method];
  if (typeof invoke !== 'function') {
    const error = { code: 'AI_REQUEST_FAILED', message: 'AI service is unavailable in this environment' };
    throw error;
  }
  const payload = await invoke({
    context: input.context,
    url: input.url,
    title: input.title,
    description: input.description,
    contentText: input.contentText,
    categoryCandidates: input.categoryCandidates,
    tagCandidates: input.tagCandidates,
  });
  return analyzeBookmarkResultSchema.parse(payload);
}

/** 浏览器/Wails AI 客户端；无绑定时抛出可映射错误以降级。 */
export const wailsAnalyzeClient = {
  analyzeBookmark(input: AnalyzeBookmarkInput) {
    return callAnalyze('AnalyzeBookmark', input);
  },
  reanalyzeBookmark(input: AnalyzeBookmarkInput) {
    return callAnalyze('ReanalyzeBookmark', input);
  },
};
