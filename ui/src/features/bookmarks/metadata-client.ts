import type { MetadataFetchResult } from './analysis';

type MetadataRequest = {
  url: string;
};

type MetadataResultPayload = {
  title?: string;
  description?: string;
  contentText?: string;
  faviconUrl?: string | null;
  faviconDataUrl?: string | null;
};

type GoMetadataService = {
  FetchMetadata?: (request: MetadataRequest) => Promise<MetadataResultPayload>;
  FetchFaviconDataURL?: (request: { url: string }) => Promise<string>;
};

function getGoFetchMetadata(): GoMetadataService['FetchMetadata'] | null {
  const go = (window as unknown as { go?: { metadata?: { Service?: GoMetadataService } } }).go
    ?.metadata?.Service?.FetchMetadata;
  return typeof go === 'function' ? go : null;
}

/**
 * 浏览器/Wails 元数据抓取入口。
 * 桌面端优先调用 Go MetadataService；Vite/CI 环境无绑定则返回失败以降级手动入库。
 * REQ-006-AC-001 / REQ-006-AC-003
 */
export async function fetchBookmarkMetadata(url: string): Promise<MetadataFetchResult> {
  try {
    const fetchMetadata = getGoFetchMetadata();
    if (!fetchMetadata) {
      return {
        ok: false,
        code: 'METADATA_UNAVAILABLE',
        message: 'Metadata service is unavailable in this environment',
      };
    }

    // Go 期望 MetadataRequest 结构体，不可直接传 URL 字符串。
    const payload = await fetchMetadata({ url });
    return {
      ok: true,
      title: payload.title ?? '',
      description: payload.description ?? '',
      contentText: payload.contentText ?? '',
      favicon: payload.faviconUrl ?? null,
      faviconDataUrl: payload.faviconDataUrl ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch page metadata';
    return { ok: false, code: 'METADATA_FETCH_FAILED', message };
  }
}

/** WebView 加载外链 favicon 失败时，由 Go 抓取并返回 data URL。 */
export async function fetchFaviconDataUrl(faviconUrl: string): Promise<string | null> {
  try {
    const fetchFn = (window as unknown as { go?: { metadata?: { Service?: GoMetadataService } } }).go?.metadata
      ?.Service?.FetchFaviconDataURL;
    if (typeof fetchFn !== 'function' || !faviconUrl.trim()) {
      return null;
    }
    const dataUrl = await fetchFn({ url: faviconUrl.trim() });
    return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') ? dataUrl : null;
  } catch {
    return null;
  }
}
