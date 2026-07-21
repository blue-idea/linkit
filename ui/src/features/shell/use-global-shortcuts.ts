import { useEffect } from 'react';
import type { ViewDensity } from '../../types';
import type { ShortcutMap } from './shortcuts';
import { DEFAULT_SHORTCUTS } from './shortcuts';

export type GlobalShortcutHandlers = {
  onSpotlight: () => void;
  onNewBookmark: () => void;
  onInsights: () => void;
  onSettings: () => void;
  onDensity: (density: ViewDensity) => void;
  onToggleSidebar: () => void;
};

type UseGlobalShortcutsOptions = {
  shortcuts?: ShortcutMap;
  /** 桌面运行时由 Go 全局热键处理窗口显隐，前端跳过 toggleWindow。 */
  skipToggleWindow?: boolean;
};

function matchesAccelerator(event: KeyboardEvent, accelerator: string): boolean {
  const meta = event.metaKey || event.ctrlKey;
  if (!meta) return false;
  const parts = accelerator.split('+');
  if (parts.length !== 2) return false;
  const keyPart = parts[1];
  if (keyPart === ',') return event.key === ',';
  if (keyPart === '\\') return event.key === '\\';
  return event.key.toLowerCase() === keyPart.toLowerCase();
}

/**
 * 全局快捷键：按 AppSettings.shortcuts 生效；桌面态不绑定 toggleWindow。
 * REQ-017-AC-001、REQ-024-AC-002~003、REQ-030
 */
export function useGlobalShortcuts(
  handlers: GlobalShortcutHandlers,
  options: UseGlobalShortcutsOptions = {},
) {
  const shortcuts = options.shortcuts ?? DEFAULT_SHORTCUTS;
  const skipToggleWindow = options.skipToggleWindow ?? true;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      if (matchesAccelerator(e, shortcuts.spotlight)) {
        e.preventDefault();
        handlers.onSpotlight();
      } else if (matchesAccelerator(e, shortcuts.newBookmark)) {
        e.preventDefault();
        handlers.onNewBookmark();
      } else if (matchesAccelerator(e, shortcuts.insights)) {
        e.preventDefault();
        handlers.onInsights();
      } else if (matchesAccelerator(e, shortcuts.settings)) {
        e.preventDefault();
        handlers.onSettings();
      } else if (matchesAccelerator(e, shortcuts.viewCard)) {
        e.preventDefault();
        handlers.onDensity('card');
      } else if (matchesAccelerator(e, shortcuts.viewList)) {
        e.preventDefault();
        handlers.onDensity('list');
      } else if (matchesAccelerator(e, shortcuts.viewMasonry)) {
        e.preventDefault();
        handlers.onDensity('masonry');
      } else if (matchesAccelerator(e, shortcuts.toggleSidebar)) {
        e.preventDefault();
        handlers.onToggleSidebar();
      } else if (!skipToggleWindow && matchesAccelerator(e, shortcuts.toggleWindow)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers, shortcuts, skipToggleWindow]);
}
