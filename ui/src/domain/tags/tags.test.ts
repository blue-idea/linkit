import { describe, expect, test } from 'vitest';
import {
  createBookmark,
  createCoreJourneySeed,
  createTag,
} from '../../testing/factories';
import type { LibraryData } from '../library';

type CommandResult =
  | {
      ok: true;
      value: LibraryData;
      events: Array<{ type: string; payload: Record<string, unknown> }>;
    }
  | { ok: false; error: { code: string; message: string } };

interface TagsModule {
  createTag: (
    library: LibraryData,
    input: {
      label: string;
      color?: LibraryData['tags'][number]['color'];
      idFactory?: () => string;
    }
  ) => CommandResult;
  deleteTag: (library: LibraryData, input: { id: string }) => CommandResult;
  addTagToBookmark: (
    library: LibraryData,
    input: { bookmarkId: string; tagId: string }
  ) => CommandResult;
  removeTagFromBookmark: (
    library: LibraryData,
    input: { bookmarkId: string; tagId: string }
  ) => CommandResult;
  acceptSuggestedTag: (
    library: LibraryData,
    input: { bookmarkId: string; tagId: string }
  ) => CommandResult;
  countBookmarksByTag: (
    bookmarks: LibraryData['bookmarks'],
    tagId: string
  ) => number;
}

async function loadTags(): Promise<Partial<TagsModule>> {
  return import(/* @vite-ignore */ './index').catch(() => ({}));
}

function sampleLibrary(): LibraryData {
  const seed = createCoreJourneySeed().library.data;
  return {
    ...seed,
    tags: [
      createTag({ id: 'tag-a', label: 'Design', color: 'violet' }),
      createTag({ id: 'tag-b', label: 'CSS', color: 'blue' }),
    ],
    bookmarks: [
      createBookmark({
        id: 'bm-1',
        title: 'One',
        tagIds: ['tag-a'],
        aiSuggestedTags: ['tag-b', 'tag-a'],
      }),
      createBookmark({
        id: 'bm-2',
        title: 'Two',
        tagIds: ['tag-a', 'tag-b'],
        aiSuggestedTags: [],
      }),
      createBookmark({
        id: 'bm-3',
        title: 'Three',
        tagIds: [],
        aiSuggestedTags: ['tag-b'],
      }),
    ],
  };
}

describe('标签领域命令', () => {
  // 标签唯一性：同名规范化后不得重复创建。
  test('createTag 在标签名已存在时返回 TAG_LABEL_DUPLICATE', async () => {
    const mod = await loadTags();
    expect(mod.createTag).toBeTypeOf('function');
    if (!mod.createTag) throw new Error('createTag is required');

    expect(mod.createTag(sampleLibrary(), { label: '  design  ' })).toEqual({
      ok: false,
      error: { code: 'TAG_LABEL_DUPLICATE', message: 'Tag label already exists' },
    });
  });

  test('createTag 在有效名称时创建标签', async () => {
    const mod = await loadTags();
    expect(mod.createTag).toBeTypeOf('function');
    if (!mod.createTag) throw new Error('createTag is required');

    const result = mod.createTag(sampleLibrary(), {
      label: 'Performance',
      color: 'amber',
      idFactory: () => 'tag-new',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tags.find((t) => t.id === 'tag-new')).toMatchObject({
      id: 'tag-new',
      label: 'Performance',
      color: 'amber',
    });
  });

  // 删除标签时清理全部书签引用。
  test('deleteTag 删除标签并清理 bookmark.tagIds 引用', async () => {
    const mod = await loadTags();
    expect(mod.deleteTag).toBeTypeOf('function');
    if (!mod.deleteTag) throw new Error('deleteTag is required');

    const result = mod.deleteTag(sampleLibrary(), { id: 'tag-a' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tags.find((t) => t.id === 'tag-a')).toBeUndefined();
    expect(result.value.bookmarks.find((b) => b.id === 'bm-1')?.tagIds).toEqual([]);
    expect(result.value.bookmarks.find((b) => b.id === 'bm-2')?.tagIds).toEqual(['tag-b']);
  });

  // REQ-014-AC-002：添加/移除保持唯一。
  test('addTagToBookmark 添加标签且不重复', async () => {
    const mod = await loadTags();
    expect(mod.addTagToBookmark).toBeTypeOf('function');
    if (!mod.addTagToBookmark) throw new Error('addTagToBookmark is required');

    const library = sampleLibrary();
    const first = mod.addTagToBookmark(library, { bookmarkId: 'bm-1', tagId: 'tag-b' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.bookmarks.find((b) => b.id === 'bm-1')?.tagIds).toEqual(['tag-a', 'tag-b']);

    const again = mod.addTagToBookmark(first.value, { bookmarkId: 'bm-1', tagId: 'tag-b' });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value.bookmarks.find((b) => b.id === 'bm-1')?.tagIds).toEqual(['tag-a', 'tag-b']);
  });

  test('removeTagFromBookmark 移除书签标签', async () => {
    const mod = await loadTags();
    expect(mod.removeTagFromBookmark).toBeTypeOf('function');
    if (!mod.removeTagFromBookmark) throw new Error('removeTagFromBookmark is required');

    const result = mod.removeTagFromBookmark(sampleLibrary(), {
      bookmarkId: 'bm-2',
      tagId: 'tag-a',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks.find((b) => b.id === 'bm-2')?.tagIds).toEqual(['tag-b']);
  });

  // REQ-014-AC-003：采纳建议标签且不得重复。
  test('acceptSuggestedTag 加入标签恰好一次并从建议中移除', async () => {
    const mod = await loadTags();
    expect(mod.acceptSuggestedTag).toBeTypeOf('function');
    if (!mod.acceptSuggestedTag) throw new Error('acceptSuggestedTag is required');

    const library = sampleLibrary();
    const result = mod.acceptSuggestedTag(library, {
      bookmarkId: 'bm-1',
      tagId: 'tag-b',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bookmark = result.value.bookmarks.find((b) => b.id === 'bm-1');
    expect(bookmark?.tagIds).toEqual(['tag-a', 'tag-b']);
    expect(bookmark?.aiSuggestedTags).toEqual(['tag-a']);

    const again = mod.acceptSuggestedTag(result.value, {
      bookmarkId: 'bm-1',
      tagId: 'tag-b',
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value.bookmarks.find((b) => b.id === 'bm-1')?.tagIds).toEqual([
      'tag-a',
      'tag-b',
    ]);
  });

  // REQ-014-AC-001：侧栏计数。
  test('countBookmarksByTag 返回准确计数', async () => {
    const mod = await loadTags();
    expect(mod.countBookmarksByTag).toBeTypeOf('function');
    if (!mod.countBookmarksByTag) throw new Error('countBookmarksByTag is required');

    const library = sampleLibrary();
    expect(mod.countBookmarksByTag(library.bookmarks, 'tag-a')).toBe(2);
    expect(mod.countBookmarksByTag(library.bookmarks, 'tag-b')).toBe(1);
  });
});
