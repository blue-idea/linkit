import type { LibraryData } from '../library';

export interface DomainError {
  code: string;
  message: string;
}

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  payload: TPayload;
}

export type CommandResult<T> =
  | { ok: true; value: T; events: DomainEvent[] }
  | { ok: false; error: DomainError };

export type LibraryCommand = (library: LibraryData) => CommandResult<LibraryData>;
