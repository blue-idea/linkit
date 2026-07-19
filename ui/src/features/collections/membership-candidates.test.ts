import { describe, expect, test } from 'vitest';
import { createBookmark } from '../../testing/factories';

async function loadCandidates() {
  return import(/* @vite-ignore */ './membership-candidates').catch(() => null);
}

describe('主题成员候选过滤', () => {
  // REQ-012-AC-007：候选列表排除已是主题成员的书签。
  test('listMembershipCandidates 排除已成员书签', async () => {
    const mod = await loadCandidates();
    expect(mod?.listMembershipCandidates).toBeTypeOf('function');
    if (!mod?.listMembershipCandidates) throw new Error('listMembershipCandidates is required');

    const member = createBookmark({ id: 'bm-member', title: 'Member', url: 'https://a.test/m' });
    const outsider = createBookmark({
      id: 'bm-out',
      title: 'Outsider',
      url: 'https://a.test/o',
      collectionIds: [],
    });

    const result = mod.listMembershipCandidates({
      bookmarks: [member, outsider],
      collectionId: 'collection-reference',
      query: '',
    });

    expect(result.map((bookmark) => bookmark.id)).toEqual(['bm-out']);
  });

  // REQ-012-AC-007：按标题或 URL 不区分大小写搜索。
  test('listMembershipCandidates 按标题或 URL 不区分大小写搜索', async () => {
    const mod = await loadCandidates();
    expect(mod?.listMembershipCandidates).toBeTypeOf('function');
    if (!mod?.listMembershipCandidates) throw new Error('listMembershipCandidates is required');

    const bookmarks = [
      createBookmark({
        id: 'bm-react',
        title: 'React Docs',
        url: 'https://react.dev/learn',
        collectionIds: [],
      }),
      createBookmark({
        id: 'bm-vue',
        title: 'Vue Guide',
        url: 'https://vuejs.org/guide',
        collectionIds: [],
      }),
    ];

    expect(
      mod.listMembershipCandidates({
        bookmarks,
        collectionId: 'collection-reference',
        query: 'REACT',
      }).map((bookmark) => bookmark.id),
    ).toEqual(['bm-react']);

    expect(
      mod.listMembershipCandidates({
        bookmarks,
        collectionId: 'collection-reference',
        query: 'vuejs.org',
      }).map((bookmark) => bookmark.id),
    ).toEqual(['bm-vue']);
  });

  // REQ-012-AC-007：多选集合可切换且去重。
  test('toggleCandidateSelection 切换选中并去重', async () => {
    const mod = await loadCandidates();
    expect(mod?.toggleCandidateSelection).toBeTypeOf('function');
    if (!mod?.toggleCandidateSelection) throw new Error('toggleCandidateSelection is required');

    const once = mod.toggleCandidateSelection(['a'], 'b');
    expect(once).toEqual(['a', 'b']);
    const twice = mod.toggleCandidateSelection(once, 'b');
    expect(twice).toEqual(['a']);
    const again = mod.toggleCandidateSelection(twice, 'a');
    expect(again).toEqual([]);
  });
});
