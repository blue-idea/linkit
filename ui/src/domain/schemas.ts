import { z } from 'zod';

const colorSchema = z.enum(['blue', 'green', 'amber', 'coral', 'violet', 'gray']);
const idSchema = z.string().trim().min(1);
const nullableDateTimeSchema = z.iso.datetime().nullable();

export const BookmarkSchema = z.strictObject({
  id: idSchema, title: z.string().trim().min(1), url: z.url({ protocol: /^https?$/ }),
  domain: z.string().trim().min(1), favicon: z.url({ protocol: /^https?$/ }).nullable(),
  description: z.string(), notes: z.string(), tagIds: z.array(idSchema), categoryId: idSchema.nullable(),
  collectionIds: z.array(idSchema), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  lastVisitedAt: nullableDateTimeSchema, visitCount: z.int().min(0), starred: z.boolean(), pinned: z.boolean(),
  readStatus: z.enum(['unread', 'reading', 'read', 'archived']), health: z.enum(['ok', 'changed', 'broken']),
  healthCheckedAt: nullableDateTimeSchema, healthHttpStatus: z.int().min(100).max(599).nullable(),
  healthFingerprint: z.string().nullable(), healthErrorCode: z.string().nullable(), aiSummary: z.string(),
  aiSuggestedTags: z.array(z.string().trim().min(1)), thumbnail: z.string().nullable(),
});

export const TagSchema = z.strictObject({ id: idSchema, label: z.string().trim().min(1), color: colorSchema });
export const CategorySchema = z.strictObject({ id: idSchema, name: z.string().trim().min(1),
  icon: z.string().trim().min(1), parentId: idSchema.nullable(), color: colorSchema.nullable() });
export const CollectionSchema = z.strictObject({ id: idSchema, name: z.string().trim().min(1),
  emoji: z.string().trim().min(1), color: colorSchema, description: z.string(), bookmarkIds: z.array(idSchema),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export const LibraryDataSchema = z.strictObject({ bookmarks: z.array(BookmarkSchema), categories: z.array(CategorySchema),
  collections: z.array(CollectionSchema), tags: z.array(TagSchema) });
export const LibraryEnvelopeSchema = z.strictObject({ format: z.literal('linkit-library'), schemaVersion: z.literal(1),
  revision: z.int().min(0), updatedAt: z.iso.datetime(), data: LibraryDataSchema });

const apiBaseSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname));
}, { message: 'API Base must use HTTPS unless it targets loopback' });

// 空字符串表示 AI 未配置；非空时必须满足 HTTPS/loopback 约束。
const optionalApiBaseSchema = z.union([z.literal(''), apiBaseSchema]);

export const AppSettingsSchema = z.strictObject({
  settingsVersion: z.int().min(1), storageMode: z.enum(['local', 'cloud']),
  theme: z.enum(['midnight', 'ocean', 'graphite', 'sunset']), locale: z.enum(['en', 'zh']),
  ai: z.strictObject({ apiBase: optionalApiBaseSchema, model: z.string().trim() }),
  aiConsent: z.strictObject({ apiBase: apiBaseSchema, grantedAt: z.iso.datetime() }).nullable(),
  view: z.strictObject({ defaultMode: z.enum(['card', 'list', 'masonry', 'timeline', 'tag-aggregation', 'theme-space']) }),
  lastCloudRevision: z.int().min(0).nullable(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
export type LibraryData = z.infer<typeof LibraryDataSchema>;
export type LibraryEnvelope = z.infer<typeof LibraryEnvelopeSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
