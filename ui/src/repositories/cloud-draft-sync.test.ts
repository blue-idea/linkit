import { describe, expect, it, vi } from 'vitest';
import { createLibraryEnvelope } from '../testing/factories';
import { createCloudRepository, type CloudBookmarksClient } from './cloud';
import { saveCloudLibraryWithDraft, type CloudDraftBindings } from './cloud-draft-sync';
import { RepositoryError } from './types';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function createClient(overrides: Partial<CloudBookmarksClient> = {}): CloudBookmarksClient {
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

function createDraftBindings(overrides: Partial<CloudDraftBindings> = {}): CloudDraftBindings {
  return {
    writeCloudDraft: vi.fn(async () => undefined),
    clearCloudDraft: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('saveCloudLibraryWithDraft', () => {
  // REQ-027-AC-002/003、REQ-003-AC-004：云失败保留 dirty 草稿，不返回伪成功。
  it('云保存失败时保留 dirty cloud draft 并抛出错误', async () => {
    const envelope = createLibraryEnvelope();
    const draft = createDraftBindings();
    const repo = createCloudRepository({
      client: createClient({
        updateRow: vi.fn(async () => ({
          row: null,
          error: { message: 'Service unavailable', code: '503' },
        })),
      }),
    });

    await expect(
      saveCloudLibraryWithDraft({
        repository: repo,
        draft,
        document: envelope,
        expectedRevision: 0,
        now: () => '2026-07-18T04:00:00.000Z',
      })
    ).rejects.toMatchObject({ code: 'CLOUD_REQUEST_FAILED' });

    expect(draft.writeCloudDraft).toHaveBeenCalledTimes(1);
    const draftJson = (draft.writeCloudDraft as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .draftJson as string;
    const parsed = JSON.parse(draftJson) as {
      format: string;
      dirty: boolean;
      baseRevision: number;
      data: unknown;
    };
    expect(parsed.format).toBe('linkit-cloud-draft');
    expect(parsed.dirty).toBe(true);
    expect(parsed.baseRevision).toBe(0);
    expect(parsed.data).toEqual(envelope.data);
    expect(draft.clearCloudDraft).not.toHaveBeenCalled();
  });

  // REQ-003-AC-005：revision 冲突同样保留 dirty 草稿。
  it('revision 冲突时保留 dirty cloud draft', async () => {
    const envelope = createLibraryEnvelope();
    const draft = createDraftBindings();
    const repo = createCloudRepository({
      client: createClient({
        updateRow: vi.fn(async () => ({ row: null, error: null })),
      }),
    });

    await expect(
      saveCloudLibraryWithDraft({
        repository: repo,
        draft,
        document: envelope,
        expectedRevision: 2,
        now: () => '2026-07-18T04:00:00.000Z',
      })
    ).rejects.toBeInstanceOf(RepositoryError);

    expect(draft.writeCloudDraft).toHaveBeenCalled();
    expect(draft.clearCloudDraft).not.toHaveBeenCalled();
  });

  // REQ-003-AC-001：成功后清理 dirty 草稿。
  it('云保存成功后清理 cloud draft', async () => {
    const envelope = createLibraryEnvelope();
    const draft = createDraftBindings();
    const repo = createCloudRepository({ client: createClient() });

    await expect(
      saveCloudLibraryWithDraft({
        repository: repo,
        draft,
        document: envelope,
        expectedRevision: 0,
        now: () => '2026-07-18T04:00:00.000Z',
      })
    ).resolves.toEqual({
      revision: 1,
      updatedAt: '2026-07-18T00:00:01.000Z',
    });

    expect(draft.writeCloudDraft).toHaveBeenCalled();
    expect(draft.clearCloudDraft).toHaveBeenCalledTimes(1);
  });
});
