import { useEffect } from 'react';
import type { ViewDensity } from '../../types';

export type GlobalShortcutHandlers = {
  onSpotlight: () => void;
  onNewBookmark: () => void;
  onInsights: () => void;
  onSettings: () => void;
  onDensity: (density: ViewDensity) => void;
  onToggleSidebar: () => void;
};

/**
 * 全局快捷键：N / I / , / 1–3 / \\ / K。
 * REQ-017-AC-001、REQ-024-AC-002~003
 */
export function useGlobalShortcuts(handlers: GlobalShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();

      if (key === 'k') {
        e.preventDefault();
        handlers.onSpotlight();
      } else if (key === 'n') {
        e.preventDefault();
        handlers.onNewBookmark();
      } else if (key === 'i') {
        e.preventDefault();
        handlers.onInsights();
      } else if (e.key === ',') {
        e.preventDefault();
        handlers.onSettings();
      } else if (key === '1') {
        e.preventDefault();
        handlers.onDensity('card');
      } else if (key === '2') {
        e.preventDefault();
        handlers.onDensity('list');
      } else if (key === '3') {
        e.preventDefault();
        handlers.onDensity('masonry');
      } else if (e.key === '\\') {
        e.preventDefault();
        handlers.onToggleSidebar();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
