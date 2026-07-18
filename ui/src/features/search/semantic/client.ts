import type { AIContext } from '../../ai';
import type { SemanticCandidate, SemanticHit } from './run';

type GoAIService = {
  RerankSemanticSearch?: (request: unknown) => Promise<unknown>;
};

function getGoAIService(): GoAIService | null {
  return (window as unknown as { go?: { ai?: { Service?: GoAIService } } }).go?.ai?.Service ?? null;
}

/** Wails 语义重排客户端；无绑定时抛出可映射错误。 */
export const wailsSemanticClient = {
  async rerankSemanticSearch(input: {
    context: AIContext;
    query: string;
    candidates: SemanticCandidate[];
  }): Promise<{ results: SemanticHit[] }> {
    const invoke = getGoAIService()?.RerankSemanticSearch;
    if (typeof invoke !== 'function') {
      throw { code: 'AI_REQUEST_FAILED', message: 'AI service is unavailable in this environment' };
    }
    const payload = (await invoke({
      context: input.context,
      query: input.query,
      candidates: input.candidates,
    })) as { results?: SemanticHit[] };
    return { results: payload.results ?? [] };
  },
};
