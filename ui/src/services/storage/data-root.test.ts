import { beforeEach, describe, expect, test } from 'vitest';
import { createDataRootBindings, resetBrowserDataRootForTests } from './data-root';

describe('数据根浏览器适配器', () => {
  beforeEach(() => {
    resetBrowserDataRootForTests();
    delete (window as unknown as { __linkitSelectDirectory?: unknown }).__linkitSelectDirectory;
  });

  // REQ-029-AC-001：未确认前不写路径。
  test('未确认迁移时拒绝写入', async () => {
    const bindings = createDataRootBindings();
    await expect(bindings.migrateDataRoot({ targetPath: 'D:\\LinkitData', confirmed: false })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    const info = await bindings.getDataRoot();
    expect(info.isCustom).toBe(false);
  });

  // REQ-029-AC-003：目标占用阻止迁移。
  test('目标占用时阻止迁移', async () => {
    const storage = window.localStorage;
    storage.setItem('linkit.data-root.occupied:D:\\Occupied', '1');
    const bindings = createDataRootBindings(storage);
    await expect(bindings.migrateDataRoot({ targetPath: 'D:\\Occupied', confirmed: true })).rejects.toMatchObject({
      code: 'DATA_ROOT_TARGET_OCCUPIED',
    });
  });

  // REQ-029-AC-002：确认迁移后更新数据根，并携带资料库/设置快照。
  test('确认迁移后更新数据根并写入快照', async () => {
    const bindings = createDataRootBindings();
    (window as unknown as { __linkitSelectDirectory: () => string }).__linkitSelectDirectory = () => 'D:\\LinkitData';
    const selected = await bindings.selectDataRootDirectory();
    expect(selected).toEqual({ state: 'selected', path: 'D:\\LinkitData' });

    const result = await bindings.migrateDataRoot({
      targetPath: 'D:\\LinkitData',
      confirmed: true,
      libraryDocumentJson: '{"format":"linkit-library","schemaVersion":1,"revision":1}',
      settingsJson: '{"settingsVersion":1,"storageMode":"local","theme":"midnight","locale":"en"}',
    });
    expect(result.dataRoot).toBe('D:\\LinkitData');
    expect(result.migratedFiles).toEqual(expect.arrayContaining(['library.json', 'settings.json']));
    const info = await bindings.getDataRoot();
    expect(info.isCustom).toBe(true);
    expect(info.dataRoot).toBe('D:\\LinkitData');
    expect(window.localStorage.getItem('linkit.library.v1')).toContain('linkit-library');
    expect(window.localStorage.getItem('linkit.settings.v1')).toContain('midnight');
  });
});
