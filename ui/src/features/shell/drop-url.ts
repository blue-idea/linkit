import { normalizeBookmarkUrl } from '../../domain/commands/bookmarks';

/**
 * 从拖放载荷中提取有效 http/https URL。
 * REQ-024-AC-005
 */
export function extractHttpUrlFromDropData(
  data: Partial<Record<'text/uri-list' | 'text/plain', string>>
): string | null {
  const candidates = [data['text/uri-list'], data['text/plain']]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  for (const candidate of candidates) {
    if (!/^https?:\/\//i.test(candidate)) continue;
    const normalized = normalizeBookmarkUrl(candidate);
    if (normalized.ok) return normalized.url;
  }
  return null;
}
