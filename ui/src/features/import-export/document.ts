import type { AppLocale } from '../../config/i18n';
import type { LibraryEnvelope } from '../../domain/library';
import { migrateLibraryDocument } from '../../domain/migration';

export type ImportErrorKey = 'IMPORT_INVALID';

export const IMPORT_ERROR_MESSAGES = {
  IMPORT_INVALID: {
    en: 'Import file is invalid',
    zh: '导入文件无效',
  },
} as const;

export type ImportSummary = {
  bookmarks: number;
  categories: number;
  collections: number;
  tags: number;
  schemaVersion: number;
};

export type ExportDocument = LibraryEnvelope & {
  exportedAt: string;
};

export type ParseImportResult =
  | {
      success: true;
      status: 'pending_confirm';
      envelope: LibraryEnvelope;
    }
  | {
      success: false;
      error: { key: ImportErrorKey; message: string };
    };

/** 从已校验信封构建导出去重文档（不含设置/密钥）。覆盖 REQ-005-AC-001。 */
export function buildExportDocument(envelope: LibraryEnvelope, exportedAt: string): ExportDocument {
  return {
    format: envelope.format,
    schemaVersion: envelope.schemaVersion,
    revision: envelope.revision,
    updatedAt: envelope.updatedAt,
    data: envelope.data,
    exportedAt,
  };
}

export function summarizeImport(envelope: LibraryEnvelope): ImportSummary {
  return {
    bookmarks: envelope.data.bookmarks.length,
    categories: envelope.data.categories.length,
    collections: envelope.data.collections.length,
    tags: envelope.data.tags.length,
    schemaVersion: envelope.schemaVersion,
  };
}

/**
 * 解析导入文本：有效则进入待确认；无效返回稳定英文错误。
 * 覆盖 REQ-005-AC-002 / REQ-005-AC-003。
 */
export function parseImportText(raw: string, now: string): ParseImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return {
      success: false,
      error: { key: 'IMPORT_INVALID', message: IMPORT_ERROR_MESSAGES.IMPORT_INVALID.en },
    };
  }

  const migrated = migrateLibraryDocument(parsed, { now });
  if (!migrated.success) {
    return {
      success: false,
      error: { key: 'IMPORT_INVALID', message: IMPORT_ERROR_MESSAGES.IMPORT_INVALID.en },
    };
  }

  return {
    success: true,
    status: 'pending_confirm',
    envelope: migrated.data,
  };
}

/** 用户可见导入错误本地化。覆盖 REQ-023-AC-006。 */
export function localizeImportError(
  key: ImportErrorKey,
  locale: AppLocale
): { key: ImportErrorKey; message: string } {
  const messages = IMPORT_ERROR_MESSAGES[key];
  return {
    key,
    message: locale === 'zh' ? messages.zh : messages.en,
  };
}
