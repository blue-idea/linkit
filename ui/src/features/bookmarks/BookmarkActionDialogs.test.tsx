import { describe, it, expect } from 'vitest';
import { buildCategoryTree } from '../categories/utils';
import type { Category } from '../../types';

describe('buildCategoryTree', () => {
  it('应该正确构建带有深度层级关系的分类列表并保持父子遍历顺序', () => {
    const mockCategories: Category[] = [
      { id: 'cat-1', name: 'Parent 1', icon: 'Folder', parentId: null },
      { id: 'cat-1-1', name: 'Child 1-1', icon: 'Folder', parentId: 'cat-1' },
      { id: 'cat-2', name: 'Parent 2', icon: 'Folder', parentId: null },
      { id: 'cat-1-2', name: 'Child 1-2', icon: 'Folder', parentId: 'cat-1' },
      { id: 'cat-1-1-1', name: 'Child 1-1-1', icon: 'Folder', parentId: 'cat-1-1' },
    ];

    const result = buildCategoryTree(mockCategories);

    expect(result).toEqual([
      { id: 'cat-1', name: 'Parent 1', level: 0 },
      { id: 'cat-1-1', name: 'Child 1-1', level: 1 },
      { id: 'cat-1-1-1', name: 'Child 1-1-1', level: 2 },
      { id: 'cat-1-2', name: 'Child 1-2', level: 1 },
      { id: 'cat-2', name: 'Parent 2', level: 0 },
    ]);
  });

  it('应该能够正确处理带循环引用或无主父分类的孤儿节点', () => {
    const mockCategories: Category[] = [
      { id: 'cat-orphan', name: 'Orphan Category', icon: 'Folder', parentId: 'non-existing' },
    ];

    const result = buildCategoryTree(mockCategories);

    expect(result).toEqual([
      { id: 'cat-orphan', name: 'Orphan Category', level: 0 },
    ]);
  });
});
