import { useEffect } from 'react';
import { resolveTopOverlay, type OverlayKind } from './overlay-stack';

/**
 * Esc 以捕获阶段关闭最上层浮层，阻止子层重复关闭。
 * REQ-024-AC-004
 */
export function useEscapeOverlayStack(
  open: Partial<Record<OverlayKind, boolean>>,
  close: (kind: OverlayKind) => void
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const top = resolveTopOverlay(open);
      if (!top) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close(top);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);
}
