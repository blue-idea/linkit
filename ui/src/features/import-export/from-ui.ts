import type { LibraryEnvelope } from '../../domain/library';
import type { LibraryData as UiLibrary } from '../../types';
import { toCategoryLibrary } from '../categories/apply-category-command';
import { buildExportDocument, type ExportDocument } from './document';

/**
 * 将当前 UI 资料库包装为可导出的领域信封文档。
 * REQ-005-AC-001
 */
export function buildExportEnvelopeFromUi(
  library: UiLibrary,
  options: { now: string; revision?: number }
): ExportDocument {
  const data = toCategoryLibrary(library);
  const envelope: LibraryEnvelope = {
    format: 'linkit-library',
    schemaVersion: 1,
    revision: options.revision ?? 0,
    updatedAt: options.now,
    data,
  };
  return buildExportDocument(envelope, options.now);
}
