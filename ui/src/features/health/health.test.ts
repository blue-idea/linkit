import { afterEach, describe, expect, test, vi } from 'vitest';
import { bookmarks } from '../../data';
import { scanBookmark } from './index';

describe('链接健康浏览器适配器', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('成功响应的指纹变化时返回 changed 和持久化元数据', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('new body', { status: 200 })));
    const result = await scanBookmark({ ...bookmarks[0], healthFingerprint: 'old' }, new AbortController().signal);
    expect(result).toEqual(expect.objectContaining({
      bookmarkId: bookmarks[0].id, health: 'changed', httpStatus: 200, errorCode: null,
    }));
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  test('HTTP 失效状态返回 broken 且不保存响应正文指纹', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })));
    await expect(scanBookmark(bookmarks[0], new AbortController().signal)).resolves.toEqual(expect.objectContaining({
      health: 'broken', httpStatus: 404, fingerprint: null, errorCode: 'HTTP_404',
    }));
  });

  test('取消请求时传播 AbortError 而不伪造 broken 结果', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const controller = new AbortController();
    const pending = scanBookmark(bookmarks[0], controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
