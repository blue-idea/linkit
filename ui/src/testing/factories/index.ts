import { TEST_DATA_CONFIG } from '../../config/test-data';
import type { AppSettings, Bookmark, LibraryData, LibraryEnvelope } from '../../domain/library';
import { DEFAULT_UI_SIZE } from '../../config/window-size';

type Category = LibraryData['categories'][number];
type Collection = LibraryData['collections'][number];
type Tag = LibraryData['tags'][number];

export interface CoreJourneySeed {
  library: LibraryEnvelope;
  settings: AppSettings;
}

const defaultBookmark: Bookmark = {
  id: 'bookmark-reference',
  title: 'Reference bookmark',
  url: 'https://example.test/reference',
  domain: 'example.test',
  favicon: null,
  faviconColor: 'blue',
  description: 'Deterministic bookmark fixture.',
  notes: '',
  tagIds: ['tag-reference'],
  categoryId: 'category-reference',
  collectionIds: ['collection-reference'],
  createdAt: TEST_DATA_CONFIG.fixedTimestamp,
  updatedAt: TEST_DATA_CONFIG.fixedTimestamp,
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
};

// REQ-026-AC-001/004：每次返回新的可变数组，避免测试之间共享状态。
export function createBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    ...defaultBookmark,
    ...overrides,
    tagIds: [...(overrides.tagIds ?? defaultBookmark.tagIds)],
    collectionIds: [...(overrides.collectionIds ?? defaultBookmark.collectionIds)],
    aiSuggestedTags: [...(overrides.aiSuggestedTags ?? defaultBookmark.aiSuggestedTags)],
  };
}

export function createTag(overrides: Partial<Tag> = {}): Tag {
  return { id: 'tag-reference', label: 'Reference', color: 'blue', ...overrides };
}

export function createCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'category-reference', name: 'Reference', icon: 'Bookmark', parentId: null, color: 'blue', ...overrides };
}

export function createCollection(overrides: Partial<Collection> = {}): Collection {
  const defaults: Collection = {
    id: 'collection-reference',
    name: 'Reference collection',
    emoji: '📚',
    color: 'blue',
    description: 'Deterministic collection fixture.',
    bookmarkIds: ['bookmark-reference'],
    createdAt: TEST_DATA_CONFIG.fixedTimestamp,
    updatedAt: TEST_DATA_CONFIG.fixedTimestamp,
  };
  return {
    ...defaults,
    ...overrides,
    bookmarkIds: [...(overrides.bookmarkIds ?? defaults.bookmarkIds)],
  };
}

export function createLibraryEnvelope(data: Partial<LibraryData> = {}): LibraryEnvelope {
  return {
    format: 'linkit-library',
    schemaVersion: 1,
    revision: 0,
    updatedAt: TEST_DATA_CONFIG.fixedTimestamp,
    data: {
      bookmarks: [...(data.bookmarks ?? [createBookmark()])],
      categories: [...(data.categories ?? [createCategory()])],
      collections: [...(data.collections ?? [createCollection()])],
      tags: [...(data.tags ?? [createTag()])],
    },
  };
}

export function createAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  const defaults: AppSettings = {
    settingsVersion: 1,
    storageMode: 'local',
    theme: 'midnight',
    locale: 'en',
    ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
    aiConsent: null,
    view: { defaultMode: 'card' },
    lastCloudRevision: null,
    uiSize: DEFAULT_UI_SIZE,
    shortcuts: {
      spotlight: 'CmdOrCtrl+K',
      newBookmark: 'CmdOrCtrl+N',
      insights: 'CmdOrCtrl+I',
      settings: 'CmdOrCtrl+,',
      viewCard: 'CmdOrCtrl+1',
      viewList: 'CmdOrCtrl+2',
      viewMasonry: 'CmdOrCtrl+3',
      toggleLeftSidebar: 'CmdOrCtrl+/',
      toggleRightSidebar: 'CmdOrCtrl+\\',
      toggleWindow: 'CmdOrCtrl+L',
    },
  };
  return {
    ...defaults,
    ...overrides,
    ai: { ...defaults.ai, ...overrides.ai },
    view: { ...defaults.view, ...overrides.view },
    shortcuts: { ...defaults.shortcuts, ...overrides.shortcuts },
  };
}

// REQ-026-AC-001~004：提供本地核心旅程可复用、无凭据的确定性 seed。
export function createCoreJourneySeed(): CoreJourneySeed {
  const tags = [
    createTag(),
    createTag({ id: 'tag-review', label: 'Review', color: 'amber' }),
  ];
  const categories = [
    createCategory(),
    createCategory({ id: 'category-review', name: 'Review', parentId: 'category-reference', color: 'amber' }),
  ];
  const bookmarks = [
    createBookmark(),
    createBookmark({
      id: 'bookmark-health-changed',
      title: 'Changed bookmark',
      url: 'https://example.test/changed',
      tagIds: ['tag-review'],
      categoryId: 'category-review',
      health: 'changed',
      healthCheckedAt: TEST_DATA_CONFIG.fixedTimestamp,
      healthHttpStatus: 200,
      healthFingerprint: 'changed-fixture-v1',
    }),
  ];
  const collections = [createCollection({ bookmarkIds: bookmarks.map(({ id }) => id) })];

  return {
    library: createLibraryEnvelope({ bookmarks, categories, collections, tags }),
    settings: createAppSettings(),
  };
}
