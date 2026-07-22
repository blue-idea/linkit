import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchBookmarkMetadata } from './metadata-client';

describe('fetchBookmarkMetadata', () => {
  beforeEach(() => {
    delete (window as unknown as { go?: unknown }).go;
  });

  // REQ-006-AC-001：Wails 绑定必须以 MetadataRequest 对象传参。
  test('调用 Go FetchMetadata 时传入 { url } 对象而非字符串', async () => {
    const fetchMetadata = vi.fn(async () => ({
      title: 'Example',
      description: 'Desc',
      contentText: 'Body',
      faviconUrl: 'https://example.com/favicon.ico',
    }));

    (window as unknown as { go: unknown }).go = {
      metadata: { Service: { FetchMetadata: fetchMetadata } },
    };

    const result = await fetchBookmarkMetadata('https://example.com/page');

    expect(fetchMetadata).toHaveBeenCalledWith({ url: 'https://example.com/page' });
    expect(result).toEqual({
      ok: true,
      title: 'Example',
      description: 'Desc',
      contentText: 'Body',
      favicon: 'https://example.com/favicon.ico',
      faviconDataUrl: null,
    });
  });

  test('无 Wails 绑定时返回 METADATA_UNAVAILABLE', async () => {
    const result = await fetchBookmarkMetadata('https://example.com');
    expect(result).toEqual({
      ok: false,
      code: 'METADATA_UNAVAILABLE',
      message: 'Metadata service is unavailable in this environment',
    });
  });

  test('Go 抛错时映射为 METADATA_FETCH_FAILED', async () => {
    (window as unknown as { go: unknown }).go = {
      metadata: {
        Service: {
          FetchMetadata: async () => {
            throw new Error('error parsing arguments: json: cannot unmarshal string');
          },
        },
      },
    };

    const result = await fetchBookmarkMetadata('https://example.com');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('METADATA_FETCH_FAILED');
      expect(result.message).toContain('cannot unmarshal string');
    }
  });
});
