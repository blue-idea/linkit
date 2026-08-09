import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed } from '../../../testing/factories';
import { createI18n } from '../../../i18n';
import {
  applyDuplicateBatch,
  applyDuplicateDecision,
  buildDuplicatePreview,
  findDuplicatePairs,
  resolveDuplicateKeep,
  swapDuplicatePreviewSides,
  translateDuplicateReason,
} from './index';

function duplicateLibrary() {
  const library = structuredClone(createCoreJourneySeed().library.data);
  const source = structuredClone(library.bookmarks[1]);
  source.id = 'bookmark-duplicate';
  source.title = 'React Reference Copy';
  source.url = library.bookmarks[0].url;
  source.tagIds = ['tag-health'];
  source.collectionIds = ['collection-reference'];
  library.bookmarks.push(source);
  library.collections[0].bookmarkIds.push(source.id);
  return library;
}

describe('重复书签确认', () => {
  // REQ-020-AC-005：Find duplicates 必须返回全部候选对（重复对数）
  test('findDuplicatePairs shall 返回全部 URL 与同域名候选对且不修改输入', () => {
    const bookmarks = [
      { id: 'a', title: 'Coolors', url: 'https://coolors.co/', domain: 'coolors.co' },
      { id: 'b', title: 'Coolors Copy', url: 'https://coolors.co', domain: 'coolors.co' },
      { id: 'c', title: 'Vite Docs', url: 'https://vitejs.dev/guide/', domain: 'vitejs.dev' },
      { id: 'd', title: 'Vite Home', url: 'https://vitejs.dev/', domain: 'vitejs.dev' },
      { id: 'e', title: 'Unrelated', url: 'https://example.com', domain: 'example.com' },
    ];
    const before = structuredClone(bookmarks);
    const pairs = findDuplicatePairs(bookmarks);
    expect(pairs).toHaveLength(2);
    // REQ-020-AC-008：Keep 为更短 URL 路径（vite 根路径短于 /guide）
    expect(pairs.map(({ targetId, duplicateId }) => `${targetId}:${duplicateId}`)).toEqual([
      'a:b',
      'd:c',
    ]);
    expect(pairs[0]?.reason).toEqual({ kind: 'exact_url' });
    expect(pairs[1]?.reason).toEqual({ kind: 'same_domain', domain: 'vitejs.dev' });
    expect(bookmarks).toStrictEqual(before);
  });

  test('findDuplicatePairs shall 在无候选时返回空数组', () => {
    expect(findDuplicatePairs([
      { id: 'a', title: 'A', url: 'https://a.example', domain: 'a.example' },
      { id: 'b', title: 'B', url: 'https://b.example', domain: 'b.example' },
    ])).toEqual([]);
  });

  // github.com / youtube.com 不参与 Same domain；精确 URL 仍检出
  test('findDuplicatePairs shall 排除 github.com 与 youtube.com 的同域名匹配', () => {
    const pairs = findDuplicatePairs([
      { id: 'g1', title: 'Repo A', url: 'https://github.com/org/a', domain: 'github.com' },
      { id: 'g2', title: 'Repo B', url: 'https://github.com/org/b', domain: 'github.com' },
      { id: 'y1', title: 'Video A', url: 'https://www.youtube.com/watch?v=aaa', domain: 'www.youtube.com' },
      { id: 'y2', title: 'Video B', url: 'https://youtube.com/watch?v=bbb', domain: 'youtube.com' },
      { id: 'g3', title: 'Repo A Copy', url: 'https://github.com/org/a', domain: 'github.com' },
      { id: 'v1', title: 'Vite Docs', url: 'https://vitejs.dev/guide/', domain: 'vitejs.dev' },
      { id: 'v2', title: 'Vite Home', url: 'https://vitejs.dev/', domain: 'vitejs.dev' },
    ]);
    expect(pairs.map(({ targetId, duplicateId, reason }) => (
      `${targetId}:${duplicateId}:${reason.kind}:${'domain' in reason ? reason.domain : ''}`
    ))).toEqual([
      'g1:g3:exact_url:',
      'v2:v1:same_domain:vitejs.dev',
    ]);
  });

  test('translateDuplicateReason shall 随语言切换 Same domain 文案', () => {
    expect(translateDuplicateReason({ kind: 'same_domain', domain: 'vitejs.dev' }, createI18n('en').t))
      .toBe('Same domain: vitejs.dev');
    expect(translateDuplicateReason({ kind: 'same_domain', domain: 'vitejs.dev' }, createI18n('zh').t))
      .toBe('相同域名：vitejs.dev');
    expect(translateDuplicateReason({ kind: 'exact_url' }, createI18n('zh').t))
      .toBe('精确 URL 匹配');
  });

  test('swapDuplicatePreviewSides shall 交换 Keep 与 duplicate 侧', () => {
    const swapped = swapDuplicatePreviewSides({
      targetId: 'keep',
      duplicateId: 'drop',
      reason: { kind: 'exact_url' },
      differences: [{ field: 'title', target: 'Keep Title', duplicate: 'Drop Title' }],
    });
    expect(swapped).toEqual({
      targetId: 'drop',
      duplicateId: 'keep',
      reason: { kind: 'exact_url' },
      differences: [{ field: 'title', target: 'Drop Title', duplicate: 'Keep Title' }],
    });
  });

  // REQ-020-AC-008
  test('resolveDuplicateKeep shall 保留 URL pathname 更短的书签', () => {
    expect(resolveDuplicateKeep(
      { id: 'long', url: 'https://vitejs.dev/guide/features' },
      { id: 'short', url: 'https://vitejs.dev/' },
    )).toEqual({ targetId: 'short', duplicateId: 'long' });
  });

  // REQ-020-AC-007
  test('applyDuplicateBatch shall 批量合并所选对并跳过已缺失书签', () => {
    const library = duplicateLibrary();
    const extra = structuredClone(library.bookmarks[0]);
    extra.id = 'bookmark-extra-dup';
    extra.title = 'Extra Copy';
    extra.url = `${library.bookmarks[0].url}/extra-path`;
    extra.domain = library.bookmarks[0].domain;
    library.bookmarks.push(extra);

    const result = applyDuplicateBatch(library, {
      action: 'merge',
      pairs: [
        { targetId: 'bookmark-reference', duplicateId: 'bookmark-duplicate' },
        { targetId: 'bookmark-reference', duplicateId: 'bookmark-extra-dup' },
        { targetId: 'missing-a', duplicateId: 'missing-b' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-reference')).toBe(true);
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-duplicate')).toBe(false);
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-extra-dup')).toBe(false);
    expect(result.appliedCount).toBe(2);
  });

  test('预览展示匹配依据和字段差异且不修改资料库', () => {
    const library = duplicateLibrary();
    const before = structuredClone(library);
    const preview = buildDuplicatePreview(library, 'bookmark-reference', 'bookmark-duplicate');
    expect(preview).toMatchObject({ reason: { kind: 'exact_url' } });
    expect(preview?.differences.map(({ field }) => field)).toContain('title');
    expect(library).toStrictEqual(before);
  });

  test('合并时保留标签与主题关系并清理重复成员引用', () => {
    const result = applyDuplicateDecision(duplicateLibrary(), {
      targetId: 'bookmark-reference', duplicateId: 'bookmark-duplicate', action: 'merge',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const target = result.value.bookmarks.find(({ id }) => id === 'bookmark-reference');
    expect(target?.tagIds).toEqual(expect.arrayContaining(['tag-reference', 'tag-health']));
    expect(target?.collectionIds).toContain('collection-reference');
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-duplicate')).toBe(false);
    expect(result.value.collections[0].bookmarkIds).not.toContain('bookmark-duplicate');
  });

  test('删除只移除所选重复项并清理主题引用', () => {
    const result = applyDuplicateDecision(duplicateLibrary(), {
      targetId: 'bookmark-reference', duplicateId: 'bookmark-duplicate', action: 'delete',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-reference')).toBe(true);
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-duplicate')).toBe(false);
    expect(result.value.collections[0].bookmarkIds).not.toContain('bookmark-duplicate');
  });
});
