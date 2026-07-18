import { useState } from 'react';
import type { Bookmark, Category, Collection, Tag, ViewDensity } from '../types';
import type { Filters, Selection } from '../state';
import { Icon, TagPill, Segmented, Favicon, AIBadge, Button, AnimateIn } from './ui';
import { thumbnailGradients } from '../colors';
import { formatDate } from '../utils/format-date';

/* ---------- AI smart aggregation banner (Feature 2) ---------- */
function SmartAggregation({
  collection,
  bookmarks,
  onAccept,
  onDismiss,
}: {
  collection: Collection;
  bookmarks: Bookmark[];
  onAccept: (bookmarkIds: string[]) => void;
  onDismiss: () => void;
}) {
  // lightweight inline recommendation to avoid importing heavy logic into render loop
  const recommendations = useInlineRecommend(collection, bookmarks);
  const [added, setAdded] = useState<Set<string>>(new Set());

  if (recommendations.length === 0) return null;

  return (
    <AnimateIn className="mx-4 mb-3">
      <div className="rounded-mac-lg glass-light hairline p-3.5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-violet2-500/10 blur-2xl" />
        <div className="flex items-center gap-2 mb-2.5 relative">
          <span className="w-6 h-6 rounded-md bg-violet2-500/20 flex items-center justify-center">
            <Icon name="Sparkles" size={13} className="text-violet2-400" />
          </span>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-ink-100 flex items-center gap-2">
              AI 建议加入「{collection.emoji} {collection.name}」
              <AIBadge label="智能聚合" />
            </div>
            <div className="text-[11px] text-ink-400 mt-0.5">基于该主题已收录内容的标签与分类画像推荐</div>
          </div>
          <Button size="sm" variant="ghost" icon="X" onClick={onDismiss} />
        </div>
        <div className="flex flex-wrap gap-2 relative">
          {recommendations.map((r) => {
            const b = bookmarks.find((x) => x.id === r.bookmarkId)!;
            const isAdded = added.has(r.bookmarkId);
            return (
              <button
                key={r.bookmarkId}
                onClick={() => {
                  const next = new Set(added);
                  if (isAdded) next.delete(r.bookmarkId); else next.add(r.bookmarkId);
                  setAdded(next);
                }}
                className={`group flex items-center gap-2 rounded-lg pl-2 pr-3 py-1.5 transition-all hairline ${
                  isAdded ? 'bg-mint-500/15 ring-1 ring-mint-400/40' : 'bg-ink-800/60 hover:bg-ink-700/70'
                }`}
              >
                <Favicon glyph={b.favicon} color={b.faviconColor} size={22} />
                <div className="text-left">
                  <div className="text-[12px] font-medium text-ink-100 leading-tight max-w-[160px] truncate">{b.title}</div>
                  <div className="text-[10px] text-ink-400 leading-tight">{r.reason} · {(r.score * 100).toFixed(0)}%</div>
                </div>
                <Icon name={isAdded ? 'Check' : 'Plus'} size={13} className={isAdded ? 'text-mint-400' : 'text-ink-400'} />
              </button>
            );
          })}
        </div>
        {added.size > 0 && (
          <div className="mt-3 flex items-center justify-end gap-2 relative animate-slide-up">
            <span className="text-[11px] text-ink-400">已选 {added.size} 项</span>
            <Button size="sm" variant="primary" icon="Check" onClick={() => onAccept([...added])}>
              加入主题
            </Button>
          </div>
        )}
      </div>
    </AnimateIn>
  );
}

