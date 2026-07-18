import { useEffect } from 'react';
import { extractHttpUrlFromDropData } from './drop-url';

/**
 * 窗口级拖入 http(s) URL → 打开 New Bookmark 确认流。
 * REQ-024-AC-005
 */
export function useWindowUrlDrop(onUrl: (url: string) => void) {
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types;
      if (!types) return;
      if (types.includes('text/uri-list') || types.includes('text/plain')) {
        e.preventDefault();
      }
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const url = extractHttpUrlFromDropData({
        'text/uri-list': e.dataTransfer?.getData('text/uri-list') ?? '',
        'text/plain': e.dataTransfer?.getData('text/plain') ?? '',
      });
      if (url) onUrl(url);
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [onUrl]);
}
