import { normalizeBookmarkUrl } from '../../domain/commands/bookmarks';

/**
 * Spotlight 仅在显式 http/https URL 时提供 New Bookmark。
 * REQ-017-AC-004
 */
export function detectSpotlightHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return normalizeBookmarkUrl(trimmed).ok;
}

/** 将 Spotlight 输入规范化为可带入入库流程的 URL。 */
export function normalizeSpotlightUrl(
  raw: string
): { ok: true; url: string } | { ok: false } {
  if (!detectSpotlightHttpUrl(raw)) return { ok: false };
  const normalized = normalizeBookmarkUrl(raw.trim());
  if (!normalized.ok) return { ok: false };
  return { ok: true, url: normalized.url };
}