function useInlineRecommend(collection: Collection, bookmarks: Bookmark[]) {
  // simplified; real impl in ai.ts but kept local for the banner
  const memberIds = new Set(collection.bookmarkIds);
  const members = bookmarks.filter((b) => memberIds.has(b.id));
  const tagFreq: Record<string, number> = {};
  members.forEach((b) => b.tags.forEach((t) => (tagFreq[t] = (tagFreq[t] ?? 0) + 1)));
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  return bookmarks
    .filter((b) => !memberIds.has(b.id))
    .map((b) => {
      const overlap = b.tags.filter((t) => topTags.includes(t)).length;
      let score = 0.3 + overlap * 0.22 + (b.starred ? 0.08 : 0);
      const reasons: string[] = [];
      if (overlap) reasons.push(`标签重合 ${overlap}`);
      if (b.starred) reasons.push('你标星过');
      score = Math.min(score + ((b.id.length + collection.id.length) % 12) / 100, 0.97);
      return { bookmarkId: b.id, score, reason: reasons.join(' · ') || '主题相关' };
    })
    .filter((r) => r.score > 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/* ---------- Toolbar ---------- */
function Toolbar({
  title,
  subtitle,
  density,
  onDensity,
  onSearch,
  onOpenSpotlight,
  sort,
  onSort,
  readStatus,
  onReadStatus,
}: {
  title: string;
  subtitle: string;
  density: ViewDensity;
  onDensity: (d: ViewDensity) => void;
  onSearch: (q: string) => void;
  onOpenSpotlight: () => void;
  sort: string;
  onSort: (s: string) => void;
  readStatus: Filters['readStatus'];
  onReadStatus: (status: Filters['readStatus']) => void;
}) {
  return (
    <div className="px-5 pt-4 pb-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-[18px] font-semibold text-ink-100 leading-tight truncate">{title}</h1>
        <p className="text-[11px] text-ink-400 mt-0.5 truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon name="Search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={''}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={onOpenSpotlight}
            placeholder="搜索或语义查找…"
            className="w-44 rounded-lg bg-ink-800/70 hairline text-[12px] text-ink-100 placeholder:text-ink-400 pl-8 pr-2 py-1.5 focus-ring"
          />
        </div>
        <select
          aria-label="Filter by read status"
          value={readStatus}
          onChange={(e) => onReadStatus(e.target.value as Filters['readStatus'])}
          className="rounded-lg bg-ink-800/70 hairline text-[12px] text-ink-200 px-2 py-1.5 focus-ring"
        >
          <option value="all">All status</option>
          <option value="unread">Unread</option>
          <option value="reading">Reading</option>
          <option value="read">Read</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="rounded-lg bg-ink-800/70 hairline text-[12px] text-ink-200 px-2 py-1.5 focus-ring"
        >
          <option value="recent">最近访问</option>
          <option value="created">收藏时间</option>
          <option value="visits">访问次数</option>
          <option value="title">标题</option>
        </select>
        <Segmented<ViewDensity>
          value={density}
          onChange={onDensity}
          size="sm"
          options={[
            { value: 'card', icon: 'LayoutGrid' },
            { value: 'list', icon: 'List' },
            { value: 'masonry', icon: 'Columns3' },
          ]}
        />
      </div>
    </div>
  );
}

/* ---------- Filter chips bar ---------- */
function FilterBar({ filters, tags, onClearTag, onDateRange, onToggleStarred }: {
  filters: Filters;
  tags: Tag[];
  onClearTag: (id: string) => void;
  onDateRange: (r: Filters['dateRange']) => void;
  onToggleStarred: () => void;
}) {
  const dateOptions: { v: Filters['dateRange']; l: string }[] = [
    { v: 'all', l: '全部时间' },
    { v: '7d', l: '近 7 天' },
    { v: '30d', l: '近 30 天' },
    { v: '90d', l: '近 90 天' },
  ];
  const active = filters.tagIds.length > 0 || filters.onlyStarred || filters.dateRange !== 'all';
  if (!active) return null;
  return (
    <div className="px-5 py-2 flex items-center gap-2 flex-wrap border-b border-white/5 animate-slide-down">
      <span className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">筛选</span>
      {filters.onlyStarred && (
        <TagPill label="仅星标" color="amber" onRemove={onToggleStarred} />
      )}
      {filters.tagIds.map((id) => {
        const t = tags.find((x) => x.id === id);
        if (!t) return null;
        return <TagPill key={id} label={t.label} color={t.color} onRemove={() => onClearTag(id)} />;
      })}
      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-ink-800/70 hairline">
        {dateOptions.map((o) => (
          <button
            key={o.v}
            onClick={() => onDateRange(o.v)}
            className={`text-[11px] px-2 py-0.5 rounded-md transition ${
              filters.dateRange === o.v ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Bookmark Card (visual) ---------- */
function BookmarkCard({
  b,
  tags,
  selected,
  onClick,
  onDragStart,
  onDragEnd,
  onToggleStar,
}: {
  b: Bookmark;
  tags: Tag[];
  selected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleStar: () => void;
}) {
  const bTags = b.tags.map((id) => tags.find((t) => t.id === id)).filter(Boolean) as Tag[];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group rounded-mac-lg p-3 cursor-pointer transition-all duration-200 hairline ${
        selected
          ? 'bg-accent-500/15 ring-1 ring-accent-400/40 shadow-card'
          : 'bg-ink-800/50 hover:bg-ink-700/60 hover:shadow-card hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Favicon glyph={b.favicon} color={b.faviconColor} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[13px] font-semibold text-ink-100 leading-snug line-clamp-2 flex-1">{b.title}</div>
            {b.pinned && <Icon name="Pin" size={11} className="text-amber-400 shrink-0" />}
            {b.health === 'changed' && <Icon name="RefreshCw" size={11} className="text-amber-400 shrink-0" />}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5 truncate">{b.domain}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 ${
            b.starred ? 'text-amber-400' : 'text-ink-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'
          }`}
        >
          <Icon name="Star" size={13} fill={b.starred ? 'currentColor' : 'none'} />
        </button>
      </div>
      {b.aiSummary && (
        <p className="mt-2.5 text-[11px] text-ink-300 leading-relaxed line-clamp-2 flex gap-1.5">
          <AIBadge label="" />
          <span className="flex-1">{b.aiSummary}</span>
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {bTags.slice(0, 3).map((t) => (
            <TagPill key={t.id} label={t.label} color={t.color} size="xs" />
          ))}
          {bTags.length > 3 && <span className="text-[10px] text-ink-400 self-center">+{bTags.length - 3}</span>}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-ink-400 shrink-0">
          <Icon name="Clock" size={10} />
          {formatDate(b.createdAt)}
        </span>
      </div>
    </div>
  );
}

/* ---------- List row (info density) ---------- */
function BookmarkRow({
  b,
  tags,
  selected,
  onClick,
  onDragStart,
  onDragEnd,
  onToggleStar,
}: {
  b: Bookmark;
  tags: Tag[];
  selected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleStar: () => void;
}) {
  const bTags = b.tags.map((id) => tags.find((t) => t.id === id)).filter(Boolean) as Tag[];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
        selected ? 'bg-accent-500/15' : 'hover:bg-ink-700/40'
      }`}
    >
      <Favicon glyph={b.favicon} color={b.faviconColor} size={28} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-ink-100 truncate">{b.title}</span>
          {b.pinned && <Icon name="Pin" size={11} className="text-amber-400 shrink-0" />}
          {b.health === 'changed' && <Icon name="RefreshCw" size={11} className="text-amber-400 shrink-0" />}
        </div>
        <div className="text-[11px] text-ink-400 truncate flex items-center gap-2">
          <span>{b.domain}</span>
          {b.aiSummary && <span className="text-ink-500">· {b.aiSummary.slice(0, 48)}…</span>}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1">
        {bTags.slice(0, 2).map((t) => (
          <TagPill key={t.id} label={t.label} color={t.color} size="xs" />
        ))}
      </div>
      <div className="hidden md:flex items-center gap-1 text-[11px] text-ink-400">
        <Icon name="Clock" size={11} />
        <span className="tabular-nums">{formatDate(b.createdAt)}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
        className={`w-6 h-6 rounded-md flex items-center justify-center transition ${
          b.starred ? 'text-amber-400' : 'text-ink-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'
        }`}
      >
        <Icon name="Star" size={13} fill={b.starred ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

/* ---------- Masonry tile (compact visual) ---------- */
function MasonryTile({
  b,
  selected,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  b: Bookmark;
  selected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const grad = b.thumbnail ? thumbnailGradients[b.thumbnail] : thumbnailGradients.gray;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group rounded-mac-lg overflow-hidden cursor-pointer transition-all duration-200 hairline ${
        selected ? 'ring-1 ring-accent-400/40' : 'hover:shadow-card hover:-translate-y-0.5'
      }`}
    >
      <div className={`relative bg-gradient-to-br ${grad} aspect-[4/3]`}>
        <div className="absolute inset-0 p-3 flex flex-col">
          <Favicon glyph={b.favicon} color={b.faviconColor} size={24} />
          <div className="mt-auto">
            <div className="text-[12px] font-semibold text-white leading-tight line-clamp-2 drop-shadow">{b.title}</div>
            <div className="text-[10px] text-white/70 mt-0.5">{b.domain}</div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {b.starred && (
          <Icon name="Star" size={14} className="absolute top-2.5 right-2.5 text-amber-400 drop-shadow" fill="currentColor" />
        )}
      </div>
      <div className="px-2.5 py-2 bg-ink-800/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
          <Icon name="Clock" size={10} />
          <span className="tabular-nums">{formatDate(b.createdAt)}</span>
        </div>
        {b.aiSummary && <AIBadge label="" />}
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ onNew, onSpotlight }: { onNew: () => void; onSpotlight: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-ink-800/60 hairline flex items-center justify-center mb-4">
        <Icon name="Bookmark" size={28} className="text-ink-400" />
      </div>
      <div className="text-[15px] font-semibold text-ink-100">这里还没有收藏</div>
      <div className="text-[12px] text-ink-400 mt-1 max-w-xs">把网址拖入窗口，或用快捷键呼出搜索添加新收藏。</div>
      <div className="flex items-center gap-2 mt-5">
        <Button variant="primary" icon="Plus" onClick={onNew}>新增收藏</Button>
        <Button variant="subtle" icon="Search" onClick={onSpotlight}>全局搜索</Button>
      </div>
    </div>
  );
}

/* ---------- Main ContentArea ---------- */
export function ContentArea({
  bookmarks,
  allBookmarks,
  tags,
  categories,
  collections,
  selection,
  filters,
  density,
  selectedId,
  sort,
  onSort,
  onDensity,
  onSearch,
  onOpenSpotlight,
  onSelectBookmark,
  onToggleStar,
  onClearTagFilter,
  onDateRange,
  onToggleStarredFilter,
  onReadStatusFilter,
  onAcceptAICollection,
  onDismissAICollection,
  onNewBookmark,
  onDragStartBookmark,
}: {
  bookmarks: Bookmark[];
  allBookmarks: Bookmark[];
  tags: Tag[];
  categories: Category[];
  collections: Collection[];
  selection: Selection;
  filters: Filters;
  density: ViewDensity;
  selectedId: string | null;
  sort: string;
  onSort: (s: string) => void;
  onDensity: (d: ViewDensity) => void;
  onSearch: (q: string) => void;
  onOpenSpotlight: () => void;
  onSelectBookmark: (id: string) => void;
  onToggleStar: (id: string) => void;
  onClearTagFilter: (id: string) => void;
  onDateRange: (r: Filters['dateRange']) => void;
  onToggleStarredFilter: () => void;
  onReadStatusFilter: (status: Filters['readStatus']) => void;
  onAcceptAICollection: (ids: string[]) => void;
  onDismissAICollection: () => void;
  onNewBookmark: () => void;
  onDragStartBookmark: (id: string) => void;
}) {
  const [aiDismissed, setAiDismissed] = useState(false);
  const title = useSelectionTitle(selection, categories, collections);
  const subtitle = `${bookmarks.length} 个收藏 · ${bookmarks.filter((b) => b.starred).length} 星标`;
  const sorted = useSorted(bookmarks, sort);
  const showAI = selection.kind === 'collection' && !aiDismissed;

  return (
    <div className="h-full flex flex-col glass border-r border-white/5 min-w-0">
      <Toolbar
        title={title}
        subtitle={subtitle}
        density={density}
        onDensity={onDensity}
        onSearch={onSearch}
        onOpenSpotlight={onOpenSpotlight}
        sort={sort}
        onSort={onSort}
        readStatus={filters.readStatus}
        onReadStatus={onReadStatusFilter}
      />
      <FilterBar
        filters={filters}
        tags={tags}
        onClearTag={onClearTagFilter}
        onDateRange={onDateRange}
        onToggleStarred={onToggleStarredFilter}
      />

      {showAI && (
        <SmartAggregation
          collection={collections.find((c) => c.id === (selection.kind === 'collection' ? selection.id : ''))!}
          bookmarks={allBookmarks}
          onAccept={(ids) => { onAcceptAICollection(ids); setAiDismissed(true); }}
          onDismiss={() => { onDismissAICollection(); setAiDismissed(true); }}
        />
      )}

      {bookmarks.length === 0 ? (
        <EmptyState onNew={onNewBookmark} onSpotlight={onOpenSpotlight} />
      ) : (
        <div className="flex-1 overflow-y-auto scroll-thin px-4 pb-6 pt-2">
          {density === 'card' && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {sorted.map((b, i) => (
                <AnimateIn key={b.id} delay={Math.min(i * 28, 280)}>
                  <BookmarkCard
                    b={b}
                    tags={tags}
                    selected={selectedId === b.id}
                    onClick={() => onSelectBookmark(b.id)}
                    onDragStart={(e) => { e.dataTransfer.setData('text/bookmark', b.id); e.dataTransfer.effectAllowed = 'move'; onDragStartBookmark(b.id); }}
                    onDragEnd={() => {}}
                    onToggleStar={() => onToggleStar(b.id)}
                  />
                </AnimateIn>
              ))}
            </div>
          )}

          {density === 'list' && (
            <div className="rounded-mac-lg bg-ink-850/40 hairline divide-y divide-white/5 overflow-hidden">
              {sorted.map((b, i) => (
                <AnimateIn key={b.id} delay={Math.min(i * 18, 200)}>
                  <BookmarkRow
                    b={b}
                    tags={tags}
                    selected={selectedId === b.id}
                    onClick={() => onSelectBookmark(b.id)}
                    onDragStart={(e) => { e.dataTransfer.setData('text/bookmark', b.id); e.dataTransfer.effectAllowed = 'move'; onDragStartBookmark(b.id); }}
                    onDragEnd={() => {}}
                    onToggleStar={() => onToggleStar(b.id)}
                  />
                </AnimateIn>
              ))}
            </div>
          )}

          {density === 'masonry' && (
            <div className="columns-2 sm:columns-3 xl:columns-4 2xl:columns-5 gap-3 [column-fill:_balance]">
              {sorted.map((b, i) => (
                <div key={b.id} className="mb-3 break-inside-avoid animate-slide-up" style={{ animationDelay: `${Math.min(i * 24, 240)}ms` }}>
                  <MasonryTile
                    b={b}
                    selected={selectedId === b.id}
                    onClick={() => onSelectBookmark(b.id)}
                    onDragStart={(e) => { e.dataTransfer.setData('text/bookmark', b.id); e.dataTransfer.effectAllowed = 'move'; onDragStartBookmark(b.id); }}
                    onDragEnd={() => {}}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- hooks ---------- */
import { useMemo } from 'react';
function useSelectionTitle(selection: Selection, categories: Category[], collections: Collection[]) {
  return useMemo(() => {
    switch (selection.kind) {
      case 'all': return '全部收藏';
      case 'starred': return '星标收藏';
      case 'recent': return '最近添加';
      case 'category': return categories.find((c) => c.id === selection.id)?.name ?? '分类';
      case 'collection': return collections.find((c) => c.id === selection.id)?.name ?? '主题';
      case 'tag': return '标签筛选';
      case 'health': return selection.status === 'changed' ? '内容已更新' : '失效链接';
    }
  }, [selection, categories, collections]);
}

function useSorted(bookmarks: Bookmark[], sort: string) {
  return useMemo(() => {
    const arr = [...bookmarks];
    switch (sort) {
      case 'created': return arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      case 'visits': return arr.sort((a, b) => b.visitCount - a.visitCount);
      case 'title': return arr.sort((a, b) => a.title.localeCompare(b.title));
      default: return arr.sort((a, b) => +new Date(b.lastVisitedAt ?? b.createdAt) - +new Date(a.lastVisitedAt ?? a.createdAt));
    }
  }, [bookmarks, sort]);
}
