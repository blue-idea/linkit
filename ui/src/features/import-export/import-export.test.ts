import { describe, expect, test } from 'vitest';
import { createLibraryEnvelope, createBookmark, createCategory, createCollection, createTag } from '../../testing/factories';
import type { AppSettings as UiAppSettings } from '../../types';
import { toUiLibraryFromEnvelope } from './apply';
import {
  buildExportDocument,
  localizeImportError,
  parseImportText,
  summarizeImport,
} from './document';

type PlannedImportExportModule = {
  buildBackupEnvelopeFromUi?: (
    library: ReturnType<typeof toUiLibraryFromEnvelope>,
    settings: PlannedUiAppSettings,
    options: { now: string; revision?: number; appVersion?: string },
  ) => unknown;
};

type PlannedUiAppSettings = UiAppSettings & {
  view: { defaultMode: 'card' | 'list' | 'masonry' | 'timeline' | 'tag-aggregation' | 'theme-space' };
};

async function loadPlannedImportExportModule(): Promise<PlannedImportExportModule> {
  return import('./index') as Promise<PlannedImportExportModule>;
}

function createUiSettings(): PlannedUiAppSettings {
  return {
    storageMode: 'local',
    theme: 'midnight',
    locale: 'en',
    ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
    aiConsent: null,
    view: { defaultMode: 'card' },
    shortcuts: {
      spotlight: 'CmdOrCtrl+K',
      newBookmark: 'CmdOrCtrl+N',
      insights: 'CmdOrCtrl+I',
      settings: 'CmdOrCtrl+,',
      viewCard: 'CmdOrCtrl+1',
      viewList: 'CmdOrCtrl+2',
      viewMasonry: 'CmdOrCtrl+3',
      toggleLeftSidebar: 'CmdOrCtrl+/',
      toggleRightSidebar: 'CmdOrCtrl+\\',
      toggleWindow: 'CmdOrCtrl+L',
    },
    uiSize: 'large',
  };
}

describe('导入导出文档', () => {
  test('REQ-034-AC-001 完整备份保留四类实体与可移植设置', async () => {
    const module = await loadPlannedImportExportModule();
    expect(module.buildBackupEnvelopeFromUi).toBeTypeOf('function');
    const libraryEnvelope = createLibraryEnvelope({
      bookmarks: [createBookmark({ id: 'b1', title: 'Alpha' })],
      categories: [createCategory({ id: 'c1', name: 'Cat' })],
      collections: [createCollection({ id: 'col1', name: 'Theme', bookmarkIds: ['b1'] })],
      tags: [createTag({ id: 't1', label: 'Tag' })],
    });
    const backup = module.buildBackupEnvelopeFromUi?.(
      toUiLibraryFromEnvelope(libraryEnvelope),
      createUiSettings(),
      { now: '2026-07-27T08:00:00.000Z', revision: 4, appVersion: '0.2.8' },
    );

    expect(backup).toMatchObject({
      format: 'linkit-backup',
      schemaVersion: 1,
      revision: 4,
      data: {
        bookmarks: [expect.objectContaining({ id: 'b1' })],
        categories: [expect.objectContaining({ id: 'c1' })],
        collections: [expect.objectContaining({ id: 'col1' })],
        tags: [expect.objectContaining({ id: 't1' })],
      },
      settings: {
        settingsVersion: 1,
        storageMode: 'local',
        theme: 'midnight',
        locale: 'en',
        ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
        view: { defaultMode: 'card' },
        uiSize: 'large',
      },
    });
  });

  test('REQ-034-AC-002 序列化结果不含凭据和设备状态', async () => {
    const module = await loadPlannedImportExportModule();
    expect(module.buildBackupEnvelopeFromUi).toBeTypeOf('function');
    const settings = {
      ...createUiSettings(),
      aiConsent: { apiBase: 'https://api.example.test/v1', grantedAt: '2026-07-27T08:00:00.000Z' },
      lastCloudRevision: 11,
      apiKey: 'credential-placeholder',
      session: { accessToken: 'token-placeholder' },
      logs: ['private'],
    };
    const backup = module.buildBackupEnvelopeFromUi?.(
      toUiLibraryFromEnvelope(createLibraryEnvelope()),
      settings,
      { now: '2026-07-27T08:00:00.000Z', appVersion: '0.2.8' },
    );
    const serialized = JSON.stringify(backup);

    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('accessToken');
    expect(serialized).not.toContain('session');
    expect(serialized).not.toContain('logs');
    expect(serialized).not.toContain('aiConsent');
    expect(serialized).not.toContain('lastCloudRevision');
  });

  test('REQ-034-AC-003 有效完整备份解析为可确认的 library 与 settings', async () => {
    const module = await loadPlannedImportExportModule();
    expect(module.buildBackupEnvelopeFromUi).toBeTypeOf('function');
    const backup = module.buildBackupEnvelopeFromUi?.(
      toUiLibraryFromEnvelope(createLibraryEnvelope()),
      createUiSettings(),
      { now: '2026-07-27T08:00:00.000Z', appVersion: '0.2.8' },
    );
    const result = parseImportText(JSON.stringify(backup), '2026-07-27T08:00:00.000Z');

    expect(result).toMatchObject({
      success: true,
      status: 'pending_confirm',
      kind: 'backup',
      settings: expect.objectContaining({ theme: 'midnight', locale: 'en', uiSize: 'large' }),
    });
    if (!result.success) return;
    expect(summarizeImport(result.envelope, result.settings)).toMatchObject({
      settingsIncluded: true,
      storageMode: 'local',
      theme: 'midnight',
      locale: 'en',
      uiSize: 'large',
    });
  });

  test('REQ-034-AC-004 旧 linkit-library 保留当前设置', () => {
    const result = parseImportText(
      JSON.stringify(createLibraryEnvelope()),
      '2026-07-27T08:00:00.000Z',
    );

    expect(result).toMatchObject({
      success: true,
      status: 'pending_confirm',
      kind: 'library',
      settings: null,
    });
  });

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
      settingsIncluded: false,
      storageMode: null,
      theme: null,
      locale: null,
      uiSize: null,
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
