import { describe, expect, it, vi } from 'vitest';
import { createLibraryEnvelope } from '../testing/factories';
import { createCloudRepository, type CloudBookmarksClient } from './cloud';
import { RepositoryError } from './types';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function createMockClient(overrides: Partial<CloudBookmarksClient> = {}): CloudBookmarksClient {
  return {
    getSessionUserId: vi.fn(async () => USER_ID),
    loadRow: vi.fn(async () => ({ row: null, error: null })),
    insertRow: vi.fn(async () => ({
      row: { revision: 0, updated_at: '2026-07-18T00:00:00.000Z' },
      error: null,
    })),
    updateRow: vi.fn(async () => ({
      row: { revision: 1, updated_at: '2026-07-18T00:00:01.000Z' },
      error: null,
    })),
    ...overrides,
  };
}

describe('CloudRepository', () => {
  // REQ-003-AC-002：本人云行加载并组装为 LibraryEnvelope。
  it('load 在存在本人行时返回 found 快照', async () => {
    const envelope = createLibraryEnvelope();
    const client = createMockClient({
      loadRow: vi.fn(async () => ({
        row: {
          user_id: USER_ID,
          data: envelope.data,
          schema_version: envelope.schemaVersion,
          revision: 3,
          updated_at: '2026-07-18T12:00:00.000Z',
        },
        error: null,
      })),
    });
    const repo = createCloudRepository({ client });

    await expect(repo.load()).resolves.toEqual({
      state: 'found',
      snapshot: {
        source: 'cloud',
        envelope: {
          ...envelope,
          revision: 3,
          updatedAt: '2026-07-18T12:00:00.000Z',
        },
      },
    });
  });

  // REQ-003-AC-002：空云行视为 empty。
  it('load 在无云行时返回 empty', async () => {
    const repo = createCloudRepository({ client: createMockClient() });
    await expect(repo.load()).resolves.toEqual({ state: 'empty' });
  });

  // REQ-003-AC-002：user_id 必须与 session 一致。
  it('load 在 user_id 与 session 不一致时抛出 CLOUD_REQUEST_FAILED', async () => {
    const envelope = createLibraryEnvelope();
    const client = createMockClient({
      loadRow: vi.fn(async () => ({
        row: {
          user_id: '22222222-2222-2222-2222-222222222222',
          data: envelope.data,
          schema_version: 1,
          revision: 0,
          updated_at: '2026-07-18T12:00:00.000Z',
        },
        error: null,
      })),
    });
    const repo = createCloudRepository({ client });

    await expect(repo.load()).rejects.toMatchObject({
      code: 'CLOUD_REQUEST_FAILED',
      retryable: true,
    });
  });

  // REQ-003-AC-002：JSONB 必须通过 Zod。
  it('load 在 data 无法通过 Zod 时抛出 DOCUMENT_INVALID', async () => {
    const client = createMockClient({
      loadRow: vi.fn(async () => ({
        row: {
          user_id: USER_ID,
          data: { bookmarks: [{ id: 'broken' }], categories: [], collections: [], tags: [] },
          schema_version: 1,
          revision: 0,
          updated_at: '2026-07-18T12:00:00.000Z',
        },
        error: null,
      })),
    });
    const repo = createCloudRepository({ client });

    await expect(repo.load()).rejects.toMatchObject({
      code: 'DOCUMENT_INVALID',
      retryable: false,
    });
  });

  // REQ-003-AC-002：首次创建本人云行。
  it('create 在无云行时插入 revision 0 并返回 SaveResult', async () => {
    const envelope = createLibraryEnvelope();
    const insertRow = vi.fn(async () => ({
      row: { revision: 0, updated_at: '2026-07-18T00:00:00.000Z' },
      error: null,
    }));
    const repo = createCloudRepository({ client: createMockClient({ insertRow }) });

    await expect(repo.create(envelope)).resolves.toEqual({
      revision: 0,
      updatedAt: '2026-07-18T00:00:00.000Z',
    });
    expect(insertRow).toHaveBeenCalledWith({
      userId: USER_ID,
      data: envelope.data,
      schemaVersion: envelope.schemaVersion,
      revision: 0,
    });
  });

  // REQ-003-AC-005：expectedRevision 条件更新成功。
  it('save 在 expectedRevision 匹配时递增 revision', async () => {
    const envelope = createLibraryEnvelope();
    const updateRow = vi.fn(async () => ({
      row: { revision: 4, updated_at: '2026-07-18T01:00:00.000Z' },
      error: null,
    }));
    const repo = createCloudRepository({ client: createMockClient({ updateRow }) });

    await expect(repo.save(envelope, 3)).resolves.toEqual({
      revision: 4,
      updatedAt: '2026-07-18T01:00:00.000Z',
    });
    expect(updateRow).toHaveBeenCalledWith({
      userId: USER_ID,
      expectedRevision: 3,
      data: envelope.data,
      schemaVersion: envelope.schemaVersion,
      nextRevision: 4,
    });
  });

  // REQ-003-AC-005：零行更新映射为 CLOUD_REVISION_CONFLICT。
  it('save 在零行更新时抛出 CLOUD_REVISION_CONFLICT', async () => {
    const envelope = createLibraryEnvelope();
    const client = createMockClient({
      updateRow: vi.fn(async () => ({ row: null, error: null })),
    });
    const repo = createCloudRepository({ client });

    await expect(repo.save(envelope, 1)).rejects.toMatchObject({
      code: 'CLOUD_REVISION_CONFLICT',
      message: 'Library revision conflict',
      retryable: false,
    });
  });

  // REQ-027-AC-003：网络错误不得伪装成功。
  it('save 在 Supabase 错误时抛出 CLOUD_REQUEST_FAILED', async () => {
    const envelope = createLibraryEnvelope();
    const client = createMockClient({
      updateRow: vi.fn(async () => ({
        row: null,
        error: { message: 'Network error', code: 'NETWORK' },
      })),
    });
    const repo = createCloudRepository({ client });

    await expect(repo.save(envelope, 0)).rejects.toMatchObject({
      code: 'CLOUD_REQUEST_FAILED',
      retryable: true,
    });
  });

  // REQ-003-AC-002：无会话时拒绝云操作。
  it('save 在无会话时抛出 CLOUD_AUTH_REQUIRED', async () => {
    const envelope = createLibraryEnvelope();
    const client = createMockClient({
      getSessionUserId: vi.fn(async () => null),
    });
    const repo = createCloudRepository({ client });

    await expect(repo.save(envelope, 0)).rejects.toMatchObject({
      code: 'CLOUD_AUTH_REQUIRED',
      retryable: false,
    });
  });

  // REQ-003-AC-005：Overwrite Cloud 使用最新 revision 再保存一次。
  it('replace 先 load 最新 revision 再 save', async () => {
    const envelope = createLibraryEnvelope();
    const updateRow = vi.fn(async () => ({
      row: { revision: 8, updated_at: '2026-07-18T02:00:00.000Z' },
      error: null,
    }));
    const client = createMockClient({
      loadRow: vi.fn(async () => ({
        row: {
          user_id: USER_ID,
          data: envelope.data,
          schema_version: 1,
          revision: 7,
          updated_at: '2026-07-18T01:30:00.000Z',
        },
        error: null,
      })),
      updateRow,
    });
    const repo = createCloudRepository({ client });

    await expect(repo.replace(envelope)).resolves.toEqual({
      revision: 8,
      updatedAt: '2026-07-18T02:00:00.000Z',
    });
    expect(updateRow).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 7, nextRevision: 8 })
    );
  });

  it('describe 汇总云端摘要', async () => {
    const envelope = createLibraryEnvelope();
    const client = createMockClient({
      loadRow: vi.fn(async () => ({
        row: {
          user_id: USER_ID,
          data: envelope.data,
          schema_version: 1,
          revision: 2,
          updated_at: '2026-07-18T03:00:00.000Z',
        },
        error: null,
      })),
    });
    const repo = createCloudRepository({ client });
    const summary = await repo.describe();

    expect(summary.exists).toBe(true);
    expect(summary.revision).toBe(2);
    expect(summary.bookmarkCount).toBe(envelope.data.bookmarks.length);
    expect(summary.byteSize).toBeGreaterThan(0);
  });

  it('未配置 client 时抛出 CLOUD_AUTH_REQUIRED', async () => {
    const repo = createCloudRepository({ client: null });
    await expect(repo.load()).rejects.toBeInstanceOf(RepositoryError);
    await expect(repo.load()).rejects.toMatchObject({ code: 'CLOUD_AUTH_REQUIRED' });
  });
});
