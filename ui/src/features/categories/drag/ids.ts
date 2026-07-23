const CATEGORY_PREFIX = 'category:';

export const CATEGORY_ROOT_DND_ID = `${CATEGORY_PREFIX}__root__`;

export function categoryDndId(categoryId: string | null): string {
  if (categoryId === null || categoryId === '__root__') {
    return CATEGORY_ROOT_DND_ID;
  }
  return `${CATEGORY_PREFIX}${categoryId}`;
}

export function parseCategoryDndId(dndId: string): string | null | undefined {
  if (!dndId.startsWith(CATEGORY_PREFIX)) {
    return undefined;
  }
  const id = dndId.slice(CATEGORY_PREFIX.length);
  if (id === '__root__') {
    return null;
  }
  return id;
}

