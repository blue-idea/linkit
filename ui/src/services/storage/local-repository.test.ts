import { describe, expect, test, vi } from 'vitest';
import { createLibraryEnvelope } from '../../testing/factories';
import { createLocalRepository } from './local-repository';

describe('LocalRepository', () => {
  // TASK-010：将 Go ReadLibrary 状态映射为 RepositoryLoadResult。
  test('load 将 found/empty/recovery_available 映射为统一结果', async () => {
    const envelope = createLibraryEnvelope();
    const readLibrary = vi
      .fn()
      .mockResolvedValueOnce({ state: 'empty' })
      .mockResolvedValueOnce({ state: 'found', documentJson: JSON.stringify(envelope), fileUpdatedAt: envelope.updatedAt })
      .mockResolvedValueOnce({
        state: 'recovery_available',
        recoveryJson: JSON.stringify(envelope),
        recoveryUpdatedAt: envelope.updatedAt,
      });

    const repository = createLocalRepository({ readLibrary, writeLibrary: vi.fn(), replaceLibrary: vi.fn(), describeLocalLibrary: vi.fn() });

    await expect(repository.load()).resolves.toEqual({ state: 'empty' });
    await expect(repository.load()).resolves.toMatchObject({ state: 'found', snapshot: { source: 'local' } });
    await expect(repository.load()).resolves.toMatchObject({ state: 'recovery_available' });
  });

  // REQ-002-AC-004：replace 必须要求 confirmed，防止未确认覆盖。
  test('replace 在未确认时拒绝调用底层 ReplaceLibrary', async () => {
    const replaceLibrary = vi.fn();
    const repository = createLocalRepository({
      readLibrary: vi.fn(),
      writeLibrary: vi.fn(),
      replaceLibrary,
      describeLocalLibrary: vi.fn(),
    });

    await expect(repository.replace(createLibraryEnvelope(), false)).rejects.toThrow(/confirm/i);
    expect(replaceLibrary).not.toHaveBeenCalled();
  });
});
