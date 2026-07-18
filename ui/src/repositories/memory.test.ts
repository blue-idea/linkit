import { describe, expect, test } from 'vitest';
import type { LibraryEnvelope } from '../domain/library';
import { createCoreJourneySeed } from '../testing/factories';

type StorageMode = 'local' | 'cloud';
type RepositoryLoadResult =
  | { state: 'empty' }
  | { state: 'found'; snapshot: { source: StorageMode; envelope: LibraryEnvelope } }
  | { state: 'recovery_available'; recovery: { source: StorageMode; envelope: LibraryEnvelope } };

interface LibraryRepository {
  load(): Promise<RepositoryLoadResult>;
  save(document: LibraryEnvelope, expectedRevision: number): Promise<{ revision: number; updatedAt: string }>;
  replace(document: LibraryEnvelope): Promise<{ revision: number; updatedAt: string }>;
  describe(): Promise<{
    exists: boolean;
    revision: number | null;
    updatedAt: string | null;
    bookmarkCount: number | null;
    byteSize: number;
  }>;
}

interface StorageCoordinator {
  getActiveMode(): StorageMode;
  loadActiveLibrary(): Promise<RepositoryLoadResult>;
  saveActiveLibrary(document: LibraryEnvelope, expectedRevision: number): Promise<{ revision: number; updatedAt: string }>;
  replaceActiveLibrary(document: LibraryEnvelope): Promise<{ revision: number; updatedAt: string }>;
  describeStorage(mode: StorageMode): ReturnType<LibraryRepository['describe']>;
  switchStorage(mode: StorageMode): void;
}

interface RepositoryModule {
  createMemoryRepository: (options: {
    source: StorageMode;
    initial?: LibraryEnvelope;
    now?: () => string;
  }) => LibraryRepository;
  createStorageCoordinator: (options: {
    activeMode: StorageMode;
    repositories: Record<StorageMode, LibraryRepository>;
  }) => StorageCoordinator;
}

async function loadRepositoryModule(): Promise<Partial<RepositoryModule>> {
  const modulePath = './index.ts';
  return import(/* @vite-ignore */ modulePath).catch(() => ({}));
}

const savedAt = '2026-07-18T08:00:00.000Z';

describe('MemoryRepository', () => {
  // REQ-026-AC-001：空仓库必须返回显式 empty，而不是伪造文档。
  test('MemoryRepository 在没有初始资料库时返回 empty 摘要', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;

    expect(createRepository).toBeTypeOf('function');
    if (!createRepository) throw new Error('Memory repository factory is required');

    const repository = createRepository({ source: 'local' });

    await expect(repository.load()).resolves.toEqual({ state: 'empty' });
    await expect(repository.describe()).resolves.toEqual({
      exists: false,
      revision: null,
      updatedAt: null,
      bookmarkCount: null,
      byteSize: 0,
    });
  });

  // REQ-026-AC-004：加载结果必须完整且与仓库内部状态隔离。
  test('MemoryRepository 在加载时返回完整快照副本', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;
    const initial = createCoreJourneySeed().library;

    expect(createRepository).toBeTypeOf('function');
    if (!createRepository) throw new Error('Memory repository factory is required');

    const repository = createRepository({ source: 'local', initial });
    const first = await repository.load();

    expect(first).toEqual({ state: 'found', snapshot: { source: 'local', envelope: initial } });
    if (first.state === 'found') first.snapshot.envelope.data.bookmarks[0].title = 'Mutated outside repository';
    await expect(repository.load()).resolves.toEqual({
      state: 'found',
      snapshot: { source: 'local', envelope: initial },
    });
    await expect(repository.describe()).resolves.toMatchObject({
      exists: true,
      revision: initial.revision,
      bookmarkCount: initial.data.bookmarks.length,
    });
  });

  // REQ-026-AC-004：保存成功必须增加 revision、更新时间并保留全部正式字段。
  test('MemoryRepository 在 revision 匹配时保存并返回新 revision', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;
    const initial = createCoreJourneySeed().library;

    expect(createRepository).toBeTypeOf('function');
    if (!createRepository) throw new Error('Memory repository factory is required');

    const repository = createRepository({ source: 'local', initial, now: () => savedAt });
    const changed = structuredClone(initial);
    changed.data.bookmarks[0].notes = 'Saved note';
    const result = await repository.save(changed, initial.revision);

    expect(result).toEqual({ revision: initial.revision + 1, updatedAt: savedAt });
    const loaded = await repository.load();
    expect(loaded).toMatchObject({
      state: 'found',
      snapshot: { envelope: { revision: initial.revision + 1, updatedAt: savedAt } },
    });
    if (loaded.state === 'found') {
      expect(loaded.snapshot.envelope.data.bookmarks[0]).toMatchObject({ notes: 'Saved note' });
    }
  });

  // REQ-027-AC-003：revision 冲突不得显示伪成功，也不得覆盖最后有效状态。
  test('MemoryRepository 在 revision 不匹配时拒绝保存并保留原快照', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;
    const initial = createCoreJourneySeed().library;

    expect(createRepository).toBeTypeOf('function');
    if (!createRepository) throw new Error('Memory repository factory is required');

    const repository = createRepository({ source: 'cloud', initial, now: () => savedAt });
    await expect(repository.save(initial, 99)).rejects.toMatchObject({
      code: 'CLOUD_REVISION_CONFLICT',
      message: 'Library revision conflict',
      retryable: false,
      details: { expectedRevision: 99, actualRevision: initial.revision },
    });
    await expect(repository.load()).resolves.toEqual({
      state: 'found',
      snapshot: { source: 'cloud', envelope: initial },
    });
  });

  // REQ-026-AC-001/002：无效文档必须在进入仓库前被拒绝。
  test('MemoryRepository 在文档引用无效时返回 DOCUMENT_INVALID', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;
    const initial = createCoreJourneySeed().library;

    expect(createRepository).toBeTypeOf('function');
    if (!createRepository) throw new Error('Memory repository factory is required');

    const repository = createRepository({ source: 'local', initial });
    const invalid = structuredClone(initial);
    invalid.data.bookmarks[0].categoryId = 'category-missing';

    await expect(repository.save(invalid, initial.revision)).rejects.toMatchObject({
      code: 'DOCUMENT_INVALID',
      message: 'Library document is invalid',
      retryable: false,
    });
    await expect(repository.load()).resolves.toEqual({
      state: 'found',
      snapshot: { source: 'local', envelope: initial },
    });
  });

  // REQ-026-AC-004：显式 replace 必须完整覆盖并生成新的保存版本。
  test('MemoryRepository replace 使用输入文档覆盖当前快照', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;
    const initial = createCoreJourneySeed().library;

    expect(createRepository).toBeTypeOf('function');
    if (!createRepository) throw new Error('Memory repository factory is required');

    const repository = createRepository({ source: 'local', now: () => savedAt });
    const result = await repository.replace(initial);

    expect(result).toEqual({ revision: initial.revision + 1, updatedAt: savedAt });
    await expect(repository.load()).resolves.toMatchObject({
      state: 'found',
      snapshot: { envelope: { revision: initial.revision + 1, updatedAt: savedAt } },
    });
  });
});

