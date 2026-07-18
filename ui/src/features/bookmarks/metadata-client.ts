import type { MetadataFetchResult } from './analysis';

/**
 * 浏览器/Wails 元数据抓取入口。
 * 桌面端优先调用 Go MetadataService；Vite/CI 环境无绑定则返回失败以降级手动入库。
 * REQ-006-AC-001 / REQ-006-AC-003
 */
export async function fetchBookmarkMetadata(url: string): Promise<MetadataFetchResult> {
  try {
    const go = (window as unknown as {
      go?: { metadata?: { Service?: { FetchMetadata?: (u: string) => Promise<unknown> } } };
    }).go?.metadata?.Service?.FetchMetadata;

    if (typeof go === 'function') {
      const payload = (await go(url)) as {
        title?: string;
        description?: string;
        contentText?: string;
        favicon?: string | null;
      };
      return {
        ok: true,
        title: payload.title ?? '',
        description: payload.description ?? '',
        contentText: payload.contentText ?? '',
        favicon: payload.favicon ?? null,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch page metadata';
    return { ok: false, code: 'METADATA_FETCH_FAILED', message };
  }

  return {
    ok: false,
    code: 'METADATA_UNAVAILABLE',
    message: 'Metadata service is unavailable in this environment',
  };
}
