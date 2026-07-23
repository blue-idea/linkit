import { describe, expect, test } from 'vitest';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTION_IDS,
  applyShortcutChange,
  detectPlatform,
  findShortcutConflict,
  formatAcceleratorForDisplay,
  mergeShortcuts,
  resetShortcutsToDefaults,
} from './shortcuts';

describe('可配置快捷键', () => {
  // REQ-030-AC-006：九项可配置 action。
  test('默认快捷键覆盖全部可配置 action', () => {
    expect(Object.keys(DEFAULT_SHORTCUTS).sort()).toEqual([...SHORTCUT_ACTION_IDS].sort());
    expect(DEFAULT_SHORTCUTS.toggleWindow).toBe('CmdOrCtrl+L');
    expect(DEFAULT_SHORTCUTS.toggleLeftSidebar).toBe('CmdOrCtrl+/');
    expect(DEFAULT_SHORTCUTS.toggleRightSidebar).toBe('CmdOrCtrl+\\');
    expect(DEFAULT_SHORTCUTS.spotlight).toBe('CmdOrCtrl+K');
  });

  // REQ-030-AC-007：缺省合并。
  test('mergeShortcuts 用默认值补齐缺失 action', () => {
    expect(mergeShortcuts({ spotlight: 'CmdOrCtrl+P' })).toEqual({
      ...DEFAULT_SHORTCUTS,
      spotlight: 'CmdOrCtrl+P',
    });
  });

  // REQ-030-AC-008：冲突检测。
  test('findShortcutConflict 在绑定重复时返回冲突 action', () => {
    const conflict = findShortcutConflict(DEFAULT_SHORTCUTS, 'newBookmark', 'CmdOrCtrl+K');
    expect(conflict).toEqual({ actionId: 'spotlight', accelerator: 'CmdOrCtrl+K' });
  });

  test('findShortcutConflict 允许同一 action 保持原绑定', () => {
    expect(findShortcutConflict(DEFAULT_SHORTCUTS, 'spotlight', 'CmdOrCtrl+K')).toBeNull();
  });

  test('applyShortcutChange 在冲突时拒绝并保持原映射', () => {
    const result = applyShortcutChange(DEFAULT_SHORTCUTS, 'insights', 'CmdOrCtrl+N');
    expect(result).toEqual({
      ok: false,
      code: 'SHORTCUT_CONFLICT',
      message: 'Shortcut conflicts with another action',
      conflictWith: 'newBookmark',
    });
  });

  test('applyShortcutChange 在无冲突时返回新映射', () => {
    const result = applyShortcutChange(DEFAULT_SHORTCUTS, 'insights', 'CmdOrCtrl+J');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shortcuts.insights).toBe('CmdOrCtrl+J');
      expect(result.shortcuts.spotlight).toBe('CmdOrCtrl+K');
    }
  });

  // REQ-030-AC-009：恢复默认。
  test('resetShortcutsToDefaults 返回默认映射副本', () => {
    const reset = resetShortcutsToDefaults();
    expect(reset).toEqual(DEFAULT_SHORTCUTS);
    expect(reset).not.toBe(DEFAULT_SHORTCUTS);
  });

  test('detectPlatform 正确识别平台', () => {
    // 默认 jsdom 环境或 windows 环境下断言为字符串之一
    const p = detectPlatform();
    expect(['windows', 'darwin', 'other']).toContain(p);
  });

  test('formatAcceleratorForDisplay 在 macOS 下显示 Mac 标准按键符号 (⌘, ⌥, ⇧, ⌃)', () => {
    expect(formatAcceleratorForDisplay('CmdOrCtrl+/', 'darwin')).toBe('⌘+/');
    expect(formatAcceleratorForDisplay('CmdOrCtrl+\\', 'darwin')).toBe('⌘+\\');
    expect(formatAcceleratorForDisplay('CmdOrCtrl+Shift+N', 'darwin')).toBe('⌘+⇧+N');
    expect(formatAcceleratorForDisplay('Alt+Shift+I', 'darwin')).toBe('⌥+⇧+I');
    expect(formatAcceleratorForDisplay('Ctrl+Alt+P', 'darwin')).toBe('⌃+⌥+P');
    expect(formatAcceleratorForDisplay('Meta+L', 'darwin')).toBe('⌘+L');
  });

  test('formatAcceleratorForDisplay 在 Windows / Other 下显示标准键名', () => {
    expect(formatAcceleratorForDisplay('CmdOrCtrl+/', 'windows')).toBe('Ctrl+/');
    expect(formatAcceleratorForDisplay('CmdOrCtrl+Shift+N', 'windows')).toBe('Ctrl+Shift+N');
    expect(formatAcceleratorForDisplay('Alt+Shift+I', 'windows')).toBe('Alt+Shift+I');
  });
});

