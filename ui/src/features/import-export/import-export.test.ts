import { describe, expect, test } from 'vitest';
import { createLibraryEnvelope, createBookmark, createCategory, createCollection, createTag } from '../../testing/factories';
import {
  buildExportDocument,
  localizeImportError,
  parseImportText,
  summarizeImport,
} from './document';

describe('导入导出文档', () => {
  // REQ-005-AC-001：导出必须包含书签、分类、主题、标签与格式版本。
  test('buildExportDocument 生成含 format 与 schemaVersion 的有效信封', () => {
    const envelope = createLibraryEnvelope({
      bookmarks: [createBookmark({ id: 'b1', title: 'Alpha' })],
      categories: [createCategory({ id: 'c1', name: 'Cat' })],
      collections: [createCollection({ id: 'col1', name: 'Theme', bookmarkIds: ['b1'] })],
      tags: [createTag({ id: 't1', label: 'Tag' })],
    });

    const exported = buildExportDocument(envelope, '2026-07-18T08:00:00.000Z');
    expect(exported.format).toBe('linkit-library');
    expect(exported.schemaVersion).toBe(1);
    expect(exported.data.bookmarks).toHaveLength(1);
    expect(exported.data.categories).toHaveLength(1);
    expect(exported.data.collections).toHaveLength(1);
    expect(exported.data.tags).toHaveLength(1);
    expect(exported.exportedAt).toBe('2026-07-18T08:00:00.000Z');
    expect(JSON.stringify(exported)).not.toContain('apiKey');
  });

  // REQ-005-AC-002：有效 JSON 可解析并产生导入摘要，确认前不视为已应用。
  test('parseImportText 对有效信封返回摘要且 status 为 pending_confirm', () => {
    const envelope = createLibraryEnvelope();
    const result = parseImportText(JSON.stringify(envelope), '2026-07-18T08:00:00.000Z');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.status).toBe('pending_confirm');
    expect(summarizeImport(result.envelope)).toEqual({
      bookmarks: 1,
      categories: 1,
      collections: 1,
      tags: 1,
      schemaVersion: 1,
    });
  });

  // REQ-005-AC-003：无效 JSON 拒绝导入并返回稳定英文错误键。
  test('parseImportText 拒绝无效 JSON 并返回 IMPORT_INVALID', () => {
    const result = parseImportText('{not-json', '2026-07-18T08:00:00.000Z');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.key).toBe('IMPORT_INVALID');
    expect(result.error.message).toBe('Import file is invalid');
  });

  // REQ-023-AC-006：zh 下导入错误显示中文并保留英文 key。
  test('localizeImportError 在 zh 下返回中文文案与英文 key', () => {
    const result = localizeImportError('IMPORT_INVALID', 'zh');
    expect(result.key).toBe('IMPORT_INVALID');
    expect(result.message).toBe('导入文件无效');
    expect(localizeImportError('IMPORT_INVALID', 'en').message).toBe('Import file is invalid');
  });
});
