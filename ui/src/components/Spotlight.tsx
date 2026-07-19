import { useEffect, useMemo, useRef, useState } from 'react';
import type { Bookmark, Category, Collection, Tag } from '../types';
import type { AIContext } from '../features/ai';
import { searchBookmarks } from '../domain/search';
import {
  detectSpotlightHttpUrl,
  normalizeSpotlightUrl,
  runSemanticSearch,
  wailsSemanticClient,
  type SemanticHit,
} from '../features/search';
import { Icon, Favicon, AIBadge, Kbd } from './ui';

type Mode = 'keyword' | 'semantic';

/**
 * Spotlight：关键词 / 真实语义搜索、结果定位与 URL 快捷入库。
 * REQ-017、REQ-018
 */
export function Spotlight({
  open,
  bookmarks,
  tags,
  aiContext,
  onSelect,
  onOpenDirectly,
  onClose,
  onNewFromUrl,
}: {
  open: boolean;
  bookmarks: Bookmark[];
  tags: Tag[];
  categories: Category[];
  collections: Collection[];
  aiContext: AIContext | null;
  onSelect: (id: string) => void;
  onOpenDirectly: (id: string) => void;
  onClose: () => void;
  onNewFromUrl: (url: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('keyword');
  const [active, setActive] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [semanticHits, setSemanticHits] = useState<SemanticHit[]>([]);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [semanticEmpty, setSemanticEmpty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setMode('keyword');
    setSemanticHits([]);
    setFallbackMessage(null);
    setSemanticEmpty(false);
    setThinking(false);
    // 打开后立即聚焦搜索框（REQ-017-AC-001）。
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const tagLabelsById = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag.label])),
    [tags]
  );

  const keywordHits = useMemo(
    () => (mode === 'keyword' ? searchBookmarks(query, bookmarks, 8) : []),
    [mode, query, bookmarks]
  );

  useEffect(() => {
    if (mode !== 'semantic' || !query.trim()) {
      setSemanticHits([]);
      setFallbackMessage(null);
      setSemanticEmpty(false);
      setThinking(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setThinking(true);
    const context: AIContext = aiContext ?? {
      apiBase: 'https://api.example.test/v1',
      model: 'unavailable',
      locale: 'en',
    };

    const timer = window.setTimeout(() => {
      void runSemanticSearch({
        query,
        bookmarks,
        tagLabelsById,
        context,
        client: wailsSemanticClient,
        keywordLimit: 8,
      }).then((outcome) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setSemanticHits(outcome.results);
        setFallbackMessage(outcome.fallbackMessage);
        setSemanticEmpty(outcome.empty);
        setThinking(false);
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mode, query, bookmarks, tagLabelsById, aiContext]);

  const list = useMemo(() => {
    if (mode === 'semantic') {
      return semanticHits
        .map((hit) => bookmarks.find((bookmark) => bookmark.id === hit.bookmarkId))
        .filter((bookmark): bookmark is Bookmark => Boolean(bookmark));
    }
    return keywordHits
      .map((hit) => bookmarks.find((bookmark) => bookmark.id === hit.id))
      .filter((bookmark): bookmark is Bookmark => Boolean(bookmark));
  }, [mode, semanticHits, keywordHits, bookmarks]);

  const isUrl = detectSpotlightHttpUrl(query);

  const openNewBookmark = () => {
    const normalized = normalizeSpotlightUrl(query);
    if (!normalized.ok) return;
    onNewFromUrl(normalized.url);
  };

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
          // REQ-017-AC-005：键盘确认走直达访问，区别于点击结果定位详情。
          onOpenDirectly(list[active].id);
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
  }, [open, list, active, isUrl, query, onOpenDirectly, onClose, onNewFromUrl]);

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

          {mode === 'semantic' && fallbackMessage && (
            <div
              role="alert"
              className="px-4 py-3 border-b border-white/5 bg-amber-500/10 text-[12px] text-amber-200"
            >
              {fallbackMessage}
            </div>
          )}

          {mode === 'semantic' && thinking && (
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2" role="status">
              <AIBadge label="Semantic" />
              <span className="text-[10px] text-ink-400 animate-ai-pulse">Reranking library candidates…</span>
            </div>
          )}

          {list.length > 0 ? (
            <div className="py-1.5">
              <div className="px-4 pb-1 pt-1 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                {mode === 'semantic'
                  ? fallbackMessage
                    ? 'Keyword fallback'
                    : 'Semantic matches'
                  : 'Matches'}{' '}
                · {list.length}
              </div>
              {list.map((b, i) => {
                const r =
                  mode === 'semantic'
                    ? semanticHits.find((hit) => hit.bookmarkId === b.id)
                    : null;
                const showScore = Boolean(r && r.reason !== 'keyword');
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
                        {showScore && r?.reason ? (
                          <span className="text-violet2-400"> · {r.reason}</span>
                        ) : null}
                      </div>
                    </div>
                    {showScore && r ? (
                      <span className="text-[10px] text-ink-400 tabular-nums shrink-0">
                        {(r.score * 100).toFixed(0)}%
                      </span>
                    ) : null}
                    {b.starred && (
                      <Icon name="Star" size={12} className="text-amber-400 shrink-0" fill="currentColor" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            query.trim() &&
            !isUrl &&
            !thinking && (
              <div className="px-4 py-10 text-center" data-spotlight-empty role="status">
                <div className="text-[13px] text-ink-300">
                  {mode === 'semantic' && semanticEmpty
                    ? 'No matching bookmarks in your library'
                    : 'No matching bookmarks'}
                </div>
                <div className="text-[11px] text-ink-500 mt-1">
                  {mode === 'semantic'
                    ? 'No external recommendations — try keyword mode or another query'
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
