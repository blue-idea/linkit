/** 可配置快捷键：默认绑定、冲突检测与合并。REQ-030 */

export const SHORTCUT_ACTION_IDS = [
  'spotlight',
  'newBookmark',
  'insights',
  'settings',
  'viewCard',
  'viewList',
  'viewMasonry',
  'toggleSidebar',
  'toggleWindow',
] as const;

export type ShortcutActionId = (typeof SHORTCUT_ACTION_IDS)[number];

export type ShortcutMap = Record<ShortcutActionId, string>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  spotlight: 'CmdOrCtrl+K',
  newBookmark: 'CmdOrCtrl+N',
  insights: 'CmdOrCtrl+I',
  settings: 'CmdOrCtrl+,',
  viewCard: 'CmdOrCtrl+1',
  viewList: 'CmdOrCtrl+2',
  viewMasonry: 'CmdOrCtrl+3',
  toggleSidebar: 'CmdOrCtrl+\\',
  toggleWindow: 'CmdOrCtrl+L',
};

export type ShortcutConflict = {
  actionId: ShortcutActionId;
  accelerator: string;
};

export type ApplyShortcutResult =
  | { ok: true; shortcuts: ShortcutMap }
  | {
      ok: false;
      code: 'SHORTCUT_CONFLICT' | 'SHORTCUT_INVALID';
      message: string;
      conflictWith?: ShortcutActionId;
    };

function normalizeAccelerator(raw: string): string {
  const trimmed = raw.trim();
  const parts = trimmed.split('+').map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) {
    return trimmed;
  }
  const [mod, key] = parts;
  const normalizedMod = mod.toLowerCase() === 'cmdorctrl' ? 'CmdOrCtrl' : mod;
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
  return `${normalizedMod}+${normalizedKey}`;
}

export function mergeShortcuts(partial?: Partial<ShortcutMap> | null): ShortcutMap {
  return { ...DEFAULT_SHORTCUTS, ...(partial ?? {}) };
}

export function resetShortcutsToDefaults(): ShortcutMap {
  return { ...DEFAULT_SHORTCUTS };
}

export function findShortcutConflict(
  shortcuts: ShortcutMap,
  actionId: ShortcutActionId,
  accelerator: string,
): ShortcutConflict | null {
  const normalized = normalizeAccelerator(accelerator);
  for (const id of SHORTCUT_ACTION_IDS) {
    if (id === actionId) continue;
    if (normalizeAccelerator(shortcuts[id]) === normalized) {
      return { actionId: id, accelerator: shortcuts[id] };
    }
  }
  return null;
}

export function applyShortcutChange(
  shortcuts: ShortcutMap,
  actionId: ShortcutActionId,
  accelerator: string,
): ApplyShortcutResult {
  const normalized = normalizeAccelerator(accelerator);
  if (!normalized || !normalized.includes('+')) {
    return {
      ok: false,
      code: 'SHORTCUT_INVALID',
      message: 'Shortcut accelerator is invalid',
    };
  }
  const conflict = findShortcutConflict(shortcuts, actionId, normalized);
  if (conflict) {
    return {
      ok: false,
      code: 'SHORTCUT_CONFLICT',
      message: 'Shortcut conflicts with another action',
      conflictWith: conflict.actionId,
    };
  }
  return {
    ok: true,
    shortcuts: { ...shortcuts, [actionId]: normalized },
  };
}

/** 将 accelerator 转为展示文案（Windows Ctrl / macOS ⌘）。 */
export function formatAcceleratorForDisplay(accelerator: string, platform: 'windows' | 'darwin' | 'other' = 'windows'): string {
  const normalized = normalizeAccelerator(accelerator);
  const symbol = platform === 'darwin' ? '⌘' : 'Ctrl';
  return normalized.replace(/^CmdOrCtrl\+/i, `${symbol}+`);
}
