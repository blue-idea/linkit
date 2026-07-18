import { describe, expect, test } from 'vitest';
import {
  groupBookmarksByTimeline,
  groupBookmarksByTags,
  groupBookmarksByThemes,
  NEVER_VISITED_GROUP_ID,
  NEVER_VISITED_LABEL,
} from './index';

describe('domain/views · Timeline', () => {
  // REQ-016-AC-001：默认按 createdAt 分组，组按时间倒序。
  test('groupBookmarksByTimeline 按 createdAt 月份分组且新组在前', () => {
    const groups = groupBookmarksByTimeline(
      [
        { id: 'a', createdAt: '2026-01-15T00:00:00.000Z', lastVisitedAt: '2026-06-01T00:00:00.000Z' },
        { id: 'b', createdAt: '2026-03-10T00:00:00.000Z', lastVisitedAt: null },
        { id: 'c', createdAt: '2026-03-20T00:00:00.000Z', lastVisitedAt: '2026-05-01T00:00:00.000Z' },
      ],
      'createdAt'
    );

    expect(groups.map((g) => g.id)).toEqual(['2026-03', '2026-01']);
    expect(groups[0].bookmarkIds).toEqual(['c', 'b']);
    expect(groups.find((g) => g.id === NEVER_VISITED_GROUP_ID)).toBeUndefined();
  });

  // REQ-016-AC-002：lastVisitedAt 为空归入 Never Visited。
  test('groupBookmarksByTimeline 在 lastVisitedAt 模式下将未访问项归入 Never Visited', () => {
    const groups = groupBookmarksByTimeline(
      [
        { id: 'visited', createdAt: '2026-01-01T00:00:00.000Z', lastVisitedAt: '2026-07-01T00:00:00.000Z' },
        { id: 'never-1', createdAt: '2026-02-01T00:00:00.000Z', lastVisitedAt: null },
        { id: 'never-2', createdAt: '2026-03-01T00:00:00.000Z', lastVisitedAt: null },
        { id: 'older', createdAt: '2025-12-01T00:00:00.000Z', lastVisitedAt: '2026-06-15T00:00:00.000Z' },
      ],
      'lastVisitedAt'
    );

    const neverVisited = groups.find((g) => g.id === NEVER_VISITED_GROUP_ID);
    expect(neverVisited).toBeDefined();
    expect(neverVisited?.label).toBe(NEVER_VISITED_LABEL);
    expect(neverVisited?.bookmarkIds).toEqual(['never-1', 'never-2']);
    expect(groups[groups.length - 1].id).toBe(NEVER_VISITED_GROUP_ID);
    expect(groups.filter((g) => g.id !== NEVER_VISITED_GROUP_ID).map((g) => g.id)).toEqual([
      '2026-07',
      '2026-06',
    ]);
  });
});

describe('domain/views · Tag Aggregation', () => {
  // REQ-016-AC-003：按标签分组且计数等于成员数。
  test('groupBookmarksByTags 产出准确成员与计数', () => {
    const groups = groupBookmarksByTags(
      [
        { id: 'b1', tags: ['t-react', 't-css'] },
        { id: 'b2', tags: ['t-react'] },
        { id: 'b3', tags: [] },
      ],
      [
        { id: 't-react', label: 'React' },
        { id: 't-css', label: 'CSS' },
        { id: 't-unused', label: 'Unused' },
      ]
    );

    expect(groups).toHaveLength(2);
    const react = groups.find((g) => g.tagId === 't-react');
    const css = groups.find((g) => g.tagId === 't-css');
    expect(react).toEqual({
      tagId: 't-react',
      label: 'React',
      bookmarkIds: ['b1', 'b2'],
      count: 2,
    });
    expect(css).toEqual({
      tagId: 't-css',
      label: 'CSS',
      bookmarkIds: ['b1'],
      count: 1,
    });
    expect(groups.every((g) => g.count === g.bookmarkIds.length)).toBe(true);
  });
});

describe('domain/views · Theme Space', () => {
  // REQ-016-AC-004：以主题为容器展示元数据与成员。
  test('groupBookmarksByThemes 为每个主题生成可浏览容器', () => {
    const containers = groupBookmarksByThemes(
      [
        {
          id: 'col-a',
          name: 'Design',
          emoji: '🎨',
          color: 'violet',
          description: 'Inspiration',
          bookmarkIds: ['b1', 'b2', 'missing'],
        },
        {
          id: 'col-b',
          name: 'Build',
          emoji: '🛠️',
          color: 'blue',
          description: 'Ship it',
          bookmarkIds: [],
        },
      ],
      [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }]
    );

    expect(containers).toHaveLength(2);
    expect(containers[0]).toMatchObject({
      collectionId: 'col-a',
      name: 'Design',
      emoji: '🎨',
      description: 'Inspiration',
      bookmarkIds: ['b1', 'b2'],
      count: 2,
    });
    expect(containers[1].bookmarkIds).toEqual([]);
    expect(containers[1].count).toBe(0);
  });
});
