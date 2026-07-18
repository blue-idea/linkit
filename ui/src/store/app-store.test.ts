import { describe, expect, test } from 'vitest';
import type { AppSettings, LibraryData, LibraryEnvelope } from '../domain/library';
import {
  setBookmarkCollectionMembership,
  type CommandResult,
  type DomainEvent,
  type LibraryCommand,
} from '../domain/commands';
import type { AppError, SaveResult, StorageMode } from '../repositories';
import { createCoreJourneySeed } from '../testing/factories';

interface AppState {
  session: {
    mode: 'signed_out' | 'local' | 'authenticated';
    userId: string | null;
    initialized: boolean;
    error: AppError | null;
  };
  library: {
    envelope: LibraryEnvelope;
    error: { code: string; message: string } | null;
    events: DomainEvent[];
  };
  sync: {
    activeMode: StorageMode;
    revision: number;
    status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
    error: AppError | null;
    conflict: LibraryEnvelope | null;
  };
  ui: {
    selection: { kind: string; id?: string };
    filters: { query: string; tagIds: string[]; dateRange: string; onlyStarred: boolean };
    view: string;
    selectedBookmarkId: string | null;
    panel: string | null;
    dialog: string | null;
  };
  settings: AppSettings;
  useLocalMode(): void;
  setSessionError(error: AppError): void;
  executeCommand(command: LibraryCommand): CommandResult<LibraryData>;
  hydrateLibrary(input: unknown): boolean;
  markSyncSaving(): void;
  markSyncSaved(result: SaveResult): void;
  markSyncError(error: AppError): void;
  setSyncConflict(envelope: LibraryEnvelope): void;
  switchStorage(mode: StorageMode): void;
  selectBookmark(bookmarkId: string | null): void;
  updateSettings(settings: Partial<AppSettings>): void;
}

interface StoreApi {
  getState(): AppState;
}

interface StoreModule {
  createAppStore: (options: { initialLibrary: LibraryEnvelope; initialSettings: AppSettings }) => StoreApi;
  selectBookmarks: (state: AppState) => LibraryData['bookmarks'];
  selectSessionMode: (state: AppState) => AppState['session']['mode'];
  selectSyncStatus: (state: AppState) => AppState['sync']['status'];
  selectTheme: (state: AppState) => AppSettings['theme'];
  selectSelectedBookmarkId: (state: AppState) => string | null;
}

async function loadStoreModule(): Promise<Partial<StoreModule>> {
  const modulePath = './index.ts';
  return import(/* @vite-ignore */ modulePath).catch(() => ({}));
}

function requireStoreModule(module: Partial<StoreModule>): StoreModule {
  expect(module.createAppStore).toBeTypeOf('function');
  expect(module.selectBookmarks).toBeTypeOf('function');
  expect(module.selectSessionMode).toBeTypeOf('function');
  expect(module.selectSyncStatus).toBeTypeOf('function');
  expect(module.selectTheme).toBeTypeOf('function');
  expect(module.selectSelectedBookmarkId).toBeTypeOf('function');
  if (!module.createAppStore || !module.selectBookmarks || !module.selectSessionMode
    || !module.selectSyncStatus || !module.selectTheme || !module.selectSelectedBookmarkId) {
    throw new Error('App store module is incomplete');
  }
  return module as StoreModule;
}

