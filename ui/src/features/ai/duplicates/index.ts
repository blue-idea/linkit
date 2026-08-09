import { DOMAIN_CONFIG } from '../../../config/domain';
import { isSameDomainDuplicateExcluded } from '../../../config/duplicates';
import type { LibraryData } from '../../../domain/library';
import type { CommandResult } from '../../../domain/commands/types';
import type { MessageKey } from '../../../i18n/catalogs';

export interface DuplicateDifference { field: string; target: string; duplicate: string }

/** 匹配依据使用结构化枚举，由 UI 按当前语言渲染。 */
export type DuplicateMatchReason =
  | { kind: 'exact_url' }
  | { kind: 'same_domain'; domain: string };

export interface DuplicatePreview {
  targetId: string;
  duplicateId: string;
  reason: DuplicateMatchReason;
  differences: DuplicateDifference[];
  targetTitle?: string;
  duplicateTitle?: string;
}

/** 扫描用的最小书签字段；候选对以对数计。 */
export interface DuplicateScanBookmark {
  id: string;
  title: string;
  url: string;
  domain: string;
}

export interface DuplicatePairCandidate {
  targetId: string;
  duplicateId: string;
  reason: DuplicateMatchReason;
  targetTitle: string;
  duplicateTitle: string;
}

function normalizeUrlForDuplicateMatch(url: string): string {
  return url.replace(/\/$/, '');
}

/** 比较用的 pathname 长度：去掉尾部 `/`，根路径为 0。REQ-020-AC-008 */
export function duplicateUrlPathLength(url: string): number {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '');
    return pathname.length;
  } catch {
    return normalizeUrlForDuplicateMatch(url).length;
  }
}

/**
 * 决定 Keep / duplicate：优先更短 URL pathname；
 * 并列时比较规范化完整 URL 长度，再比较 id 字典序。
 */
export function resolveDuplicateKeep(
  left: { id: string; url: string },
  right: { id: string; url: string },
): { targetId: string; duplicateId: string } {
  const leftPath = duplicateUrlPathLength(left.url);
  const rightPath = duplicateUrlPathLength(right.url);
  if (leftPath < rightPath) return { targetId: left.id, duplicateId: right.id };
  if (rightPath < leftPath) return { targetId: right.id, duplicateId: left.id };

  const leftUrl = normalizeUrlForDuplicateMatch(left.url);
  const rightUrl = normalizeUrlForDuplicateMatch(right.url);
  if (leftUrl.length < rightUrl.length) return { targetId: left.id, duplicateId: right.id };
  if (rightUrl.length < leftUrl.length) return { targetId: right.id, duplicateId: left.id };

  return left.id <= right.id
    ? { targetId: left.id, duplicateId: right.id }
    : { targetId: right.id, duplicateId: left.id };
}

function duplicateReason(left: DuplicateScanBookmark, right: DuplicateScanBookmark): DuplicateMatchReason | null {
  const sameUrl = normalizeUrlForDuplicateMatch(left.url) === normalizeUrlForDuplicateMatch(right.url);
  if (sameUrl) return { kind: 'exact_url' };
  // github.com / youtube.com 等高流量站点不按同域名配对，避免误报。
  if (
    left.domain === right.domain
    && !isSameDomainDuplicateExcluded(left.domain)
  ) {
    return { kind: 'same_domain', domain: left.domain };
  }
  return null;
}

/** 将匹配依据渲染为当前语言文案。 */
export function translateDuplicateReason(
  reason: DuplicateMatchReason,
  t: (key: MessageKey, options?: Record<string, string | number>) => string,
): string {
  if (reason.kind === 'exact_url') return t('ai.duplicate.reason.exactUrl');
  return t('ai.duplicate.reason.sameDomain', { domain: reason.domain });
}

/** 枚举全部重复候选对（URL 规范化相等或同域名）；确认前不修改资料库。REQ-020-AC-005 */
export function findDuplicatePairs(
  bookmarks: ReadonlyArray<DuplicateScanBookmark>,
): DuplicatePairCandidate[] {
  const pairs: DuplicatePairCandidate[] = [];
  for (let index = 0; index < bookmarks.length; index += 1) {
    const left = bookmarks[index]!;
    for (const right of bookmarks.slice(index + 1)) {
      const reason = duplicateReason(left, right);
      if (!reason) continue;
      const oriented = resolveDuplicateKeep(left, right);
      const keep = oriented.targetId === left.id ? left : right;
      const drop = oriented.duplicateId === left.id ? left : right;
      pairs.push({
        targetId: keep.id,
        duplicateId: drop.id,
        reason,
        targetTitle: keep.title,
        duplicateTitle: drop.title,
      });
    }
  }
  return pairs;
}

