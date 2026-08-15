import { beforeEach, describe, expect, test } from 'vitest';
import { createDataRootBindings, resetBrowserDataRootForTests } from './data-root';

describe('数据根浏览器适配器', () => {
  beforeEach(() => {
    localStorage.clear();
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

  // REQ-029-AC-003：目标占用时选择保留只切换目录，不覆盖浏览器替身中的当前快照。
  test('目标占用选择保留时只设置数据根', async () => {
    const storage = window.localStorage;
    storage.setItem('linkit.data-root.occupied:D:\\Occupied', '1');
    storage.setItem('linkit.library.v1', '{"format":"linkit-library","schemaVersion":1,"revision":9}');
    const bindings = createDataRootBindings(storage);

    const result = await bindings.migrateDataRoot({
      targetPath: 'D:\\Occupied',
      confirmed: true,
      conflictStrategy: 'keep',
      libraryDocumentJson: '{"format":"linkit-library","schemaVersion":1,"revision":1}',
    });

    expect(result).toEqual({ dataRoot: 'D:\\Occupied', migratedFiles: [] });
    expect(storage.getItem('linkit.library.v1')).toContain('"revision":9');
    await expect(bindings.getDataRoot()).resolves.toMatchObject({
      dataRoot: 'D:\\Occupied',
      isCustom: true,
    });
  });

  // REQ-029-AC-003：目标占用时选择覆盖使用现有迁移路径写入当前快照。
  test('目标占用选择覆盖时写入当前快照', async () => {
    const storage = window.localStorage;
    storage.setItem('linkit.data-root.occupied:D:\\Occupied', '1');
    storage.setItem('linkit.library.v1', '{"format":"linkit-library","schemaVersion":1,"revision":9}');
    const bindings = createDataRootBindings(storage);

    const result = await bindings.migrateDataRoot({
      targetPath: 'D:\\Occupied',
      confirmed: true,
      conflictStrategy: 'overwrite',
      libraryDocumentJson: '{"format":"linkit-library","schemaVersion":1,"revision":1}',
    });

    expect(result.dataRoot).toBe('D:\\Occupied');
    expect(result.migratedFiles).toEqual(['library.json']);
    expect(storage.getItem('linkit.library.v1')).toContain('"revision":1');
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
