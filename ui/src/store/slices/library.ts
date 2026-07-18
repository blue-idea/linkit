import { REPOSITORY_CONFIG } from '../../config/repository';
import { validateLibraryEnvelope, type LibraryData, type LibraryEnvelope } from '../../domain/library';
import type { CommandResult, DomainError } from '../../domain/commands';
import type { AppStoreSlice, LibrarySlice } from '../types';

const invalidDocumentError: DomainError = {
  code: REPOSITORY_CONFIG.errors.documentInvalid.code,
  message: REPOSITORY_CONFIG.errors.documentInvalid.message,
};

function invalidCommandResult(): Extract<CommandResult<LibraryData>, { ok: false }> {
  return { ok: false, error: { ...invalidDocumentError } };
}

export function createLibrarySlice(initialLibrary: LibraryEnvelope): AppStoreSlice<LibrarySlice> {
  return (set, get) => ({
    library: { envelope: structuredClone(initialLibrary), error: null, events: [] },
    executeCommand: (command) => {
      const result = command(get().library.envelope.data);
      if (!result.ok) {
        set((state) => ({
          library: { ...state.library, error: result.error, events: [] },
        }));
        return result;
      }

      const envelope = { ...get().library.envelope, data: result.value };
      if (!validateLibraryEnvelope(envelope).success) {
        const invalidResult = invalidCommandResult();
        set((state) => ({
          library: { ...state.library, error: invalidResult.error, events: [] },
        }));
        return invalidResult;
      }

      set({ library: { envelope, error: null, events: result.events } });
      return result;
    },
    hydrateLibrary: (input) => {
      const result = validateLibraryEnvelope(input);
      if (!result.success) {
        set((state) => ({
          library: { ...state.library, error: { ...invalidDocumentError }, events: [] },
        }));
        return false;
      }
      set((state) => ({
        library: { envelope: result.data, error: null, events: [] },
        sync: { ...state.sync, revision: result.data.revision },
      }));
      return true;
    },
  });
}
