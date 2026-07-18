import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed } from '../../testing/factories';
import { buildKnowledgeGraph } from './index';

describe('静态知识网络', () => {
  test('中心节点固定且规则边标记共同标签或共同主题', () => {
    const library = createCoreJourneySeed().library.data;
    const graph = buildKnowledgeGraph(library, 'bookmark-reference');
    expect(graph.nodes.find(({ id }) => id === 'bookmark-reference')).toMatchObject({ x: 200, y: 160, center: true });
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges.every(({ relation }) => ['shared-tag', 'shared-collection', 'ai-related'].includes(relation))).toBe(true);
  });

  test('相同输入无论书签顺序如何都生成确定坐标', () => {
    const library = createCoreJourneySeed().library.data;
    const reversed = { ...library, bookmarks: [...library.bookmarks].reverse() };
    expect(buildKnowledgeGraph(library, 'bookmark-reference')).toEqual(buildKnowledgeGraph(reversed, 'bookmark-reference'));
  });

  test('AI 返回库外 ID 时忽略并保留规则降级关系', () => {
    const library = createCoreJourneySeed().library.data;
    const graph = buildKnowledgeGraph(library, 'bookmark-reference', [
      { bookmarkId: 'outside-library', score: 0.99 },
      { bookmarkId: 'bookmark-health-changed', score: 0.8 },
    ]);
    expect(graph.nodes.some(({ id }) => id === 'outside-library')).toBe(false);
    expect(graph.edges.some(({ relation }) => relation !== 'ai-related')).toBe(true);
  });
});
