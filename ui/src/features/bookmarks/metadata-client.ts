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
  FetchMetadataFast?: (request: MetadataRequest) => Promise<MetadataResultPayload>;
  FetchFaviconDataURL?: (request: { url: string }) => Promise<string>;
};

function getGoMetadataService(): GoMetadataService | null {
  return (window as unknown as { go?: { metadata?: { Service?: GoMetadataService } } }).go
    ?.metadata?.Service ?? null;
}

async function fetchBookmarkMetadataWithPreference(
  url: string,
  preferComplete: boolean,
): Promise<MetadataFetchResult> {
  try {
    const service = getGoMetadataService();
    const fetchMetadata = preferComplete
      ? service?.FetchMetadata ?? service?.FetchMetadataFast ?? null
      : service?.FetchMetadataFast ?? service?.FetchMetadata ?? null;
    if (!fetchMetadata) {
      return {
        ok: false,
        code: 'METADATA_UNAVAILABLE',
        message: 'Metadata service is unavailable in this environment',
      };
    }

    // Go 绑定要求 MetadataRequest 对象，不能直接传 URL 字符串。
    const payload = await fetchMetadata({ url });
    return {
      ok: true,
      title: typeof payload.title === 'string' ? payload.title : '',
      description: typeof payload.description === 'string' ? payload.description : '',
      contentText: typeof payload.contentText === 'string' ? payload.contentText : '',
      favicon: typeof payload.faviconUrl === 'string' ? payload.faviconUrl : null,
      faviconDataUrl: typeof payload.faviconDataUrl === 'string' ? payload.faviconDataUrl : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch page metadata';
    return { ok: false, code: 'METADATA_FETCH_FAILED', message };
  }
}

/**
 * 浏览器/Wails 元数据抓取入口。
 * 桌面端优先调用快速 Go MetadataService；没有快速绑定时回退完整绑定。
 * REQ-006-AC-001 / REQ-006-AC-003
 */
export async function fetchBookmarkMetadata(url: string): Promise<MetadataFetchResult> {
  return fetchBookmarkMetadataWithPreference(url, false);
}

/** 浏览器书签导入使用完整绑定，以优先取得 favicon data；旧绑定缺失时回退快速绑定。 */
export async function fetchBookmarkMetadataForImport(url: string): Promise<MetadataFetchResult> {
  return fetchBookmarkMetadataWithPreference(url, true);
}

/** WebView 加载外链 favicon 失败时，由 Go 抓取并返回 data URL。 */
export async function fetchFaviconDataUrl(faviconUrl: string): Promise<string | null> {
  try {
    const fetchFn = getGoMetadataService()?.FetchFaviconDataURL;
    if (typeof fetchFn !== 'function' || !faviconUrl.trim()) {
      return null;
    }
    const dataUrl = await fetchFn({ url: faviconUrl.trim() });
    return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') ? dataUrl : null;
  } catch {
    return null;
  }
}
