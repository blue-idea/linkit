import { REPOSITORY_CONFIG } from '../config/repository';
import { validateLibraryEnvelope, type LibraryEnvelope } from '../domain/library';
import {
  RepositoryError,
  type LibraryRepository,
  type RepositoryLoadResult,
  type SaveResult,
  type StorageCoordinator,
  type StorageMode,
  type StorageSummary,
} from './types';

export type {
  AppError,
  LibraryRepository,
  LibrarySnapshot,
  RepositoryLoadResult,
  SaveResult,
  StorageCoordinator,
  StorageMode,
  StorageSummary,
} from './types';
export { RepositoryError } from './types';
export { createAuthRepository } from './auth';
export type { AuthClient, AuthRepository, AuthSession, SignUpResult } from './auth';
export { createSupabaseAuthClient } from './supabase-auth-client';

export interface MemoryRepositoryOptions {
  source: StorageMode;
  initial?: LibraryEnvelope;
  now?: () => string;
}

function cloneEnvelope(envelope: LibraryEnvelope): LibraryEnvelope {
  return structuredClone(envelope);
}

function assertValidDocument(document: LibraryEnvelope): void {
  const validation = validateLibraryEnvelope(document);
  if (!validation.success) {
    throw new RepositoryError({
      ...REPOSITORY_CONFIG.errors.documentInvalid,
      details: { issueCount: validation.errors.length },
    });
  }
}

class MemoryRepository implements LibraryRepository {
  private envelope: LibraryEnvelope | null;
  private readonly source: StorageMode;
  private readonly now: () => string;

  constructor(options: MemoryRepositoryOptions) {
    if (options.initial) assertValidDocument(options.initial);
    this.envelope = options.initial ? cloneEnvelope(options.initial) : null;
    this.source = options.source;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async load(): Promise<RepositoryLoadResult> {
    if (!this.envelope) return { state: 'empty' };
    return {
      state: 'found',
      snapshot: { source: this.source, envelope: cloneEnvelope(this.envelope) },
    };
  }

  async save(document: LibraryEnvelope, expectedRevision: number): Promise<SaveResult> {
    assertValidDocument(document);
    const actualRevision = this.envelope?.revision ?? 0;
    if (expectedRevision !== actualRevision) {
      throw new RepositoryError({
        ...REPOSITORY_CONFIG.errors.revisionConflict,
        details: { expectedRevision, actualRevision },
      });
    }
    return this.store(document, actualRevision + 1);
  }

  async replace(document: LibraryEnvelope): Promise<SaveResult> {
    assertValidDocument(document);
    return this.store(document, document.revision + 1);
  }

  async describe(): Promise<StorageSummary> {
    if (!this.envelope) {
      return { exists: false, revision: null, updatedAt: null, bookmarkCount: null, byteSize: 0 };
    }
    return {
      exists: true,
      revision: this.envelope.revision,
      updatedAt: this.envelope.updatedAt,
      bookmarkCount: this.envelope.data.bookmarks.length,
      byteSize: new TextEncoder().encode(JSON.stringify(this.envelope)).byteLength,
    };
  }

  private store(document: LibraryEnvelope, revision: number): SaveResult {
    const updatedAt = this.now();
    this.envelope = cloneEnvelope({ ...document, revision, updatedAt });
    return { revision, updatedAt };
  }
}

export function createMemoryRepository(options: MemoryRepositoryOptions): LibraryRepository {
  return new MemoryRepository(options);
}

export interface StorageCoordinatorOptions {
  activeMode: StorageMode;
  repositories: Record<StorageMode, LibraryRepository>;
}

class RepositoryStorageCoordinator implements StorageCoordinator {
  private activeMode: StorageMode;
  private readonly repositories: Record<StorageMode, LibraryRepository>;

  constructor(options: StorageCoordinatorOptions) {
    this.activeMode = options.activeMode;
    this.repositories = options.repositories;
  }

  getActiveMode(): StorageMode {
    return this.activeMode;
  }

  loadActiveLibrary(): Promise<RepositoryLoadResult> {
    return this.activeRepository().load();
  }

  saveActiveLibrary(document: LibraryEnvelope, expectedRevision: number): Promise<SaveResult> {
    return this.activeRepository().save(document, expectedRevision);
  }

  replaceActiveLibrary(document: LibraryEnvelope): Promise<SaveResult> {
    return this.activeRepository().replace(document);
  }

  describeStorage(mode: StorageMode): Promise<StorageSummary> {
    return this.repositories[mode].describe();
  }

  switchStorage(mode: StorageMode): void {
    this.activeMode = mode;
  }

  private activeRepository(): LibraryRepository {
    return this.repositories[this.activeMode];
  }
}

export function createStorageCoordinator(options: StorageCoordinatorOptions): StorageCoordinator {
  return new RepositoryStorageCoordinator(options);
}
