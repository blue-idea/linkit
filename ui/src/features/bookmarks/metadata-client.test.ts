import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchBookmarkMetadata, fetchBookmarkMetadataForImport } from './metadata-client';

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

  // REQ-006-AC-011：新建书签优先使用不等待 favicon 二进制的快速绑定。
  test('存在 FetchMetadataFast 时优先调用快速元数据绑定', async () => {
    const fetchMetadataFast = vi.fn(async () => ({
      title: 'Fast Example',
      description: 'Fast description',
      contentText: 'Fast body',
      faviconUrl: 'https://example.com/favicon.ico',
      faviconDataUrl: null,
    }));
    const fetchMetadata = vi.fn(async () => ({
      title: 'Slow Example',
      description: 'Slow description',
      contentText: 'Slow body',
      faviconUrl: null,
      faviconDataUrl: 'data:image/png;base64,slow',
    }));

    (window as unknown as { go: unknown }).go = {
      metadata: { Service: { FetchMetadataFast: fetchMetadataFast, FetchMetadata: fetchMetadata } },
    };

    const result = await fetchBookmarkMetadata('https://example.com/fast');

    expect(fetchMetadataFast).toHaveBeenCalledWith({ url: 'https://example.com/fast' });
    expect(fetchMetadata).not.toHaveBeenCalled();
    expect(result.ok && result.title).toBe('Fast Example');
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

  // REQ-035-AC-007：浏览器导入必须优先调用完整 metadata，以获取完整 favicon 数据。
  test('浏览器导入 metadata 优先调用 FetchMetadata 而不是快速绑定', async () => {
    const fetchMetadataFast = vi.fn(async () => ({
      title: 'Fast title',
      description: 'Fast description',
      contentText: 'Fast content',
      faviconUrl: 'https://example.com/fast.ico',
      faviconDataUrl: null,
    }));
    const fetchMetadata = vi.fn(async () => ({
      title: 'Complete title',
      description: 'Complete description',
      contentText: 'Complete content',
      faviconUrl: 'https://example.com/complete.ico',
      faviconDataUrl: 'data:image/png;base64,complete',
    }));

    (window as unknown as { go: unknown }).go = {
      metadata: { Service: { FetchMetadataFast: fetchMetadataFast, FetchMetadata: fetchMetadata } },
    };

    const result = await fetchBookmarkMetadataForImport('https://example.com/import');

    expect(fetchMetadata).toHaveBeenCalledWith({ url: 'https://example.com/import' });
    expect(fetchMetadataFast).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      title: 'Complete title',
      description: 'Complete description',
      contentText: 'Complete content',
      favicon: 'https://example.com/complete.ico',
      faviconDataUrl: 'data:image/png;base64,complete',
    });
  });

  test('完整绑定缺失时回退 FetchMetadataFast', async () => {
    const fetchMetadataFast = vi.fn(async () => ({
      title: 'Fallback title',
      description: 'Fallback description',
      contentText: 'Fallback content',
      faviconUrl: null,
      faviconDataUrl: null,
    }));
    (window as unknown as { go: unknown }).go = {
      metadata: { Service: { FetchMetadataFast: fetchMetadataFast } },
    };

    const result = await fetchBookmarkMetadataForImport('https://example.com/fallback');

    expect(fetchMetadataFast).toHaveBeenCalledWith({ url: 'https://example.com/fallback' });
    expect(result.ok && result.title).toBe('Fallback title');
  });
});
