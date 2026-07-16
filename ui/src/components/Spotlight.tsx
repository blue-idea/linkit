import { useEffect, useMemo, useRef, useState } from 'react';
import type { Bookmark, Category, Collection, Tag } from '../types';
import { aiSemanticSearch, aiSmartReply } from '../ai';
import { Icon, Favicon, AIBadge, Kbd } from './ui';

type Mode = 'keyword' | 'semantic';

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
    if (open) {
      setQuery('');
      setActive(0);
      setMode('keyword');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const semantic = useMemo(() => (mode === 'semantic' && query.trim() ? aiSemanticSearch(query, bookmarks) : []), [mode, query, bookmarks]);
  const keyword = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return bookmarks
      .filter((b) => (b.title + b.description + b.domain + b.notes).toLowerCase().includes(q))
      .map((b) => ({ id: b.id, score: 1 }))
      .slice(0, 8);
  }, [query, bookmarks]);

  const list = mode === 'semantic'
    ? semantic.map((r) => bookmarks.find((b) => b.id === r.bookmarkId)!).filter(Boolean)
    : keyword.map((r) => bookmarks.find((b) => b.id === r.id)!).filter(Boolean);

  const reply = mode === 'semantic' && query.trim() ? aiSmartReply(query) : '';

  const isUrl = /^https?:\/\//i.test(query.trim()) || /^[\w-]+\.[\w-]+/.test(query.trim());

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
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(list.length - 1, 0))); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isUrl) { onNewFromUrl(query.trim()); onClose(); }
        else if (list[active]) { onSelect(list[active].id); onClose(); }
      }
      if (e.key === 'Tab') { e.preventDefault(); setMode((m) => (m === 'keyword' ? 'semantic' : 'keyword')); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, list, active, isUrl, query, onSelect, onClose, onNewFromUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-[640px] rounded-mac-xl glass-strong ring-glow overflow-hidden animate-spotlight-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
          <Icon name={mode === 'semantic' ? 'Sparkles' : 'Search'} size={18} className={mode === 'semantic' ? 'text-violet2-400' : 'text-ink-400'} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder={mode === 'semantic' ? '用自然语言描述你要找的收藏，例如「我之前收藏的配色工具」…' : '搜索标题、网址、备注或标签…'}
            className="flex-1 bg-transparent text-[16px] text-ink-100 placeholder:text-ink-500 outline-none"
          />
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-ink-800/70 hairline">
            <button
              onClick={() => setMode('keyword')}
              className={`text-[11px] px-2 py-1 rounded-md transition flex items-center gap-1 ${mode === 'keyword' ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}
            >
              <Icon name="Search" size={11} /> 关键词
            </button>
            <button
              onClick={() => setMode('semantic')}
              className={`text-[11px] px-2 py-1 rounded-md transition flex items-center gap-1 ${mode === 'semantic' ? 'bg-violet2-500/30 text-violet2-400' : 'text-ink-400 hover:text-ink-200'}`}
            >
              <Icon name="Sparkles" size={11} /> 语义
            </button>
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto scroll-thin">
          {isUrl && (
            <button
              onClick={() => { onNewFromUrl(query.trim()); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-700/40 transition text-left border-b border-white/5"
            >
              <span className="w-9 h-9 rounded-lg bg-mint-500/15 flex items-center justify-center">
                <Icon name="Plus" size={16} className="text-mint-400" />
              </span>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-ink-100">将此网址收藏入库</div>
                <div className="text-[11px] text-ink-400">{query.trim()} · AI 将自动生成摘要与标签</div>
              </div>
              <span className="text-[10px] text-ink-500 flex items-center gap-1"><Kbd>↵</Kbd></span>
            </button>
          )}

          {mode === 'semantic' && reply && (
            <div className="px-4 py-3 border-b border-white/5 bg-violet2-500/[0.06]">
              <div className="flex items-center gap-2 mb-1.5">
                <AIBadge label="AI 回答" />
                {thinking && <span className="text-[10px] text-ink-400 animate-ai-pulse">正在理解你的描述…</span>}
              </div>
              <p className="text-[13px] text-ink-200 leading-relaxed">{reply}</p>
            </div>
          )}

          {list.length > 0 ? (
            <div className="py-1.5">
              <div className="px-4 pb-1 pt-1 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                {mode === 'semantic' ? '语义匹配结果' : '匹配结果'} · {list.length}
              </div>
              {list.map((b, i) => {
                const r = mode === 'semantic' ? semantic.find((x) => x.bookmarkId === b.id) : null;
                return (
                  <button
                    key={b.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { onSelect(b.id); onClose(); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${i === active ? 'bg-accent-500/15' : 'hover:bg-ink-700/30'}`}
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
                      <span className="text-[10px] text-ink-400 tabular-nums shrink-0">{(r.score * 100).toFixed(0)}%</span>
                    )}
                    {b.starred && <Icon name="Star" size={12} className="text-amber-400 shrink-0" fill="currentColor" />}
                  </button>
                );
              })}
            </div>
          ) : (
            query.trim() && !isUrl && (
              <div className="px-4 py-10 text-center">
                <div className="text-[13px] text-ink-300">未找到匹配的收藏</div>
                <div className="text-[11px] text-ink-500 mt-1">
                  {mode === 'semantic' ? '试试更具体的描述，或切换为关键词模式' : '试试语义模式，用自然语言描述'}
                </div>
              </div>
            )
          )}

          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-ink-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Kbd>⇥</Kbd> 切换模式</span>
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> 选择</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> 打开</span>
            </div>
            <span className="flex items-center gap-1"><Kbd>esc</Kbd> 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
}