describe('StorageCoordinator', () => {
  // TASK-005：Coordinator 是唯一活动仓库路由，切换后必须使用目标 Repository。
  test('StorageCoordinator 在切换模式后从新的活动仓库加载', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;
    const createCoordinator = repositoryModule.createStorageCoordinator;

    expect(createRepository).toBeTypeOf('function');
    expect(createCoordinator).toBeTypeOf('function');
    if (!createRepository || !createCoordinator) throw new Error('Storage coordinator dependencies are required');

    const local = createRepository({ source: 'local', initial: createCoreJourneySeed().library });
    const cloud = createRepository({ source: 'cloud' });
    const coordinator = createCoordinator({ activeMode: 'local', repositories: { local, cloud } });

    await expect(coordinator.loadActiveLibrary()).resolves.toMatchObject({ state: 'found' });
    coordinator.switchStorage('cloud');

    expect(coordinator.getActiveMode()).toBe('cloud');
    await expect(coordinator.loadActiveLibrary()).resolves.toEqual({ state: 'empty' });
  });

  // TASK-005：保存、覆盖和摘要调用必须统一路由到活动或指定 Repository。
  test('StorageCoordinator 将保存与摘要调用路由到正确仓库', async () => {
    const repositoryModule = await loadRepositoryModule();
    const createRepository = repositoryModule.createMemoryRepository;
    const createCoordinator = repositoryModule.createStorageCoordinator;
    const initial = createCoreJourneySeed().library;

    expect(createRepository).toBeTypeOf('function');
    expect(createCoordinator).toBeTypeOf('function');
    if (!createRepository || !createCoordinator) throw new Error('Storage coordinator dependencies are required');

    const local = createRepository({ source: 'local', initial, now: () => savedAt });
    const cloud = createRepository({ source: 'cloud', now: () => savedAt });
    const coordinator = createCoordinator({ activeMode: 'local', repositories: { local, cloud } });

    await expect(coordinator.saveActiveLibrary(initial, initial.revision)).resolves.toEqual({
      revision: initial.revision + 1,
      updatedAt: savedAt,
    });
    await expect(coordinator.describeStorage('local')).resolves.toMatchObject({ revision: initial.revision + 1 });

    coordinator.switchStorage('cloud');
    await expect(coordinator.replaceActiveLibrary(initial)).resolves.toEqual({
      revision: initial.revision + 1,
      updatedAt: savedAt,
    });
    await expect(coordinator.describeStorage('cloud')).resolves.toMatchObject({ exists: true });
  });
});
