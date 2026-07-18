import type { LibraryEnvelope } from '../domain/library';

export type StorageMode = 'local' | 'cloud';

export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, string | number | boolean | null>;
}

export class RepositoryError extends Error implements AppError {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: Record<string, string | number | boolean | null>;

  constructor(error: AppError) {
    super(error.message);
    this.name = 'RepositoryError';
    this.code = error.code;
    this.retryable = error.retryable;
    this.details = error.details;
  }
}

export interface SaveResult {
  revision: number;
  updatedAt: string;
}

export interface StorageSummary {
  exists: boolean;
  revision: number | null;
  updatedAt: string | null;
  bookmarkCount: number | null;
  byteSize: number;
}

export interface LibrarySnapshot {
  source: StorageMode;
  envelope: LibraryEnvelope;
}

export type RepositoryLoadResult =
  | { state: 'empty' }
  | { state: 'found'; snapshot: LibrarySnapshot }
  | { state: 'recovery_available'; recovery: LibrarySnapshot };

export interface LibraryRepository {
  load(): Promise<RepositoryLoadResult>;
  save(document: LibraryEnvelope, expectedRevision: number): Promise<SaveResult>;
  replace(document: LibraryEnvelope): Promise<SaveResult>;
  describe(): Promise<StorageSummary>;
}

export interface StorageCoordinator {
  getActiveMode(): StorageMode;
  loadActiveLibrary(): Promise<RepositoryLoadResult>;
  saveActiveLibrary(document: LibraryEnvelope, expectedRevision: number): Promise<SaveResult>;
  replaceActiveLibrary(document: LibraryEnvelope): Promise<SaveResult>;
  describeStorage(mode: StorageMode): Promise<StorageSummary>;
  switchStorage(mode: StorageMode): void;
}
