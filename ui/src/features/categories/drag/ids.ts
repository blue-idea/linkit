const CATEGORY_PREFIX = 'category:';

export function categoryDndId(categoryId: string): string {
  return `${CATEGORY_PREFIX}${categoryId}`;
}

export function parseCategoryDndId(dndId: string): string | null {
  return dndId.startsWith(CATEGORY_PREFIX) ? dndId.slice(CATEGORY_PREFIX.length) : null;
}
