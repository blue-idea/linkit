import type { StateCreator } from 'zustand/vanilla';
import type { AppSettings, LibraryData, LibraryEnvelope } from '../domain/library';
import type { CommandResult, DomainError, DomainEvent, LibraryCommand } from '../domain/commands';
import type { AppError, SaveResult, StorageMode } from '../repositories';

export interface SessionState {
  mode: 'signed_out' | 'local' | 'authenticated';
  userId: string | null;
  initialized: boolean;
  error: AppError | null;
}

export interface SessionSlice {
  session: SessionState;
  useLocalMode(): void;
  setSessionError(error: AppError): void;
}

export interface LibraryState {
  envelope: LibraryEnvelope;
  error: DomainError | null;
  events: DomainEvent[];
}

export interface LibrarySlice {
  library: LibraryState;
  executeCommand(command: LibraryCommand): CommandResult<LibraryData>;
  hydrateLibrary(input: unknown): boolean;
}

export interface SyncState {
  activeMode: StorageMode;
  revision: number;
  status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  error: AppError | null;
  conflict: LibraryEnvelope | null;
}

export interface SyncSlice {
  sync: SyncState;
  markSyncSaving(): void;
  markSyncSaved(result: SaveResult): void;
  markSyncError(error: AppError): void;
  setSyncConflict(envelope: LibraryEnvelope): void;
  switchStorage(mode: StorageMode): void;
}

export type Selection =
  | { kind: 'all' }
  | { kind: 'starred' }
  | { kind: 'recent' }
  | { kind: 'category'; id: string }
  | { kind: 'collection'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'health'; id: 'broken' | 'changed' };

export interface Filters {
  query: string;
  tagIds: string[];
  dateRange: 'all' | '7d' | '30d' | '90d';
  onlyStarred: boolean;
  readStatus: 'all' | 'unread' | 'reading' | 'read' | 'archived';
}

export interface UiState {
  selection: Selection;
  filters: Filters;
  view: AppSettings['view']['defaultMode'];
  selectedBookmarkId: string | null;
  panel: string | null;
  dialog: string | null;
}

export interface UiSlice {
  ui: UiState;
  selectBookmark(bookmarkId: string | null): void;
}

export interface SettingsSlice {
  settings: AppSettings;
  updateSettings(settings: Partial<AppSettings>): void;
}

export interface AppStoreState extends SessionSlice, LibrarySlice, SyncSlice, UiSlice, SettingsSlice {}

export type AppStoreSlice<TSlice> = StateCreator<AppStoreState, [], [], TSlice>;
