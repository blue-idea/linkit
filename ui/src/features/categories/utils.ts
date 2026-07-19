import type { Category } from '../../types';

interface TreeCategoryOption {
  id: string;
  name: string;
  level: number;
}

export function buildCategoryTree(categories: Category[]): TreeCategoryOption[] {
  const childrenMap: { [parentId: string]: Category[] } = {};
  const rootCategories: Category[] = [];

  categories.forEach((cat) => {
    if (!cat.parentId) {
      rootCategories.push(cat);
    } else {
      if (!childrenMap[cat.parentId]) {
        childrenMap[cat.parentId] = [];
      }
      childrenMap[cat.parentId].push(cat);
    }
  });

  const result: TreeCategoryOption[] = [];

  function traverse(cat: Category, level: number) {
    result.push({
      id: cat.id,
      name: cat.name,
      level,
    });
    const children = childrenMap[cat.id] || [];
    children.forEach((child) => traverse(child, level + 1));
  }

  rootCategories.forEach((cat) => traverse(cat, 0));

  const visitedIds = new Set(result.map((r) => r.id));
  categories.forEach((cat) => {
    if (!visitedIds.has(cat.id)) {
      result.push({
        id: cat.id,
        name: cat.name,
        level: 0,
      });
    }
  });

  return result;
}
