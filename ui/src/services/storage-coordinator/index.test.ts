import { describe, expect, it, vi } from 'vitest';
import { createLibraryEnvelope, createBookmark } from '../../testing/factories';
import { createMemoryRepository } from '../../repositories';
import {
  createStorageSwitchCoordinator,
  type CloudDraftStore,
  type StorageSwitchCoordinator,
} from './index';

const FIXED_NOW = '2026-07-18T12:00:00.000Z';

function bareBookmark(overrides: Parameters<typeof createBookmark>[0] = {}) {
  return createBookmark({
    categoryId: null,
    tagIds: [],
    collectionIds: [],
    ...overrides,
  });
}

function bareEnvelope(bookmarkId: string, title: string, path: string) {
  return createLibraryEnvelope({
    bookmarks: [bareBookmark({ id: bookmarkId, title, url: `https://example.test/${path}` })],
    categories: [],
    collections: [],
    tags: [],
  });
}

function createDraftStore(overrides: Partial<CloudDraftStore> = {}): CloudDraftStore {
  let draftJson: string | null = null;
  return {
    read: vi.fn(async () => ({
      state: draftJson ? ('found' as const) : ('empty' as const),
      draftJson: draftJson ?? undefined,
    })),
    write: vi.fn(async (json: string) => {
      draftJson = json;
    }),
    clear: vi.fn(async () => {
      draftJson = null;
    }),
    ...overrides,
  };
}

function createCoordinator(options?: {
  localEnvelope?: ReturnType<typeof createLibraryEnvelope> | null;
  cloudEnvelope?: ReturnType<typeof createLibraryEnvelope> | null;
  activeMode?: 'local' | 'cloud';
  draft?: CloudDraftStore;
}): StorageSwitchCoordinator {
  const local = createMemoryRepository({
    source: 'local',
    initial: options?.localEnvelope === null ? undefined : (options?.localEnvelope ?? createLibraryEnvelope()),
  });
  const cloud = createMemoryRepository({
    source: 'cloud',
    initial: options?.cloudEnvelope === null ? undefined : (options?.cloudEnvelope ?? bareEnvelope('bookmark-cloud', 'Cloud bookmark', 'cloud')),
  });
  return createStorageSwitchCoordinator({
    activeMode: options?.activeMode ?? 'local',
    repositories: { local, cloud },
    draft: options?.draft ?? createDraftStore(),
    now: () => FIXED_NOW,
  });
}