describe('Zustand App Store', () => {
  // TASK-005：五类 slice 必须组合为单一 Store，并提供细粒度 selector。
  test('App Store 初始化 session、library、sync、ui、settings slices', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const state = store.getState();

    expect(state.session).toMatchObject({ mode: 'signed_out', userId: null, initialized: false, error: null });
    expect(state.library).toMatchObject({ envelope: seed.library, error: null, events: [] });
    expect(state.sync).toMatchObject({ activeMode: 'local', revision: seed.library.revision, status: 'idle' });
    expect(state.ui).toMatchObject({
      selection: { kind: 'all' },
      filters: { query: '', tagIds: [], dateRange: 'all', onlyStarred: false },
      view: 'card',
      selectedBookmarkId: null,
    });
    expect(state.settings).toEqual(seed.settings);
    expect(storeModule.selectBookmarks(state)).toBe(state.library.envelope.data.bookmarks);
    expect(storeModule.selectSessionMode(state)).toBe('signed_out');
    expect(storeModule.selectSyncStatus(state)).toBe('idle');
    expect(storeModule.selectTheme(state)).toBe('midnight');
    expect(storeModule.selectSelectedBookmarkId(state)).toBeNull();
  });

  // REQ-026-AC-003：组件动作只能调度领域命令，成功时保存事件与新资料库。
  test('librarySlice executeCommand 在命令成功时更新资料库并保存领域事件', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const command: LibraryCommand = (library) => setBookmarkCollectionMembership(library, {
      bookmarkId: 'bookmark-health-changed',
      collectionId: 'collection-reference',
      member: false,
    });

    const result = store.getState().executeCommand(command);

    expect(result.ok).toBe(true);
    expect(store.getState().library.envelope.data.bookmarks[1].collectionIds).toEqual([]);
    expect(store.getState().library.events).toEqual([
      expect.objectContaining({ type: 'bookmark.collection-membership.changed' }),
    ]);
    expect(seed.library.data.bookmarks[1].collectionIds).toEqual(['collection-reference']);
  });

  // REQ-026-AC-002：命令失败时必须保留最后有效资料库并公开结构化错误。
  test('librarySlice executeCommand 在命令失败时不修改资料库', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const before = store.getState().library.envelope;

    const result = store.getState().executeCommand((library) => setBookmarkCollectionMembership(library, {
      bookmarkId: 'bookmark-missing',
      collectionId: 'collection-reference',
      member: true,
    }));

    expect(result).toEqual({
      ok: false,
      error: { code: 'BOOKMARK_NOT_FOUND', message: 'Bookmark was not found' },
    });
    expect(store.getState().library.envelope).toBe(before);
    expect(store.getState().library.error).toEqual({
      code: 'BOOKMARK_NOT_FOUND',
      message: 'Bookmark was not found',
    });
  });

  // REQ-026-AC-001/002：即使命令错误地返回成功，Store 也不得接纳无效引用。
  test('librarySlice executeCommand 拒绝命令产生的无效资料库', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const invalid = structuredClone(seed.library.data);
    invalid.bookmarks[0].categoryId = 'category-missing';

    const result = store.getState().executeCommand(() => ({ ok: true, value: invalid, events: [] }));

    expect(result).toEqual({
      ok: false,
      error: { code: 'DOCUMENT_INVALID', message: 'Library document is invalid' },
    });
    expect(store.getState().library.envelope).toEqual(seed.library);
  });

  // REQ-027-AC-002：云错误存在时，本地模式和领域命令仍必须可用。
  test('外部服务失败后本地模式仍可执行领域命令', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const cloudError = { code: 'CLOUD_REQUEST_FAILED', message: 'Cloud is unavailable', retryable: true };

    store.getState().setSessionError(cloudError);
    store.getState().useLocalMode();
    const result = store.getState().executeCommand((library) => setBookmarkCollectionMembership(library, {
      bookmarkId: 'bookmark-health-changed',
      collectionId: 'collection-reference',
      member: false,
    }));

    expect(store.getState().session).toMatchObject({ mode: 'local', error: cloudError });
    expect(result.ok).toBe(true);
    expect(store.getState().library.envelope.data.bookmarks[1].collectionIds).toEqual([]);
  });

  // REQ-027-AC-003：保存失败必须显示英文错误，revision 不变且不得保留 saved 状态。
  test('syncSlice 在保存失败时进入 error 且保留最后成功 revision', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const error = { code: 'LOCAL_WRITE_FAILED', message: 'Failed to save library', retryable: true };

    store.getState().markSyncSaved({ revision: 3, updatedAt: '2026-07-18T08:15:00.000Z' });
    store.getState().markSyncSaving();
    store.getState().markSyncError(error);

    expect(store.getState().sync).toMatchObject({
      status: 'error',
      revision: 3,
      error,
    });
    expect(store.getState().library.envelope).toMatchObject({
      revision: 3,
      updatedAt: '2026-07-18T08:15:00.000Z',
    });
    expect(store.getState().sync.status).not.toBe('saved');
  });

  // REQ-026-AC-001/004：hydrate 只接受有效信封，失败不得覆盖最后有效状态。
  test('librarySlice hydrateLibrary 拒绝无效文档并接受有效快照', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const invalid = structuredClone(seed.library);
    invalid.data.bookmarks[0].categoryId = 'category-missing';

    expect(store.getState().hydrateLibrary(invalid)).toBe(false);
    expect(store.getState().library.envelope).toEqual(seed.library);
    expect(store.getState().library.error).toEqual({
      code: 'DOCUMENT_INVALID',
      message: 'Library document is invalid',
    });

    const next = structuredClone(seed.library);
    next.revision = 7;
    expect(store.getState().hydrateLibrary(next)).toBe(true);
    expect(store.getState().library).toMatchObject({ envelope: next, error: null, events: [] });
    expect(store.getState().sync.revision).toBe(7);
  });

  // TASK-005：各 slice 动作必须只更新自身责任范围。
  test('session、sync、ui 与 settings actions 独立更新对应 slice', async () => {
    const storeModule = requireStoreModule(await loadStoreModule());
    const seed = createCoreJourneySeed();
    const store = storeModule.createAppStore({ initialLibrary: seed.library, initialSettings: seed.settings });
    const conflict = structuredClone(seed.library);
    conflict.revision = 9;

    store.getState().useLocalMode();
    store.getState().switchStorage('cloud');
    store.getState().setSyncConflict(conflict);
    store.getState().selectBookmark('bookmark-reference');
    store.getState().updateSettings({ theme: 'ocean' });

    expect(store.getState().session.mode).toBe('local');
    expect(store.getState().sync).toMatchObject({ activeMode: 'cloud', status: 'conflict', conflict });
    expect(store.getState().ui.selectedBookmarkId).toBe('bookmark-reference');
    expect(store.getState().settings.theme).toBe('ocean');
    expect(store.getState().library.envelope).toEqual(seed.library);
  });
});
