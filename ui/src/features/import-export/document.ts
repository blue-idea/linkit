import type { AppLocale } from '../../config/i18n';
import {
  BackupEnvelopeSchema,
  type LibraryData,
  type LibraryEnvelope,
  type PortableAppSettings,
  validateLibraryEnvelope,
} from '../../domain/library';
import { migrateLibraryDocument } from '../../domain/migration';

export type ImportErrorKey = 'IMPORT_INVALID';

export const IMPORT_ERROR_MESSAGES = {
  IMPORT_INVALID: {
    en: 'Import file is invalid',
    zh: '导入文件无效',
  },
} as const;

export type ImportSummary = {
  mode: 'linkit-json';
  bookmarks: number;
  categories: number;
  collections: number;
  tags: number;
  schemaVersion: number;
  settingsIncluded: boolean;
  storageMode: PortableAppSettings['storageMode'] | null;
  theme: PortableAppSettings['theme'] | null;
  locale: PortableAppSettings['locale'] | null;
  uiSize: PortableAppSettings['uiSize'] | null;
};

export type ExportDocument = LibraryEnvelope & {
  exportedAt: string;
};

export type ParseImportResult =
  | {
      success: true;
      status: 'pending_confirm';
      kind: 'backup' | 'library';
      envelope: LibraryEnvelope;
      settings: PortableAppSettings | null;
    }
  | {
      success: false;
      error: { key: ImportErrorKey; message: string };
    };

export type PendingImport = Extract<ParseImportResult, { success: true }>;

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

export function summarizeImport(
  envelope: LibraryEnvelope,
  settings: PortableAppSettings | null = null,
): ImportSummary {
  return {
    mode: 'linkit-json',
    bookmarks: envelope.data.bookmarks.length,
    categories: envelope.data.categories.length,
    collections: envelope.data.collections.length,
    tags: envelope.data.tags.length,
    schemaVersion: envelope.schemaVersion,
    settingsIncluded: settings !== null,
    storageMode: settings?.storageMode ?? null,
    theme: settings?.theme ?? null,
    locale: settings?.locale ?? null,
    uiSize: settings?.uiSize ?? null,
  };
}

function invalidImport(): ParseImportResult {
  return {
    success: false,
    error: { key: 'IMPORT_INVALID', message: IMPORT_ERROR_MESSAGES.IMPORT_INVALID.en },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 修复不对称集合关系：以集合的 bookmarkIds 为权威来源，
 * 从书签的 collectionIds 中删除不在任何集合 bookmarkIds 中的孤立引用。
 * 方案B：容错导入，而非直接拒绝历史数据中的不对称记录。
 */
function repairAsymmetricCollections(data: LibraryData): LibraryData {
  const collectionBookmarkIndex = new Map<string, Set<string>>();
  for (const col of data.collections) {
    collectionBookmarkIndex.set(col.id, new Set(col.bookmarkIds));
  }

  const repairedBookmarks = data.bookmarks.map((bookmark) => {
    const validCollectionIds = bookmark.collectionIds.filter((colId) => {
      const members = collectionBookmarkIndex.get(colId);
      return members !== undefined && members.has(bookmark.id);
    });
    if (validCollectionIds.length === bookmark.collectionIds.length) {
      return bookmark;
    }
    return { ...bookmark, collectionIds: validCollectionIds };
  });

  return { ...data, bookmarks: repairedBookmarks };
}

function parseBackupDocument(parsed: unknown): ParseImportResult {
  const backup = BackupEnvelopeSchema.safeParse(parsed);
  if (!backup.success) {
    return invalidImport();
  }

  // 容错修复：在关系校验前先对齐不对称的集合成员关系（方案B）。
  const repairedData = repairAsymmetricCollections(backup.data.data);

  // 复用统一的资料库关系校验，确保引用完整性与旧格式保持一致。
  const library = validateLibraryEnvelope({
    format: 'linkit-library',
    schemaVersion: backup.data.schemaVersion,
    revision: backup.data.revision,
    updatedAt: backup.data.updatedAt,
    data: repairedData,
  });
  if (!library.success) {
    return invalidImport();
  }

  return {
    success: true,
    status: 'pending_confirm',
    kind: 'backup',
    envelope: library.data,
    settings: backup.data.settings,
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
    return invalidImport();
  }

  if (isRecord(parsed) && parsed.format === 'linkit-backup') {
    return parseBackupDocument(parsed);
  }

  const migrated = migrateLibraryDocument(parsed, { now });
  if (!migrated.success) {
    return invalidImport();
  }

  return {
    success: true,
    status: 'pending_confirm',
    kind: 'library',
    envelope: migrated.data,
    settings: null,
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
