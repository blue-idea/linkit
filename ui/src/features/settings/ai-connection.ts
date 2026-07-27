import { z } from 'zod';
import type { AIContext } from '../ai';

export const aiConnectionResultSchema = z.strictObject({
  status: z.literal('ok'),
  latencyMs: z.number().int().nonnegative(),
  testedAt: z.iso.datetime(),
});

export type AIConnectionResult = z.infer<typeof aiConnectionResultSchema>;
export type AIConnectionErrorKey =
  | 'missing'
  | 'unauthorized'
  | 'timeout'
  | 'rateLimited'
  | 'unavailable';

type GoAIService = {
  TestConnection?: (request: { context: AIContext }) => Promise<unknown>;
};

function getGoAIService(): GoAIService | null {
  return (window as unknown as { go?: { ai?: { Service?: GoAIService } } }).go?.ai?.Service ?? null;
}

/** 调用 Wails AIService；浏览器环境不得前端直连或伪造成功。 */
export async function testAIConnection(context: AIContext): Promise<AIConnectionResult> {
  const invoke = getGoAIService()?.TestConnection;
  if (typeof invoke !== 'function') {
    throw {
      code: 'AI_REQUEST_FAILED',
      message: 'AI service is unavailable in this environment',
    };
  }
  return aiConnectionResultSchema.parse(await invoke({ context }));
}

function errorCodeAndMessage(error: unknown): { code: string; message: string } {
  if (typeof error === 'string') {
    return { code: '', message: error };
  }
  if (!error || typeof error !== 'object') {
    return { code: '', message: '' };
  }
  const record = error as { code?: unknown; message?: unknown };
  return {
    code: typeof record.code === 'string' ? record.code : '',
    message: typeof record.message === 'string' ? record.message : '',
  };
}

/** 将 Wails 的结构化错误或英文错误字符串归一为稳定 UI 状态。 */
export function classifyAIConnectionError(error: unknown): AIConnectionErrorKey {
  const { code, message } = errorCodeAndMessage(error);
  const normalized = `${code} ${message}`.toLowerCase();
  if (code === 'SECRET_NOT_CONFIGURED' || code === 'INVALID_ARGUMENT') return 'missing';
  if (code === 'AI_UNAUTHORIZED' || normalized.includes('rejected the api key')) return 'unauthorized';
  if (code === 'AI_TIMEOUT' || normalized.includes('timed out') || normalized.includes('timeout')) return 'timeout';
  if (code === 'AI_RATE_LIMITED' || normalized.includes('rate limit')) return 'rateLimited';
  return 'unavailable';
}
