import { useEffect, useMemo, useRef, useState } from 'react';
import type { Bookmark, Category, Collection, Tag } from '../types';
import { aiSemanticSearch, aiSmartReply } from '../ai';
import { searchBookmarks } from '../domain/search';
import { detectSpotlightHttpUrl, normalizeSpotlightUrl } from '../features/search';
import { Icon, Favicon, AIBadge, Kbd } from './ui';

type Mode = 'keyword' | 'semantic';

/**
 * Spotlight：关键词搜索、结果定位与 URL 快捷入库。
 * REQ-017-AC-001~004
 */
export function Spotlight({
  open,
  bookmarks,
  onSelect,
  onClose,
  onNewFromUrl,
}: {
  open: boolean;
  bookmarks: Bookmark[];
  tags: Tag[];
  categories: Category[];
  collections: Collection[];
  onSelect: (id: string) => void;
  onClose: () => void;
  onNewFromUrl: (url: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('keyword');
  const [active, setActive] = useState(0);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setMode('keyword');
    // 打开后立即聚焦搜索框（REQ-017-AC-001）。
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const keywordHits = useMemo(
    () => (mode === 'keyword' ? searchBookmarks(query, bookmarks, 8) : []),
    [mode, query, bookmarks]
  );

  const semantic = useMemo(
    () => (mode === 'semantic' && query.trim() ? aiSemanticSearch(query, bookmarks) : []),
    [mode, query, bookmarks]
  );

  const list = useMemo(() => {
    if (mode === 'semantic') {
      return semantic
        .map((r) => bookmarks.find((b) => b.id === r.bookmarkId))
        .filter((b): b is Bookmark => Boolean(b));
    }
    return keywordHits
      .map((hit) => bookmarks.find((b) => b.id === hit.id))
      .filter((b): b is Bookmark => Boolean(b));
  }, [mode, semantic, keywordHits, bookmarks]);

  const reply = mode === 'semantic' && query.trim() ? aiSmartReply(query) : '';
  const isUrl = detectSpotlightHttpUrl(query);

  const openNewBookmark = () => {
    const normalized = normalizeSpotlightUrl(query);
    if (!normalized.ok) return;
    // App 侧关闭 Spotlight 并打开 New Bookmark，避免重复 onClose。
    onNewFromUrl(normalized.url);
  };

  useEffect(() => {
    if (mode === 'semantic' && query.trim()) {
      setThinking(true);
      const t = setTimeout(() => setThinking(false), 700);
      return () => clearTimeout(t);
    }
  }, [mode, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(list.length - 1, 0)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isUrl) {
          const normalized = normalizeSpotlightUrl(query);
          if (normalized.ok) onNewFromUrl(normalized.url);
        } else if (list[active]) {
          onSelect(list[active].id);
          onClose();
        }
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setMode((m) => (m === 'keyword' ? 'semantic' : 'keyword'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, list, active, isUrl, query, onSelect, onClose, onNewFromUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-label="Spotlight"
        aria-modal="true"
        className="relative w-full max-w-[640px] rounded-mac-xl glass-strong ring-glow overflow-hidden animate-spotlight-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
          <Icon
            name={mode === 'semantic' ? 'Sparkles' : 'Search'}
            size={18}
            className={mode === 'semantic' ? 'text-violet2-400' : 'text-ink-400'}
          />
          <input
            ref={inputRef}
            aria-label="Spotlight search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={
              mode === 'semantic'
                ? 'Describe what you saved…'
                : 'Search title, domain, notes…'
            }
            className="flex-1 bg-transparent text-[16px] text-ink-100 placeholder:text-ink-500 outline-none"
          />
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-ink-800/70 hairline">
            <button
              type="button"
              onClick={() => setMode('keyword')}
              className={`text-[11px] px-2 py-1 rounded-md transition flex items-center gap-1 ${
                mode === 'keyword' ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              <Icon name="Search" size={11} /> Keyword
            </button>
            <button
              type="button"
              onClick={() => setMode('semantic')}
              className={`text-[11px] px-2 py-1 rounded-md transition flex items-center gap-1 ${
                mode === 'semantic'
                  ? 'bg-violet2-500/30 text-violet2-400'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              <Icon name="Sparkles" size={11} /> Semantic
            </button>
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto scroll-thin" role="listbox" aria-label="Spotlight results">
          {isUrl && (
            <button
              type="button"
              aria-label="New Bookmark"
              onClick={openNewBookmark}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-700/40 transition text-left border-b border-white/5"
            >
              <span className="w-9 h-9 rounded-lg bg-mint-500/15 flex items-center justify-center">
                <Icon name="Plus" size={16} className="text-mint-400" />
              </span>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-ink-100">New Bookmark</div>
                <div className="text-[11px] text-ink-400 truncate">{query.trim()}</div>
              </div>
              <span className="text-[10px] text-ink-500 flex items-center gap-1">
                <Kbd>↵</Kbd>
              </span>
            </button>
          )}

          {mode === 'semantic' && reply && (
            <div className="px-4 py-3 border-b border-white/5 bg-violet2-500/[0.06]">
              <div className="flex items-center gap-2 mb-1.5">
                <AIBadge label="AI answer" />
                {thinking && (
                  <span className="text-[10px] text-ink-400 animate-ai-pulse">Understanding…</span>
                )}
              </div>
              <p className="text-[13px] text-ink-200 leading-relaxed">{reply}</p>
            </div>
          )}

          {list.length > 0 ? (
            <div className="py-1.5">
              <div className="px-4 pb-1 pt-1 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                {mode === 'semantic' ? 'Semantic matches' : 'Matches'} · {list.length}
              </div>
              {list.map((b, i) => {
                const r = mode === 'semantic' ? semantic.find((x) => x.bookmarkId === b.id) : null;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    aria-label={b.title}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      onSelect(b.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                      i === active ? 'bg-accent-500/15' : 'hover:bg-ink-700/30'
                    }`}
                  >
                    <Favicon glyph={b.favicon} color={b.faviconColor} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-ink-100 truncate">{b.title}</div>
                      <div className="text-[11px] text-ink-400 truncate">
                        {b.domain}
                        {r && <span className="text-violet2-400"> · {r.reason}</span>}
                      </div>
                    </div>
                    {r && (
                      <span className="text-[10px] text-ink-400 tabular-nums shrink-0">
                        {(r.score * 100).toFixed(0)}%
                      </span>
                    )}
                    {b.starred && (
                      <Icon name="Star" size={12} className="text-amber-400 shrink-0" fill="currentColor" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            query.trim() &&
            !isUrl && (
              <div className="px-4 py-10 text-center" data-spotlight-empty>
                <div className="text-[13px] text-ink-300">No matching bookmarks</div>
                <div className="text-[11px] text-ink-500 mt-1">
                  {mode === 'semantic'
                    ? 'Try a more specific description, or switch to keyword mode'
                    : 'Try semantic mode with natural language'}
                </div>
              </div>
            )
          )}

          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-ink-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Kbd>⇥</Kbd> Mode
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> Open
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
