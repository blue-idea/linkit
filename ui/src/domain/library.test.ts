import { describe, expect, test } from 'vitest';

type DomainModule = typeof import('./library');

async function loadDomainModule(): Promise<Partial<DomainModule>> {
  return import('./library').catch(() => ({}));
}

const timestamp = '2026-07-16T12:00:00.000Z';

const validBookmark = {
  id: 'b-react', title: 'React documentation', url: 'https://react.dev', domain: 'react.dev',
  favicon: 'https://react.dev/favicon.ico', description: 'React reference', notes: 'Hooks reference',
  tagIds: ['t-doc'], categoryId: 'c-react', collectionIds: ['col-build'], createdAt: timestamp,
  updatedAt: timestamp, lastVisitedAt: null, visitCount: 3, starred: true, pinned: false,
  readStatus: 'reading', health: 'ok', healthCheckedAt: null, healthHttpStatus: null,
  healthFingerprint: null, healthErrorCode: null, aiSummary: 'Official React documentation.',
  aiSuggestedTags: ['frontend'], thumbnail: 'blue',
};

const validLibraryEnvelope = {
  format: 'linkit-library', schemaVersion: 1, revision: 12, updatedAt: timestamp,
  data: {
    bookmarks: [validBookmark],
    categories: [
      { id: 'c-tech', name: 'Technology', icon: 'Code2', parentId: null, color: 'blue' },
      { id: 'c-react', name: 'React', icon: 'Atom', parentId: 'c-tech', color: 'blue' },
    ],
    collections: [{ id: 'col-build', name: 'Build a website', emoji: '🛠️', color: 'blue',
      description: 'Project references', bookmarkIds: ['b-react'], createdAt: timestamp, updatedAt: timestamp }],
    tags: [{ id: 't-doc', label: 'Documentation', color: 'gray' }],
  },
};

describe('Library Schema 与引用完整性', () => {
  // REQ-026-AC-001：结构有效的集合应返回已校验数据。
  test('LibraryEnvelope 在完整数据有效时返回规范化资料库', async () => {
    const domain = await loadDomainModule();
    expect(domain.validateLibraryEnvelope).toBeTypeOf('function');
    expect(domain.validateLibraryEnvelope?.(validLibraryEnvelope)).toEqual({ success: true, data: validLibraryEnvelope });
  });

  // REQ-026-AC-001：无效 JSON 必须返回结构化错误。
  test('LibraryEnvelope 在 JSON 语法无效时返回 JSON_PARSE_ERROR', async () => {
    const domain = await loadDomainModule();
    expect(domain.parseLibraryDocument).toBeTypeOf('function');
    expect(domain.parseLibraryDocument?.('{"format":')).toMatchObject({
      success: false, errors: [{ code: 'JSON_PARSE_ERROR', path: [] }],
    });
  });

  // REQ-026-AC-002：必须一次列出所有悬空引用，禁止静默接受。
  test('LibraryData 在存在悬空引用时列出全部无效关系', async () => {
    const domain = await loadDomainModule();
    const invalidEnvelope = structuredClone(validLibraryEnvelope);
    invalidEnvelope.data.bookmarks[0].categoryId = 'c-missing';
    invalidEnvelope.data.bookmarks[0].tagIds = ['t-missing'];
    invalidEnvelope.data.bookmarks[0].collectionIds = ['col-missing'];
    invalidEnvelope.data.collections[0].bookmarkIds = ['b-missing'];
    expect(domain.validateLibraryEnvelope).toBeTypeOf('function');
    const result = domain.validateLibraryEnvelope?.(invalidEnvelope);
    expect(result).toMatchObject({ success: false, errors: expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_CATEGORY_REFERENCE' }),
      expect.objectContaining({ code: 'INVALID_TAG_REFERENCE' }),
      expect.objectContaining({ code: 'INVALID_COLLECTION_REFERENCE' }),
      expect.objectContaining({ code: 'INVALID_BOOKMARK_REFERENCE' }),
    ]) });
    if (result && !result.success) expect(result.errors).toHaveLength(4);
  });

  // REQ-026-AC-002：分类树不得形成自引用或间接环。
  test('Category 在父级关系成环时返回 CATEGORY_CYCLE', async () => {
    const domain = await loadDomainModule();
    const invalidEnvelope = structuredClone(validLibraryEnvelope);
    invalidEnvelope.data.categories[0].parentId = 'c-react';
    expect(domain.validateLibraryEnvelope).toBeTypeOf('function');
    expect(domain.validateLibraryEnvelope?.(invalidEnvelope)).toMatchObject({
      success: false, errors: expect.arrayContaining([expect.objectContaining({ code: 'CATEGORY_CYCLE' })]),
    });
  });

  // REQ-026-AC-003：主题成员关系必须双向一致。
  test('Collection 在书签关系不对称时返回双向关系错误', async () => {
    const domain = await loadDomainModule();
    const invalidEnvelope = structuredClone(validLibraryEnvelope);
    invalidEnvelope.data.bookmarks[0].collectionIds = [];
    expect(domain.validateLibraryEnvelope).toBeTypeOf('function');
    expect(domain.validateLibraryEnvelope?.(invalidEnvelope)).toMatchObject({
      success: false, errors: [expect.objectContaining({ code: 'ASYMMETRIC_COLLECTION_MEMBERSHIP' })],
    });
  });

  // REQ-026-AC-003：关系 ID 不得重复。
  test('LibraryData 在关系 ID 重复时返回 DUPLICATE_REFERENCE', async () => {
    const domain = await loadDomainModule();
    const invalidEnvelope = structuredClone(validLibraryEnvelope);
    invalidEnvelope.data.bookmarks[0].tagIds = ['t-doc', 't-doc'];
    expect(domain.validateLibraryEnvelope).toBeTypeOf('function');
    expect(domain.validateLibraryEnvelope?.(invalidEnvelope)).toMatchObject({
      success: false, errors: [expect.objectContaining({ code: 'DUPLICATE_REFERENCE' })],
    });
  });

  // REQ-026-AC-004：持久化往返必须保留全部书签字段。
  test('Bookmark 在序列化再解析后保留全部正式字段', async () => {
    const domain = await loadDomainModule();
    expect(domain.parseLibraryDocument).toBeTypeOf('function');
    expect(domain.parseLibraryDocument?.(JSON.stringify(validLibraryEnvelope))).toEqual({ success: true, data: validLibraryEnvelope });
  });
});

