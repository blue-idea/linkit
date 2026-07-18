import { describe, expect, test } from 'vitest';
import { bookmarks, categories, collections, tags } from '../../data';
import {
  applyTagLibraryResult,
  countBookmarksWithTag,
  filterBookmarksByTag,
  runAcceptSuggestedTag,
  runAddTagToBookmark,
  runCreateTag,
  runRemoveTagFromBookmark,
} from './apply-tag-command';

describe('标签功能适配层', () => {
  // REQ-014-AC-001
  test('countBookmarksWithTag 与 filterBookmarksByTag 保持一致', () => {
    const tagId = 't-css';
    const filtered = filterBookmarksByTag(bookmarks, tagId);
    expect(countBookmarksWithTag(bookmarks, tagId)).toBe(filtered.length);
    expect(filtered.every((b) => b.tags.includes(tagId))).toBe(true);
  });

  // REQ-014-AC-002
  test('runAddTagToBookmark / runRemoveTagFromBookmark 更新书签标签且唯一', () => {
    const target = bookmarks.find((b) => !b.tags.includes('t-ai'));
    expect(target).toBeTruthy();
    if (!target) return;

    const added = runAddTagToBookmark({
      bookmarks,
      categories,
      collections,
      tags,
      bookmarkId: target.id,
      tagId: 't-ai',
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const applied = applyTagLibraryResult(added.value, bookmarks);
    const next = applied.bookmarks.find((b) => b.id === target.id);
    expect(next?.tags.filter((id) => id === 't-ai')).toHaveLength(1);

    const removed = runRemoveTagFromBookmark({
      bookmarks: applied.bookmarks,
      categories,
      collections,
      tags: applied.tags,
      bookmarkId: target.id,
      tagId: 't-ai',
    });
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    const after = applyTagLibraryResult(removed.value, applied.bookmarks);
    expect(after.bookmarks.find((b) => b.id === target.id)?.tags.includes('t-ai')).toBe(false);
  });

  // REQ-014-AC-003
  test('runAcceptSuggestedTag 不重复添加已有建议标签', () => {
    const target = bookmarks.find((b) => (b.aiSuggestedTags?.length ?? 0) > 0);
    expect(target).toBeTruthy();
    if (!target) return;

    const suggested = target.aiSuggestedTags![0];
    const first = runAcceptSuggestedTag({
      bookmarks,
      categories,
      collections,
      tags,
      bookmarkId: target.id,
      tagId: suggested,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const applied = applyTagLibraryResult(first.value, bookmarks);
    const afterFirst = applied.bookmarks.find((b) => b.id === target.id)!;
    expect(afterFirst.tags.filter((id) => id === suggested)).toHaveLength(1);
    expect(afterFirst.aiSuggestedTags?.includes(suggested)).toBe(false);

    const second = runAcceptSuggestedTag({
      bookmarks: applied.bookmarks,
      categories,
      collections,
      tags: applied.tags,
      bookmarkId: target.id,
      tagId: suggested,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const afterSecond = applyTagLibraryResult(second.value, applied.bookmarks);
    expect(
      afterSecond.bookmarks.find((b) => b.id === target.id)?.tags.filter((id) => id === suggested)
    ).toHaveLength(1);
  });

  test('runCreateTag 创建新标签', () => {
    const result = runCreateTag({
      bookmarks,
      categories,
      collections,
      tags,
      label: 'TASK018 Unique Tag',
      color: 'coral',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tags.some((t) => t.label === 'TASK018 Unique Tag')).toBe(true);
  });
});
