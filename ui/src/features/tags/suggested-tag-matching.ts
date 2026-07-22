import type { Tag } from '../../types';

export interface SuggestedTagMatchResult {
  tagIds: string[];
  unmatchedLabels: string[];
}

type TagIndex = Map<string, string | null>;

function exactLabelKey(label: string): string {
  return label.normalize('NFKC').trim().toLocaleLowerCase();
}

function compactLabelKey(label: string): string {
  return exactLabelKey(label)
    .replace(/^#+\s*/u, '')
    .replace(/[-\s._/]+/gu, '');
}

function addUniqueIndexEntry(index: TagIndex, key: string, tagId: string): void {
  if (!key) {
    return;
  }
  const existing = index.get(key);
  if (existing === undefined) {
    index.set(key, tagId);
    return;
  }
  if (existing !== tagId) {
    // 同一规范化键对应多个标签时保留歧义，禁止猜测。
    index.set(key, null);
  }
}

/**
 * 将 AI 建议文本映射到现有标签；不在此处创建新标签。
 * 使用一次索引完成匹配，复杂度为 O(候选标签数 + 建议数)。
 */
export function matchSuggestedTags(labels: string[], tags: Tag[]): SuggestedTagMatchResult {
  const exactIndex: TagIndex = new Map();
  const compactIndex: TagIndex = new Map();
  for (const tag of tags) {
    addUniqueIndexEntry(exactIndex, exactLabelKey(tag.label), tag.id);
    addUniqueIndexEntry(compactIndex, compactLabelKey(tag.label), tag.id);
  }

  const tagIds: string[] = [];
  const unmatchedLabels: string[] = [];
  const matchedIds = new Set<string>();
  const unmatchedKeys = new Set<string>();

  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) {
      continue;
    }
    const exactKey = exactLabelKey(trimmed);
    const compactKey = compactLabelKey(trimmed);
    const id = exactIndex.get(exactKey) ?? compactIndex.get(compactKey);
    if (id) {
      if (!matchedIds.has(id)) {
        matchedIds.add(id);
        tagIds.push(id);
      }
      continue;
    }

    const unmatchedKey = compactKey || exactKey;
    if (!unmatchedKeys.has(unmatchedKey)) {
      unmatchedKeys.add(unmatchedKey);
      unmatchedLabels.push(trimmed);
    }
  }

  return { tagIds, unmatchedLabels };
}
