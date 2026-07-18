import { describe, expect, test } from 'vitest';
import { searchBookmarks } from './index';

const fixtures = [
  {
    id: 'title-hit',
    title: 'React Documentation',
    description: 'Official docs',
    domain: 'react.dev',
    notes: 'hooks reference',
  },
  {
    id: 'desc-hit',
    title: 'Other Page',
    description: 'Contains REACT tips in description',
    domain: 'example.test',
    notes: '',
  },
  {
    id: 'domain-hit',
    title: 'Hosting',
    description: '',
    domain: 'react-host.example',
    notes: '',
  },
  {
    id: 'notes-hit',
    title: 'Journal',
    description: '',
    domain: 'notes.test',
    notes: 'remember react later',
  },
  {
    id: 'miss',
    title: 'Unrelated',
    description: 'css only',
    domain: 'css.test',
    notes: 'layout',
  },
];

describe('domain/search · searchBookmarks', () => {
  // REQ-017-AC-002：标题、描述、域名、备注不区分大小写匹配。
  test('按标题描述域名备注做大小写不敏感匹配', () => {
    const result = searchBookmarks('ReAcT', fixtures);
    const ids = result.map((item) => item.id);
    expect(ids).toContain('title-hit');
    expect(ids).toContain('desc-hit');
    expect(ids).toContain('domain-hit');
    expect(ids).toContain('notes-hit');
    expect(ids).not.toContain('miss');
  });

  test('空关键词返回空数组', () => {
    expect(searchBookmarks('   ', fixtures)).toEqual([]);
  });

  test('标题命中排序高于描述域名与备注', () => {
    const result = searchBookmarks('react', fixtures);
    expect(result[0].id).toBe('title-hit');
    expect(result.map((item) => item.id)).toEqual([
      'title-hit',
      'domain-hit',
      'desc-hit',
      'notes-hit',
    ]);
  });
});