describe('Library V1 迁移', () => {
  // REQ-026-AC-001：当前 V1 信封应走只读校验，不重复迁移。
  test('迁移器在输入当前 V1 信封时原样返回已校验数据', async () => {
    const domain = await loadDomainModule();

    const result = domain.migrateLibraryDocument?.(validLibraryEnvelope, { now: timestamp });

    expect(result).toEqual({ success: true, data: validLibraryEnvelope });
  });

  // REQ-026-AC-001：非对象迁移输入必须返回结构化 Schema 错误。
  test('迁移器在输入 null 时返回结构化验证错误', async () => {
    const domain = await loadDomainModule();

    const result = domain.migrateLibraryDocument?.(null, { now: timestamp });

    expect(result).toMatchObject({
      success: false,
      errors: [expect.objectContaining({ code: 'SCHEMA_VALIDATION_ERROR' })],
    });
  });

  // REQ-026-AC-004：原型已存在的正式字段不得被默认值覆盖。
  test('迁移器保留原型中已存在的 V1 字段和值', async () => {
    const domain = await loadDomainModule();
    const legacyDocument = structuredClone(validLibraryEnvelope.data);

    const result = domain.migrateLibraryDocument?.(legacyDocument, { now: timestamp });

    expect(result).toEqual({
      success: true,
      data: {
        format: 'linkit-library',
        schemaVersion: 1,
        revision: 0,
        updatedAt: timestamp,
        data: legacyDocument,
      },
    });
  });

  // REQ-026-AC-001/004：缺省可迁移字段应使用明确默认值，不依赖主题映射。
  test('迁移器在集合与可选原型字段缺省时生成完整 V1 书签', async () => {
    const domain = await loadDomainModule();
    const legacyDocument = {
      bookmarks: [{
        id: 'b-minimal',
        title: 'Minimal bookmark',
        url: 'https://example.com',
        domain: 'example.com',
        categoryId: '',
        createdAt: timestamp,
      }],
      categories: [],
      tags: [],
    };

    const result = domain.migrateLibraryDocument?.(legacyDocument, { now: timestamp });

    expect(result).toMatchObject({
      success: true,
      data: {
        data: {
          bookmarks: [{
            id: 'b-minimal',
            favicon: null,
            description: '',
            notes: '',
            tagIds: [],
            categoryId: null,
            collectionIds: [],
            updatedAt: timestamp,
            lastVisitedAt: null,
            visitCount: 0,
            starred: false,
            pinned: false,
            readStatus: 'unread',
            health: 'ok',
            healthCheckedAt: null,
            healthHttpStatus: null,
            healthFingerprint: null,
            healthErrorCode: null,
            aiSummary: '',
            aiSuggestedTags: [],
            thumbnail: null,
          }],
          collections: [],
        },
      },
    });
  });

  // REQ-026-AC-001/003/004：现有原型数据迁入 V1 时补齐字段并校正关系。
  test('迁移器将原型 tags 转为 tagIds 并补齐 V1 默认字段', async () => {
    const domain = await loadDomainModule();
    const legacyDocument = {
      bookmarks: [{ id: 'b-react', title: 'React documentation', url: 'https://react.dev', domain: 'react.dev',
        favicon: '⚛️', description: 'React reference', notes: 'Hooks reference', tags: ['t-doc'],
        categoryId: 'c-react', collectionIds: [], createdAt: timestamp, lastVisitedAt: null, visitCount: 3,
        starred: true, pinned: false, thumbnail: 'blue', health: 'ok',
        aiSummary: 'Official React documentation.', aiSuggestedTags: ['frontend'] }],
      categories: [{ id: 'c-react', name: 'React', icon: 'Atom', parentId: null, color: 'blue' }],
      collections: [{ id: 'col-build', name: 'Build a website', emoji: '🛠️', color: 'blue',
        description: 'Project references', bookmarkIds: ['b-react'] }],
      tags: [{ id: 't-doc', label: 'Documentation', color: 'gray' }],
    };
    expect(domain.migrateLibraryDocument).toBeTypeOf('function');
    expect(domain.migrateLibraryDocument?.(legacyDocument, { now: timestamp })).toMatchObject({
      success: true,
      data: { format: 'linkit-library', schemaVersion: 1, revision: 0, updatedAt: timestamp,
        data: { bookmarks: [expect.objectContaining({ tagIds: ['t-doc'], collectionIds: ['col-build'],
          updatedAt: timestamp, readStatus: 'unread', healthCheckedAt: null, healthHttpStatus: null,
          healthFingerprint: null, healthErrorCode: null })],
          collections: [expect.objectContaining({ createdAt: timestamp, updatedAt: timestamp })] } },
    });
  });

  // REQ-026-AC-001：未知版本迁移失败时不得返回部分数据。
  test('迁移器在版本高于当前版本时返回 UNSUPPORTED_SCHEMA_VERSION', async () => {
    const domain = await loadDomainModule();
    expect(domain.migrateLibraryDocument).toBeTypeOf('function');
    expect(domain.migrateLibraryDocument?.({ ...validLibraryEnvelope, schemaVersion: 2 }, { now: timestamp })).toEqual({
      success: false,
      errors: [{ code: 'UNSUPPORTED_SCHEMA_VERSION', message: 'Unsupported library schema version: 2', path: ['schemaVersion'] }],
    });
  });
});