describe('StorageSwitchCoordinator', () => {
  // REQ-004-AC-001：切换前展示源端与目标端摘要，不改数据。
  it('prepareSwitch 返回双方摘要且不改变活动模式', async () => {
    const localLib = createLibraryEnvelope();
    const cloudLib = bareEnvelope('b-cloud', 'C', 'c');
    const coordinator = createCoordinator({ localEnvelope: localLib, cloudEnvelope: cloudLib });

    const preview = await coordinator.prepareSwitch('cloud');

    expect(preview.sourceMode).toBe('local');
    expect(preview.targetMode).toBe('cloud');
    expect(preview.sourceSummary.bookmarkCount).toBe(localLib.data.bookmarks.length);
    expect(preview.targetSummary.bookmarkCount).toBe(1);
    expect(preview.sourceSummary.exists).toBe(true);
    expect(preview.targetSummary.exists).toBe(true);
    expect(coordinator.getActiveMode()).toBe('local');
  });

  // REQ-004-AC-004：Cancel 无副作用。
  it('confirmSwitch(cancel) 保持原模式与原资料库', async () => {
    const coordinator = createCoordinator();
    const before = await coordinator.loadActiveLibrary();
    await coordinator.prepareSwitch('cloud');

    const result = await coordinator.confirmSwitch('cancel');

    expect(result.status).toBe('cancelled');
    expect(coordinator.getActiveMode()).toBe('local');
    await expect(coordinator.loadActiveLibrary()).resolves.toEqual(before);
  });

  // REQ-004-AC-002：Use Target 加载目标端。
  it('confirmSwitch(use_target) 切换到目标模式并加载目标资料库', async () => {
    const cloudLib = bareEnvelope('b-cloud', 'Cloud Only', 'cloud-only');
    const coordinator = createCoordinator({ cloudEnvelope: cloudLib });
    await coordinator.prepareSwitch('cloud');

    const result = await coordinator.confirmSwitch('use_target');

    expect(result.status).toBe('switched');
    expect(result.activeMode).toBe('cloud');
    expect(coordinator.getActiveMode()).toBe('cloud');
    await expect(coordinator.loadActiveLibrary()).resolves.toMatchObject({
      state: 'found',
      snapshot: { source: 'cloud', envelope: { data: { bookmarks: [{ id: 'b-cloud' }] } } },
    });
  });

  // REQ-004-AC-003：Overwrite Target 写入后再切换。
  it('confirmSwitch(overwrite_target) 用当前库覆盖目标端后切换', async () => {
    const localLib = bareEnvelope('b-local', 'Local Only', 'local-only');
    const cloudLib = bareEnvelope('b-cloud', 'Cloud Old', 'cloud-old');
    const coordinator = createCoordinator({ localEnvelope: localLib, cloudEnvelope: cloudLib });
    await coordinator.prepareSwitch('cloud');

    const result = await coordinator.confirmSwitch('overwrite_target');

    expect(result.status).toBe('switched');
    expect(coordinator.getActiveMode()).toBe('cloud');
    const loaded = await coordinator.loadActiveLibrary();
    expect(loaded.state).toBe('found');
    if (loaded.state === 'found') {
      expect(loaded.snapshot.envelope.data.bookmarks[0]?.id).toBe('b-local');
    }
  });

  // REQ-004-AC-004：目标写入失败保持原模式。
  it('confirmSwitch(overwrite_target) 写入失败时保持原模式', async () => {
    const local = createMemoryRepository({ source: 'local', initial: createLibraryEnvelope() });
    const cloud = createMemoryRepository({ source: 'cloud', initial: createLibraryEnvelope() });
    vi.spyOn(cloud, 'replace').mockRejectedValue(
      Object.assign(new Error('write failed'), { code: 'CLOUD_REQUEST_FAILED', retryable: true })
    );
    const coordinator = createStorageSwitchCoordinator({
      activeMode: 'local',
      repositories: { local, cloud },
      draft: createDraftStore(),
      now: () => FIXED_NOW,
    });
    await coordinator.prepareSwitch('cloud');

    const result = await coordinator.confirmSwitch('overwrite_target');

    expect(result.status).toBe('failed');
    expect(coordinator.getActiveMode()).toBe('local');
  });

  // REQ-003-AC-005：revision 冲突暂停自动保存并提供三选项。
  it('handleSaveConflict 进入冲突态且 pauseAutosave', async () => {
    const cloudLib = createLibraryEnvelope();
    cloudLib.revision = 5;
    const coordinator = createCoordinator({ activeMode: 'cloud', cloudEnvelope: cloudLib });

    const conflict = await coordinator.beginRevisionConflict(cloudLib);

    expect(conflict.status).toBe('conflict');
    expect(conflict.choices).toEqual(['use_cloud_copy', 'overwrite_cloud', 'cancel']);
    expect(coordinator.isAutosavePaused()).toBe(true);
  });

  it('resolveRevisionConflict(cancel) 保持云数据不变并继续暂停', async () => {
    const cloudLib = createLibraryEnvelope();
    cloudLib.revision = 5;
    const coordinator = createCoordinator({ activeMode: 'cloud', cloudEnvelope: cloudLib });
    await coordinator.beginRevisionConflict(cloudLib);

    const result = await coordinator.resolveRevisionConflict('cancel');

    expect(result.status).toBe('cancelled');
    expect(coordinator.isAutosavePaused()).toBe(true);
    expect(coordinator.getActiveMode()).toBe('cloud');
  });

  it('resolveRevisionConflict(use_cloud_copy) 加载云副本并恢复自动保存', async () => {
    const cloudLib = bareEnvelope('from-cloud', 'From Cloud', 'from-cloud');
    cloudLib.revision = 8;
    const coordinator = createCoordinator({ activeMode: 'cloud', cloudEnvelope: cloudLib });
    await coordinator.beginRevisionConflict(cloudLib);

    const result = await coordinator.resolveRevisionConflict('use_cloud_copy');

    expect(result.status).toBe('resolved');
    expect(result.envelope?.data.bookmarks[0]?.id).toBe('from-cloud');
    expect(coordinator.isAutosavePaused()).toBe(false);
  });

  it('resolveRevisionConflict(overwrite_cloud) 强制覆盖云端', async () => {
    const localMemory = bareEnvelope('mine', 'Mine', 'mine');
    const cloudLib = createLibraryEnvelope();
    cloudLib.revision = 3;
    const coordinator = createCoordinator({
      activeMode: 'cloud',
      localEnvelope: localMemory,
      cloudEnvelope: cloudLib,
    });
    // 冲突时客户端持有的内存文档
    await coordinator.beginRevisionConflict(cloudLib, localMemory);

    const result = await coordinator.resolveRevisionConflict('overwrite_cloud');

    expect(result.status).toBe('resolved');
    expect(coordinator.isAutosavePaused()).toBe(false);
    const loaded = await coordinator.loadActiveLibrary();
    expect(loaded.state).toBe('found');
    if (loaded.state === 'found') {
      expect(loaded.snapshot.envelope.data.bookmarks[0]?.id).toBe('mine');
    }
  });

  // dirty cloud draft 启动恢复。
  it('inspectDirtyDraft 在存在 dirty 草稿时返回恢复提示', async () => {
    const draftData = createLibraryEnvelope().data;
    const draftJson = JSON.stringify({
      format: 'linkit-cloud-draft',
      schemaVersion: 1,
      baseRevision: 2,
      dirty: true,
      updatedAt: FIXED_NOW,
      data: draftData,
    });
    const draft = createDraftStore({
      read: vi.fn(async () => ({ state: 'found' as const, draftJson })),
    });
    const cloudLib = createLibraryEnvelope();
    cloudLib.revision = 4;
    const coordinator = createCoordinator({ activeMode: 'cloud', cloudEnvelope: cloudLib, draft });

    const inspection = await coordinator.inspectDirtyDraft();

    expect(inspection.status).toBe('dirty_pending');
    expect(inspection.baseRevision).toBe(2);
    expect(inspection.cloudRevision).toBe(4);
  });

  it('resolveDirtyDraft(discard) 清理草稿并保持云模式', async () => {
    const draftData = createLibraryEnvelope().data;
    let cleared = false;
    const draft = createDraftStore({
      read: vi.fn(async () => ({
        state: 'found' as const,
        draftJson: JSON.stringify({
          format: 'linkit-cloud-draft',
          schemaVersion: 1,
          baseRevision: 1,
          dirty: true,
          updatedAt: FIXED_NOW,
          data: draftData,
        }),
      })),
      clear: vi.fn(async () => {
        cleared = true;
      }),
    });
    const coordinator = createCoordinator({ activeMode: 'cloud', draft });
    await coordinator.inspectDirtyDraft();

    const result = await coordinator.resolveDirtyDraft('discard');

    expect(result.status).toBe('resolved');
    expect(cleared).toBe(true);
    expect(coordinator.getActiveMode()).toBe('cloud');
  });
});
