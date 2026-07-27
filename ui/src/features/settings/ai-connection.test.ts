import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  classifyAIConnectionError,
  testAIConnection,
} from './ai-connection';

type WindowWithGo = Window & {
  go?: {
    ai?: {
      Service?: {
        TestConnection?: (request: unknown) => Promise<unknown>;
      };
    };
  };
};

afterEach(() => {
  delete (window as WindowWithGo).go;
});

describe('AI 接口连通性适配器', () => {
  test('REQ-033-AC-001 有效响应通过严格 DTO 校验', async () => {
    const invoke = vi.fn(async () => ({
      status: 'ok',
      latencyMs: 42,
      testedAt: '2026-07-27T09:00:00.000Z',
    }));
    (window as WindowWithGo).go = { ai: { Service: { TestConnection: invoke } } };

    await expect(testAIConnection({
      apiBase: 'https://api.example.test/v1',
      model: 'test-model',
      locale: 'en',
    })).resolves.toEqual({
      status: 'ok',
      latencyMs: 42,
      testedAt: '2026-07-27T09:00:00.000Z',
    });
    expect(invoke).toHaveBeenCalledWith({
      context: {
        apiBase: 'https://api.example.test/v1',
        model: 'test-model',
        locale: 'en',
      },
    });
  });

  test('REQ-033-AC-001 负耗时或无效时间被拒绝', async () => {
    (window as WindowWithGo).go = {
      ai: {
        Service: {
          TestConnection: async () => ({ status: 'ok', latencyMs: -1, testedAt: 'not-a-date' }),
        },
      },
    };
    await expect(testAIConnection({
      apiBase: 'https://api.example.test/v1',
      model: 'test-model',
      locale: 'en',
    })).rejects.toThrow();
  });

  test('REQ-033-AC-003 无 Wails 绑定时拒绝伪造成功', async () => {
    await expect(testAIConnection({
      apiBase: 'https://api.example.test/v1',
      model: 'test-model',
      locale: 'en',
    })).rejects.toMatchObject({ code: 'AI_REQUEST_FAILED' });
  });

  test('REQ-033-AC-003 稳定分类未授权、超时、限流和通用错误', () => {
    expect(classifyAIConnectionError({ code: 'AI_UNAUTHORIZED' })).toBe('unauthorized');
    expect(classifyAIConnectionError('AI request timed out')).toBe('timeout');
    expect(classifyAIConnectionError({ message: 'AI service rate limit exceeded' })).toBe('rateLimited');
    expect(classifyAIConnectionError(new Error('network down'))).toBe('unavailable');
  });
});
