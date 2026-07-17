import type { z } from 'zod';
import { LibraryEnvelopeSchema, type LibraryData, type LibraryEnvelope } from './schemas';

export interface ValidationError { code: string; message: string; path: PropertyKey[] }
export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: ValidationError[] };
const issue = (code: string, message: string, path: PropertyKey[]): ValidationError => ({ code, message, path });
const zodErrors = (error: z.ZodError): ValidationError[] => error.issues.map((item) => issue('SCHEMA_VALIDATION_ERROR', item.message, item.path));
const duplicateErrors = (values: string[], path: PropertyKey[]): ValidationError[] =>
  values.length === new Set(values).size ? [] : [issue('DUPLICATE_REFERENCE', 'Duplicate IDs are not allowed', path)];

function validateRelations(data: LibraryData): ValidationError[] {
  const errors: ValidationError[] = [];
  const bookmarkIds = new Set(data.bookmarks.map(({ id }) => id));
  const categoryIds = new Set(data.categories.map(({ id }) => id));
  const collectionIds = new Set(data.collections.map(({ id }) => id));
  const tagIds = new Set(data.tags.map(({ id }) => id));
  const groups = [{ name: 'bookmarks', ids: bookmarkIds, length: data.bookmarks.length },
    { name: 'categories', ids: categoryIds, length: data.categories.length },
    { name: 'collections', ids: collectionIds, length: data.collections.length },
    { name: 'tags', ids: tagIds, length: data.tags.length }];
  groups.forEach(({ name, ids, length }) => { if (ids.size !== length) errors.push(issue('DUPLICATE_ENTITY_ID', `Duplicate ${name} ID`, ['data', name])); });

  data.bookmarks.forEach((bookmark, index) => {
    errors.push(...duplicateErrors(bookmark.tagIds, ['data', 'bookmarks', index, 'tagIds']));
    errors.push(...duplicateErrors(bookmark.collectionIds, ['data', 'bookmarks', index, 'collectionIds']));
    if (bookmark.categoryId !== null && !categoryIds.has(bookmark.categoryId)) errors.push(issue('INVALID_CATEGORY_REFERENCE', `Unknown category: ${bookmark.categoryId}`, ['data', 'bookmarks', index, 'categoryId']));
    bookmark.tagIds.forEach((id) => { if (!tagIds.has(id)) errors.push(issue('INVALID_TAG_REFERENCE', `Unknown tag: ${id}`, ['data', 'bookmarks', index, 'tagIds'])); });
    bookmark.collectionIds.forEach((id) => { if (!collectionIds.has(id)) errors.push(issue('INVALID_COLLECTION_REFERENCE', `Unknown collection: ${id}`, ['data', 'bookmarks', index, 'collectionIds'])); });
  });
  data.collections.forEach((collection, index) => {
    errors.push(...duplicateErrors(collection.bookmarkIds, ['data', 'collections', index, 'bookmarkIds']));
    collection.bookmarkIds.forEach((id) => { if (!bookmarkIds.has(id)) errors.push(issue('INVALID_BOOKMARK_REFERENCE', `Unknown bookmark: ${id}`, ['data', 'collections', index, 'bookmarkIds'])); });
  });
  data.categories.forEach((category, index) => {
    if (category.parentId !== null && !categoryIds.has(category.parentId)) errors.push(issue('INVALID_CATEGORY_REFERENCE', `Unknown parent category: ${category.parentId}`, ['data', 'categories', index, 'parentId']));
    const visited = new Set([category.id]);
    let parentId = category.parentId;
    while (parentId !== null) {
      if (visited.has(parentId)) { errors.push(issue('CATEGORY_CYCLE', `Category cycle includes: ${category.id}`, ['data', 'categories', index, 'parentId'])); break; }
      visited.add(parentId);
      parentId = data.categories.find(({ id }) => id === parentId)?.parentId ?? null;
    }
  });
  data.collections.forEach((collection, index) => collection.bookmarkIds.forEach((bookmarkId) => {
    const bookmark = data.bookmarks.find(({ id }) => id === bookmarkId);
    if (bookmark && !bookmark.collectionIds.includes(collection.id)) errors.push(issue('ASYMMETRIC_COLLECTION_MEMBERSHIP', 'Collection membership must be symmetric', ['data', 'collections', index, 'bookmarkIds']));
  }));
  data.bookmarks.forEach((bookmark, index) => bookmark.collectionIds.forEach((collectionId) => {
    const collection = data.collections.find(({ id }) => id === collectionId);
    if (collection && !collection.bookmarkIds.includes(bookmark.id)) errors.push(issue('ASYMMETRIC_COLLECTION_MEMBERSHIP', 'Collection membership must be symmetric', ['data', 'bookmarks', index, 'collectionIds']));
  }));
  return errors;
}

// REQ-026-AC-001~004：所有外部资料库输入统一经过结构与关系校验。
export function validateLibraryEnvelope(input: unknown): ValidationResult<LibraryEnvelope> {
  const parsed = LibraryEnvelopeSchema.safeParse(input);
  if (!parsed.success) return { success: false, errors: zodErrors(parsed.error) };
  const errors = validateRelations(parsed.data.data);
  return errors.length > 0 ? { success: false, errors } : { success: true, data: parsed.data };
}
export function parseLibraryDocument(serialized: string): ValidationResult<LibraryEnvelope> {
  try { return validateLibraryEnvelope(JSON.parse(serialized) as unknown); }
  catch { return { success: false, errors: [issue('JSON_PARSE_ERROR', 'Invalid JSON document', [])] }; }
}