export function buildDuplicatePreview(library: LibraryData, targetId: string, duplicateId: string): DuplicatePreview | null {
  const target = library.bookmarks.find(({ id }) => id === targetId);
  const duplicate = library.bookmarks.find(({ id }) => id === duplicateId);
  if (!target || !duplicate) return null;
  const fields: Array<keyof Pick<typeof target, 'title' | 'url' | 'description' | 'notes' | 'categoryId'>> =
    ['title', 'url', 'description', 'notes', 'categoryId'];
  return {
    targetId,
    duplicateId,
    reason: normalizeUrlForDuplicateMatch(target.url) === normalizeUrlForDuplicateMatch(duplicate.url)
      ? { kind: 'exact_url' }
      : { kind: 'same_domain', domain: target.domain },
    differences: fields.flatMap((field) => target[field] === duplicate[field] ? [] : [{
      field, target: String(target[field] ?? ''), duplicate: String(duplicate[field] ?? ''),
    }]),
    targetTitle: target.title,
    duplicateTitle: duplicate.title,
  };
}

/** 交换预览中的 Keep / duplicate 侧，供手动选择保留哪一项。 */
export function swapDuplicatePreviewSides(preview: DuplicatePreview): DuplicatePreview {
  return {
    targetId: preview.duplicateId,
    duplicateId: preview.targetId,
    reason: preview.reason,
    differences: preview.differences.map((difference) => ({
      field: difference.field,
      target: difference.duplicate,
      duplicate: difference.target,
    })),
    targetTitle: preview.duplicateTitle,
    duplicateTitle: preview.targetTitle,
  };
}

function removeBookmark(library: LibraryData, id: string): LibraryData {
  return {
    ...library,
    bookmarks: library.bookmarks.filter((bookmark) => bookmark.id !== id),
    collections: library.collections.map((collection) => ({
      ...collection, bookmarkIds: collection.bookmarkIds.filter((bookmarkId) => bookmarkId !== id),
    })),
  };
}

/** 合并保留目标字段，并合并标签、主题关系；删除只处理用户指定的重复项。 */
export function applyDuplicateDecision(
  library: LibraryData,
  input: { targetId: string; duplicateId: string; action: 'merge' | 'delete' | 'cancel' },
): CommandResult<LibraryData> {
  if (input.action === 'cancel') return { ok: true, value: library, events: [] };
  const target = library.bookmarks.find(({ id }) => id === input.targetId);
  const duplicate = library.bookmarks.find(({ id }) => id === input.duplicateId);
  if (!target || !duplicate) return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };

  if (input.action === 'delete') {
    return { ok: true, value: removeBookmark(library, duplicate.id), events: [{
      type: DOMAIN_CONFIG.events.duplicateDeleted, payload: { bookmarkId: duplicate.id },
    }] };
  }

  const collectionIds = [...new Set([...target.collectionIds, ...duplicate.collectionIds])];
  let value = removeBookmark(library, duplicate.id);
  value = {
    ...value,
    bookmarks: value.bookmarks.map((bookmark) => bookmark.id === target.id ? {
      ...bookmark,
      tagIds: [...new Set([...target.tagIds, ...duplicate.tagIds])],
      collectionIds,
    } : bookmark),
    collections: value.collections.map((collection) => collectionIds.includes(collection.id) ? {
      ...collection,
      bookmarkIds: [...new Set([...collection.bookmarkIds, target.id])],
    } : collection),
  };
  return { ok: true, value, events: [{
    type: DOMAIN_CONFIG.events.duplicateMerged,
    payload: { targetId: target.id, duplicateId: duplicate.id },
  }] };
}

/** 按序批量应用 Merge/Delete；缺失书签的对跳过。REQ-020-AC-007 */
export function applyDuplicateBatch(
  library: LibraryData,
  input: {
    action: 'merge' | 'delete';
    pairs: ReadonlyArray<{ targetId: string; duplicateId: string }>;
  },
): CommandResult<LibraryData> & { appliedCount: number } {
  let value = library;
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  let appliedCount = 0;

  for (const pair of input.pairs) {
    const result = applyDuplicateDecision(value, {
      targetId: pair.targetId,
      duplicateId: pair.duplicateId,
      action: input.action,
    });
    if (!result.ok) continue;
    value = result.value;
    events.push(...result.events);
    appliedCount += 1;
  }

  return { ok: true, value, events, appliedCount };
}
