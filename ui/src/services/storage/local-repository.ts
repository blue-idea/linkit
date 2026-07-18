import { REPOSITORY_CONFIG } from '../../config/repository';
import { validateLibraryEnvelope, type LibraryEnvelope } from '../../domain/library';
import {
  RepositoryError,
  type LibraryRepository,
  type RepositoryLoadResult,
  type SaveResult,
  type StorageSummary,
} from '../../repositories';

export interface LocalDocumentBindings {
  readLibrary: () => Promise<{
    state: string;
    documentJson?: string;
    recoveryJson?: string;
    fileUpdatedAt?: string;
    recoveryUpdatedAt?: string;
  }>;
  writeLibrary: (request: { documentJson: string; expectedRevision: number }) => Promise<SaveResult>;
  replaceLibrary: (request: { documentJson: string; confirmed: boolean }) => Promise<SaveResult>;
  describeLocalLibrary: () => Promise<StorageSummary>;
}

function parseEnvelope(raw: string, label: string): LibraryEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RepositoryError({
      ...REPOSITORY_CONFIG.errors.documentInvalid,
      details: { reason: `${label} is not valid JSON` },
    });
  }
  const validation = validateLibraryEnvelope(parsed);
  if (!validation.success) {
    throw new RepositoryError({
      ...REPOSITORY_CONFIG.errors.documentInvalid,
      details: { issueCount: validation.errors.length },
    });
  }
  return validation.data;
}

class LocalRepository implements LibraryRepository {
  constructor(private readonly bindings: LocalDocumentBindings) {}

  async load(): Promise<RepositoryLoadResult> {
    const result = await this.bindings.readLibrary();
    if (result.state === 'empty') {
      return { state: 'empty' };
    }
    if (result.state === 'found' && result.documentJson) {
      return {
        state: 'found',
        snapshot: { source: 'local', envelope: parseEnvelope(result.documentJson, 'document') },
      };
    }
    if (result.state === 'recovery_available' && result.recoveryJson) {
      return {
        state: 'recovery_available',
        recovery: { source: 'local', envelope: parseEnvelope(result.recoveryJson, 'recovery') },
      };
    }
    throw new RepositoryError({
      ...REPOSITORY_CONFIG.errors.documentInvalid,
      details: { reason: `Unexpected local read state: ${result.state}` },
    });
  }

  async save(document: LibraryEnvelope, expectedRevision: number): Promise<SaveResult> {
    return this.bindings.writeLibrary({
      documentJson: JSON.stringify(document),
      expectedRevision,
    });
  }

  /**
   * 破坏性替换必须显式确认（导入/恢复/种子覆盖）。
   * 第二个参数 confirmed 供调用方门禁；未确认时不触达 Go。
   */
  async replace(document: LibraryEnvelope, confirmed = true): Promise<SaveResult> {
    if (!confirmed) {
      throw new RepositoryError({
        code: 'INVALID_ARGUMENT',
        message: 'Replacement was not confirmed',
        retryable: false,
      });
    }
    return this.bindings.replaceLibrary({
      documentJson: JSON.stringify(document),
      confirmed: true,
    });
  }

  describe(): Promise<StorageSummary> {
    return this.bindings.describeLocalLibrary();
  }
}

export function createLocalRepository(bindings: LocalDocumentBindings): LibraryRepository & {
  replace(document: LibraryEnvelope, confirmed?: boolean): Promise<SaveResult>;
} {
  return new LocalRepository(bindings);
}
