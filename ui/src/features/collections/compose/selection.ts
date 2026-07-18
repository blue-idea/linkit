/**
 * 解析拖拽载荷中的书签 ID 列表（支持单书签或多选 JSON）。
 * REQ-013-AC-001
 */
export function parseComposeDragPayload(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))];
      }
    } catch {
      return [];
    }
  }
  return [trimmed];
}

/**
 * 切换多选集合：按住修饰键追加/移除，否则重置为单项。
 * REQ-013-AC-001
 */
export function toggleComposeSelection(
  current: string[],
  bookmarkId: string,
  additive: boolean
): string[] {
  if (!additive) return [bookmarkId];
  return current.includes(bookmarkId)
    ? current.filter((id) => id !== bookmarkId)
    : [...current, bookmarkId];
}
