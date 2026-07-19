import { useEffect, useRef, useState } from 'react';
import type { Bookmark } from '../../types';
import { Button, Icon } from '../../components/ui';
import { scanBookmark, type HealthResult } from './index';
import { subscribeWailsEvent } from './wails-runtime';

interface DesktopHealthService {
  StartScan(request: { scanId: string; targets: Array<{ bookmarkId: string; url: string; previousFingerprint: string | null }> }): Promise<void>;
  CancelScan(scanId: string): Promise<void>;
}

function desktopHealthService(): DesktopHealthService | null {
  const candidate = (window as typeof window & { go?: { health?: { Service?: DesktopHealthService } } }).go?.health?.Service;
  return candidate ?? null;
}

export function HealthScanDialog({ open, bookmarks, onClose, onResult }: {
  open: boolean;
  bookmarks: Bookmark[];
  onClose: () => void;
  onResult: (result: HealthResult) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'completed' | 'cancelled'>('idle');
  const [completed, setCompleted] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const scanID = useRef<string | null>(null);
  const unsubscribe = useRef<Array<() => void>>([]);
  useEffect(() => () => {
    controller.current?.abort();
    unsubscribe.current.forEach((off) => off());
  }, []);
  if (!open) return null;

  const run = async () => {
    controller.current = new AbortController();
    setStatus('scanning');
    setCompleted(0);
    const e2e = new URLSearchParams(window.location.search).get('e2eHealth') === '1';
    const targets = e2e ? bookmarks.slice(0, 2) : bookmarks;
    const desktop = desktopHealthService();
    if (desktop && !e2e) {
      const id = crypto.randomUUID();
      scanID.current = id;
      await new Promise<void>((resolve, reject) => {
        unsubscribe.current = [
          subscribeWailsEvent('linkit:health-scan-progress', (event: { scanId: string; completed: number; result?: HealthResult }) => {
            if (event.scanId !== id) return;
            setCompleted(event.completed);
            if (event.result) onResult(event.result);
          }),
          subscribeWailsEvent('linkit:health-scan-finished', (event: { scanId: string; status: 'completed' | 'cancelled' | 'failed' }) => {
            if (event.scanId !== id) return;
            setStatus(event.status === 'failed' ? 'cancelled' : event.status);
            unsubscribe.current.forEach((off) => off());
            unsubscribe.current = [];
            resolve();
          }),
        ];
        desktop.StartScan({ scanId: id, targets: targets.map((bookmark) => ({
          bookmarkId: bookmark.id, url: bookmark.url, previousFingerprint: bookmark.healthFingerprint ?? null,
        })) }).catch(reject);
      });
      return;
    }
    for (const [index, bookmark] of targets.entries()) {
      if (controller.current.signal.aborted) break;
      const url = e2e ? `${window.location.origin}/e2e-health/${index === 0 ? 'changed' : 'broken'}` : bookmark.url;
      const source = e2e && index === 0 ? { ...bookmark, healthFingerprint: 'previous' } : bookmark;
      try {
        const result = await scanBookmark(source, controller.current.signal, url);
        onResult(result);
        setCompleted(index + 1);
      } catch {
        break;
      }
    }
    setStatus(controller.current.signal.aborted ? 'cancelled' : 'completed');
  };

  const changed = bookmarks.filter(({ health }) => health === 'changed').length;
  const broken = bookmarks.filter(({ health }) => health === 'broken').length;
  const ok = bookmarks.filter(({ health }) => health === 'ok').length;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Health check" className="w-full max-w-[520px] rounded-mac-xl glass-strong ring-glow p-5 space-y-4" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-ink-100">Link health</h2><p className="text-xs text-ink-400">Manual scan only · No background requests</p></div><Button variant="ghost" size="sm" onClick={onClose}>Close</Button></div>
      <div className="rounded-mac-lg bg-ink-800/50 hairline p-4 flex items-center justify-between">
        <div><div className="text-sm text-ink-100">{status === 'completed' ? 'Scan completed' : status === 'cancelled' ? 'Scan cancelled' : status === 'scanning' ? `Scanning ${completed}/${bookmarks.length}` : `${bookmarks.length} bookmarks ready`}</div><div className="text-xs text-ink-400">Results are saved as each request completes.</div></div>
        {status === 'scanning' ? <Button size="sm" onClick={() => {
          controller.current?.abort();
          const desktop = desktopHealthService();
          if (desktop && scanID.current) void desktop.CancelScan(scanID.current);
        }}>Cancel scan</Button> : <Button variant="primary" size="sm" icon="RefreshCw" onClick={run}>Start scan</Button>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[[ok, 'OK', 'text-mint-400'], [changed, 'Changed', 'text-amber-400'], [broken, 'Broken', 'text-coral-400']].map(([count, label, color]) => <div key={String(label)} className="rounded-mac bg-ink-800/50 p-3 text-center"><div className={`text-xl font-bold ${color}`}>{count}</div><div className="text-xs text-ink-400">{label}</div></div>)}
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-400"><Icon name="ShieldCheck" size={13} /> Requests send no cookies, AI keys, or session tokens.</div>
    </div>
  </div>;
}
