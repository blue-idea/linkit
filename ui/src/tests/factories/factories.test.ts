import { describe, expect, test } from 'vitest';
import {
  AppSettingsSchema,
  BookmarkSchema,
  validateLibraryEnvelope,
  type AppSettings,
  type Bookmark,
  type LibraryEnvelope,
} from '../../domain/library';

interface CoreJourneySeed {
  library: LibraryEnvelope;
  settings: AppSettings;
}

interface FactoryModule {
  createBookmark: (overrides?: Partial<Bookmark>) => Bookmark;
  createCoreJourneySeed: () => CoreJourneySeed;
}

async function loadFactoryModule(): Promise<Partial<FactoryModule>> {
  const modulePath = '../../testing/factories/index.ts';
  return import(/* @vite-ignore */ modulePath).catch(() => ({}));
}

describe('授权测试 Factory', () => {
  // REQ-026-AC-001/004：Factory 必须生成结构完整且可独立修改的正式书签。
  test('Bookmark Factory 在重复创建时返回有效且互不共享数组的实体', async () => {
    const factory = await loadFactoryModule();

    expect(factory.createBookmark).toBeTypeOf('function');
    const first = factory.createBookmark?.();
    const second = factory.createBookmark?.();

    expect(BookmarkSchema.safeParse(first).success).toBe(true);
    expect(BookmarkSchema.safeParse(second).success).toBe(true);
    expect(first).toStrictEqual(second);
    expect(first).not.toBe(second);
    expect(first?.tagIds).not.toBe(second?.tagIds);
  });

  // REQ-026-AC-004：测试场景覆盖值必须完整保留，且不污染后续 Factory 调用。
  test('Bookmark Factory 在提供覆盖值时仅替换指定字段', async () => {
    const factory = await loadFactoryModule();

    expect(factory.createBookmark).toBeTypeOf('function');
    const bookmark = factory.createBookmark?.({
      id: 'bookmark-overridden',
      title: 'Overridden bookmark',
      tagIds: ['tag-overridden'],
    });
    const freshBookmark = factory.createBookmark?.();

    expect(bookmark).toMatchObject({
      id: 'bookmark-overridden',
      title: 'Overridden bookmark',
      tagIds: ['tag-overridden'],
    });
    expect(freshBookmark?.id).not.toBe('bookmark-overridden');
    expect(freshBookmark?.tagIds).not.toEqual(['tag-overridden']);
  });

  // REQ-026-AC-001~004：核心旅程 seed 必须确定、结构有效且保持主题成员双向一致。
  test('核心旅程 seed 在重复创建时返回相同的有效资料库与设置', async () => {
    const factory = await loadFactoryModule();

    expect(factory.createCoreJourneySeed).toBeTypeOf('function');
    const first = factory.createCoreJourneySeed?.();
    const second = factory.createCoreJourneySeed?.();

    expect(first).toStrictEqual(second);
    expect(first).not.toBe(second);
    expect(validateLibraryEnvelope(first?.library).success).toBe(true);
    expect(AppSettingsSchema.safeParse(first?.settings).success).toBe(true);
    expect(first?.library.data.bookmarks.some(({ health }) => health !== 'ok')).toBe(true);
  });
});