describe('AppSettings Schema', () => {
  // TASK-003：有效本机设置必须通过版本化 Schema。
  test('AppSettings 在 HTTPS API Base 与完整偏好有效时返回设置', async () => {
    const domain = await loadDomainModule();
    const settings = { settingsVersion: 1, storageMode: 'local', theme: 'midnight', locale: 'en',
      ai: { apiBase: 'https://api.example.com/v1', model: 'gpt-compatible' }, aiConsent: null,
      view: { defaultMode: 'card' }, lastCloudRevision: null,
      shortcuts: {
        spotlight: 'CmdOrCtrl+K', newBookmark: 'CmdOrCtrl+N', insights: 'CmdOrCtrl+I',
        settings: 'CmdOrCtrl+,', viewCard: 'CmdOrCtrl+1', viewList: 'CmdOrCtrl+2',
        viewMasonry: 'CmdOrCtrl+3', toggleSidebar: 'CmdOrCtrl+\\', toggleWindow: 'CmdOrCtrl+L',
      },
    } as const;
    expect(domain.AppSettingsSchema).toBeDefined();
    expect(domain.AppSettingsSchema?.safeParse(settings)).toEqual({ success: true, data: settings });
  });

  // TASK-003：本机设置必须使用独立的版本化 Schema。
  test('AppSettings 在 API Base 使用非 loopback HTTP 时拒绝配置', async () => {
    const domain = await loadDomainModule();
    expect(domain.AppSettingsSchema).toBeDefined();
    const result = domain.AppSettingsSchema?.safeParse({ settingsVersion: 1, storageMode: 'local',
      theme: 'midnight', locale: 'en', ai: { apiBase: 'http://example.com/v1', model: 'gpt-compatible' },
      aiConsent: null, view: { defaultMode: 'card' }, lastCloudRevision: null,
      shortcuts: {
        spotlight: 'CmdOrCtrl+K', newBookmark: 'CmdOrCtrl+N', insights: 'CmdOrCtrl+I',
        settings: 'CmdOrCtrl+,', viewCard: 'CmdOrCtrl+1', viewList: 'CmdOrCtrl+2',
        viewMasonry: 'CmdOrCtrl+3', toggleSidebar: 'CmdOrCtrl+\\', toggleWindow: 'CmdOrCtrl+L',
      },
    });
    expect(result?.success).toBe(false);
  });
});
