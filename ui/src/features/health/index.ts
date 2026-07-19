import type { Bookmark } from '../../types';

export interface HealthResult {
  bookmarkId: string;
  health: 'ok' | 'changed' | 'broken';
  httpStatus: number | null;
  checkedAt: string;
  fingerprint: string | null;
  errorCode: string | null;
}

async function fingerprint(body: string): Promise<string> {
  const bytes = new TextEncoder().encode(body);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

/** 浏览器开发/E2E 适配器；桌面正式环境由 Go HealthService 执行同一契约。 */
export async function scanBookmark(bookmark: Bookmark, signal: AbortSignal, url = bookmark.url): Promise<HealthResult> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(url, { signal, credentials: 'omit', redirect: 'follow' });
    if (!response.ok) {
      return { bookmarkId: bookmark.id, health: 'broken', httpStatus: response.status, checkedAt, fingerprint: null, errorCode: `HTTP_${response.status}` };
    }
    const body = await response.text();
    const nextFingerprint = await fingerprint(body);
    return {
      bookmarkId: bookmark.id,
      health: bookmark.healthFingerprint && bookmark.healthFingerprint !== nextFingerprint ? 'changed' : 'ok',
      httpStatus: response.status, checkedAt, fingerprint: nextFingerprint, errorCode: null,
    };
  } catch (error) {
    if (signal.aborted) throw error;
    return { bookmarkId: bookmark.id, health: 'broken', httpStatus: null, checkedAt, fingerprint: null, errorCode: 'NETWORK_ERROR' };
  }
}

export { HealthScanDialog } from './HealthScanDialog';
