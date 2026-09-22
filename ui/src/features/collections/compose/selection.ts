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

/**
 * 判断当前可视书签列表是否全部处于已选状态。
 * REQ-011-AC-006
 */
export function isAllVisibleSelected(currentIds: string[], visibleIds: string[]): boolean {
  if (visibleIds.length === 0) return false;
  const currentSet = new Set(currentIds);
  return visibleIds.every((id) => currentSet.has(id));
}

/**
 * 将当前可视书签列表全量合并到已有选中集合中并去重。
 * REQ-011-AC-006
 */
export function computeSelectAllIds(currentIds: string[], visibleIds: string[]): string[] {
  return [...new Set([...currentIds, ...visibleIds])];
}

/**
 * 从已有选中列表中剔除当前可视书签集合。
 * REQ-011-AC-006
 */
export function computeDeselectAllIds(currentIds: string[], visibleIds: string[]): string[] {
  const visibleSet = new Set(visibleIds);
  return currentIds.filter((id) => !visibleSet.has(id));
}

