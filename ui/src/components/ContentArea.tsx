import { useMemo, useRef, useState } from 'react';
import type { Bookmark, Category, Collection, Tag, UiLocale, ViewDensity } from '../types';
import type { Filters, Selection } from '../state';
import { sortBookmarks, type SortKey } from '../domain/query';
import { Icon, TagPill, Segmented, Favicon, AIBadge, Button, AnimateIn } from './ui';
import {
  CardView,
  ListView,
  MasonryView,
  TimelineView,
  TagAggregationView,
  ThemeSpaceView,
  presentBookmarks,
} from '../features/views';
import { selectBookmarkRange } from '../features/bookmarks';
import { useI18n } from '../i18n/use-i18n';

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
  const i18n = useI18n();
  // lightweight inline recommendation to avoid importing heavy logic into render loop
  const recommendations = useInlineRecommend(collection, bookmarks, i18n);
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
              {i18n.t('content.aiSuggestion', { name: `${collection.emoji} ${collection.name}` })}
              <AIBadge label={i18n.t('content.aiSuggestionLabel')} />
            </div>
            <div className="text-[11px] text-ink-400 mt-0.5">{i18n.t('content.aiSuggestionHint')}</div>
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
            <span className="text-[11px] text-ink-400">{i18n.t('common.itemsSelected', { count: added.size })}</span>
            <Button size="sm" variant="primary" icon="Check" onClick={() => onAccept([...added])}>
              {i18n.t('content.addSelectedToCollection')}
            </Button>
          </div>
        )}
      </div>
    </AnimateIn>
  );
}

function useInlineRecommend(collection: Collection, bookmarks: Bookmark[], i18n: ReturnType<typeof useI18n>) {
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
      if (overlap) reasons.push(i18n.t('content.recommend.tagOverlap', { count: overlap }));
      if (b.starred) reasons.push(i18n.t('content.recommend.starred'));
      score = Math.min(score + ((b.id.length + collection.id.length) % 12) / 100, 0.97);
      return { bookmarkId: b.id, score, reason: reasons.join(' · ') || i18n.t('content.recommend.related') };
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
  query,
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
  query: string;
  onOpenSpotlight: () => void;
  sort: string;
  onSort: (s: string) => void;
  readStatus: Filters['readStatus'];
  onReadStatus: (status: Filters['readStatus']) => void;
}) {
  const i18n = useI18n();
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
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={onOpenSpotlight}
            placeholder={i18n.t('content.searchPlaceholder')}
            className="w-44 rounded-lg bg-ink-800/70 hairline text-[12px] text-ink-100 placeholder:text-ink-400 pl-8 pr-2 py-1.5 focus-ring"
          />
        </div>
        <select
          aria-label={i18n.t('content.filterReadStatus')}
          value={readStatus}
          onChange={(e) => onReadStatus(e.target.value as Filters['readStatus'])}
          className="rounded-lg bg-ink-800/70 hairline text-[12px] text-ink-200 px-2 py-1.5 focus-ring"
        >
          <option value="all">{i18n.t('content.allStatuses')}</option>
          <option value="unread">{i18n.t('status.unread')}</option>
          <option value="reading">{i18n.t('status.reading')}</option>
          <option value="read">{i18n.t('status.read')}</option>
          <option value="archived">{i18n.t('status.archived')}</option>
        </select>
        <select
          aria-label={i18n.t('content.sort')}
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="rounded-lg bg-ink-800/70 hairline text-[12px] text-ink-200 px-2 py-1.5 focus-ring"
        >
          <option value="recent">{i18n.t('content.sort.recent')}</option>
          <option value="created">{i18n.t('content.sort.created')}</option>
          <option value="visits">{i18n.t('content.sort.visits')}</option>
          <option value="title">{i18n.t('content.sort.title')}</option>
        </select>
        <Segmented<ViewDensity>
          value={density}
          onChange={onDensity}
          size="sm"
          aria-label={i18n.t('content.viewDensity')}
          options={[
            { value: 'card', icon: 'LayoutGrid', ariaLabel: i18n.t('content.view.card') },
            { value: 'list', icon: 'List', ariaLabel: i18n.t('content.view.list') },
            { value: 'masonry', icon: 'Columns3', ariaLabel: i18n.t('content.view.masonry') },
            { value: 'timeline', icon: 'Clock', ariaLabel: i18n.t('content.view.timeline') },
            { value: 'tag-aggregation', icon: 'Tags', ariaLabel: i18n.t('content.view.tags') },
            { value: 'theme-space', icon: 'Boxes', ariaLabel: i18n.t('content.view.themes') },
          ]}
        />
      </div>
    </div>
  );
}

/* ---------- Filter chips bar ---------- */
function FilterBar({ filters, tags, onClearTag, onDateRange, onToggleStarred, onClearFilters }: {
  filters: Filters;
  tags: Tag[];
  onClearTag: (id: string) => void;
  onDateRange: (r: Filters['dateRange']) => void;
  onToggleStarred: () => void;
  onClearFilters: () => void;
}) {
  const i18n = useI18n();
  const dateOptions: { v: Filters['dateRange']; l: string }[] = [
    { v: 'all', l: i18n.t('content.date.all') },
    { v: '7d', l: i18n.t('content.date.7d') },
    { v: '30d', l: i18n.t('content.date.30d') },
    { v: '90d', l: i18n.t('content.date.90d') },
  ];
  const active =
    filters.tagIds.length > 0 ||
    filters.onlyStarred ||
    filters.dateRange !== 'all' ||
    filters.readStatus !== 'all';
  if (!active) return null;
  return (
    <div className="px-5 py-2 flex items-center gap-2 flex-wrap border-b border-white/5 animate-slide-down">
      <span className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">{i18n.t('content.filters')}</span>
      {filters.onlyStarred && (
        <TagPill label={i18n.t('content.onlyStarred')} color="amber" onRemove={onToggleStarred} />
      )}
      {filters.readStatus !== 'all' && (
        <TagPill label={i18n.t('content.statusFilter', { status: i18n.t(`status.${filters.readStatus}`) })} color="violet" onRemove={onClearFilters} />
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
      <button
        type="button"
        aria-label={i18n.t('content.clearFilters')}
        onClick={onClearFilters}
        className="text-[11px] text-ink-400 hover:text-ink-100 px-2 py-0.5 rounded-md hover:bg-ink-700/60 transition"
      >
        {i18n.t('content.clearFilters')}
      </button>
    </div>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({
  onNew,
  onSpotlight,
  onAddBookmarks,
}: {
  onNew: () => void;
  onSpotlight: () => void;
  onAddBookmarks?: () => void;
}) {
  const i18n = useI18n();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-ink-800/60 hairline flex items-center justify-center mb-4">
        <Icon name="Bookmark" size={28} className="text-ink-400" />
      </div>
      <div className="text-[15px] font-semibold text-ink-100">
        {onAddBookmarks ? i18n.t('content.empty.collectionTitle') : i18n.t('content.empty.libraryTitle')}
      </div>
      <div className="text-[12px] text-ink-400 mt-1 max-w-xs">
        {onAddBookmarks
          ? i18n.t('content.empty.collectionBody')
          : i18n.t('content.empty.libraryBody')}
      </div>
      <div className="flex items-center gap-2 mt-5">
        {onAddBookmarks ? (
          <>
            <Button variant="primary" icon="Library" aria-label={i18n.t('content.addBookmarks')} onClick={onAddBookmarks}>
              {i18n.t('content.addBookmarks')}
            </Button>
            <Button variant="subtle" icon="Plus" onClick={onNew}>
              {/** 次要入口：不自动归属当前主题 */}
              {i18n.t('content.newBookmark')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" icon="Plus" onClick={onNew}>{i18n.t('content.addBookmark')}</Button>
            <Button variant="subtle" icon="Search" onClick={onSpotlight}>{i18n.t('content.globalSearch')}</Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Main ContentArea ---------- */
export function ContentArea({
  locale = 'en',
  bookmarks,
  allBookmarks,
  tags,
  categories,
  collections,
  selection,
  filters,
  density,
  selectedId,
  composeSelectedIds,
  sort,
  onSort,
  onDensity,
  onSearch,
  onOpenSpotlight,
  onSelectBookmark,
  onToggleComposeSelect,
  onRequestCompose,
  onToggleStar,
  onClearTagFilter,
  onDateRange,
  onToggleStarredFilter,
  onReadStatusFilter,
  onClearFilters,
  onAcceptAICollection,
  onDismissAICollection,
  onNewBookmark,
  onDragStartBookmark,
  onOpenAICollection,
  onOpenDuplicates,
  onOpenExplore,
  onVisitBookmark,
  onEditBookmark,
  onMoveBookmarks,
  onDeleteBookmarks,
  onToggleBookmarkSelection,
  onClearBookmarkSelection,
  onOpenAddBookmarks,
  onRemoveFromCollection,
  onRequestBulkRemoveFromCollection,
}: {
  locale?: UiLocale;
  bookmarks: Bookmark[];
  allBookmarks: Bookmark[];
  tags: Tag[];
  categories: Category[];
  collections: Collection[];
  selection: Selection;
  filters: Filters;
  density: ViewDensity;
  selectedId: string | null;
  composeSelectedIds: string[];
  sort: string;
  onSort: (s: string) => void;
  onDensity: (d: ViewDensity) => void;
  onSearch: (q: string) => void;
  onOpenSpotlight: () => void;
  onSelectBookmark: (id: string) => void;
  onToggleComposeSelect: (id: string, additive: boolean) => void;
  onRequestCompose: () => void;
  onToggleStar: (id: string) => void;
  onClearTagFilter: (id: string) => void;
  onDateRange: (r: Filters['dateRange']) => void;
  onToggleStarredFilter: () => void;
  onReadStatusFilter: (status: Filters['readStatus']) => void;
  onClearFilters: () => void;
  onAcceptAICollection: (ids: string[]) => void;
  onDismissAICollection: () => void;
  onNewBookmark: () => void;
  onDragStartBookmark: (id: string) => void;
  onOpenAICollection: () => void;
  onOpenDuplicates: () => void;
  onOpenExplore: () => void;
  onVisitBookmark: (id: string) => void;
  onEditBookmark: (id: string) => void;
  onMoveBookmarks: (ids: string[]) => void;
  onDeleteBookmarks: (ids: string[]) => void;
  onToggleBookmarkSelection: (id: string, selected: boolean) => void;
  onClearBookmarkSelection: () => void;
  onOpenAddBookmarks?: () => void;
  onRemoveFromCollection?: (id: string) => void;
  onRequestBulkRemoveFromCollection?: () => void;
}) {
  const i18n = useI18n(locale);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const title = useSelectionTitle(selection, categories, collections, i18n);
  const subtitle = i18n.t('content.subtitle', {
    count: bookmarks.length,
    starred: bookmarks.filter((b) => b.starred).length,
  });
  // REQ-009-AC-001/002：排序与 pinned 分组由领域引擎负责。
  const sorted = useMemo(
    () => sortBookmarks(bookmarks, sort as SortKey),
    [bookmarks, sort]
  );
  // REQ-015：三视图共享 Presenter 元数据投影。
  const presented = useMemo(() => presentBookmarks(sorted, tags), [sorted, tags]);
  // Theme Space 以全库主题成员为容器数据源。
  const presentedAll = useMemo(() => presentBookmarks(allBookmarks, tags), [allBookmarks, tags]);
  const showAI = selection.kind === 'collection' && !aiDismissed;
  const isCollectionView = selection.kind === 'collection';
  const composeSet = useMemo(() => new Set(composeSelectedIds), [composeSelectedIds]);
  const selectionAnchorRef = useRef<string | null>(null);
  const bookmarkItemActions = {
    selectionMode,
    isBulkSelected: (id: string) => composeSet.has(id),
    onToggleSelect: onToggleBookmarkSelection,
    onVisit: onVisitBookmark,
    onEdit: onEditBookmark,
    onMove: (id: string) => onMoveBookmarks([id]),
    onDelete: (id: string) => onDeleteBookmarks([id]),
    onRemoveFromCollection: isCollectionView ? onRemoveFromCollection : undefined,
  };

  const startDrag = (e: React.DragEvent, bookmarkId: string) => {
    // REQ-013-AC-001：若拖拽项属于多选集合，载荷携带全部所选 ID。
    const payload =
      composeSet.has(bookmarkId) && composeSelectedIds.length >= 2
        ? JSON.stringify(composeSelectedIds)
        : bookmarkId;
    e.dataTransfer.setData('text/bookmark', payload);
    e.dataTransfer.effectAllowed = 'move';
    onDragStartBookmark(bookmarkId);
  };

  const handleCardClick = (e: React.MouseEvent, bookmarkId: string) => {
    if (!selectionMode) {
      onSelectBookmark(bookmarkId);
      return;
    }
    if (e.shiftKey && selectionAnchorRef.current) {
      const range = selectBookmarkRange(sorted.map(({ id }) => id), selectionAnchorRef.current, bookmarkId);
      onClearBookmarkSelection();
      range.forEach((id) => onToggleBookmarkSelection(id, true));
      onSelectBookmark(bookmarkId);
      return;
    }
    const additive = e.metaKey || e.ctrlKey;
    if (additive) {
      onToggleComposeSelect(bookmarkId, true);
      selectionAnchorRef.current = bookmarkId;
      return;
    }
    onToggleComposeSelect(bookmarkId, false);
    onSelectBookmark(bookmarkId);
    selectionAnchorRef.current = bookmarkId;
  };

  return (
    <div className="h-full flex flex-col glass border-r border-white/5 min-w-0">
      <Toolbar
        title={title}
        subtitle={subtitle}
        density={density}
        onDensity={onDensity}
        onSearch={onSearch}
        query={filters.query}
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
        onClearFilters={onClearFilters}
      />
      <div className="mx-4 mb-2 flex justify-end gap-2">
        <Button
          size="sm"
          variant="primary"
          icon="Plus"
          aria-label={i18n.t('content.newBookmark')}
          onClick={onNewBookmark}
        >
          {i18n.t('content.newBookmark')}
        </Button>
        {isCollectionView && onOpenAddBookmarks && (
          <Button
            size="sm"
            variant="ghost"
            icon="Library"
            aria-label={i18n.t('content.addBookmarks')}
            onClick={onOpenAddBookmarks}
          >
            {i18n.t('content.addBookmarks')}
          </Button>
        )}
        <Button
          size="sm"
          variant={selectionMode ? 'primary' : 'ghost'}
          icon={selectionMode ? 'Check' : 'ListChecks'}
          aria-label={selectionMode ? i18n.t('content.doneSelecting') : i18n.t('content.selectBookmarks')}
          onClick={() => {
            if (selectionMode) onClearBookmarkSelection();
            setSelectionMode((current) => !current);
          }}
        >
          {selectionMode ? i18n.t('common.done') : i18n.t('common.select')}
        </Button>
        <Button size="sm" variant="ghost" icon="Sparkles" onClick={onOpenAICollection}>{i18n.t('content.aiCollection')}</Button>
        <Button size="sm" variant="ghost" icon="Copy" onClick={onOpenDuplicates}>{i18n.t('content.findDuplicates')}</Button>
        <Button size="sm" variant="ghost" icon="Compass" onClick={onOpenExplore}>{i18n.t('content.explore')}</Button>
      </div>

      {showAI && (
        <SmartAggregation
          collection={collections.find((c) => c.id === (selection.kind === 'collection' ? selection.id : ''))!}
          bookmarks={allBookmarks}
          onAccept={(ids) => { onAcceptAICollection(ids); setAiDismissed(true); }}
          onDismiss={() => { onDismissAICollection(); setAiDismissed(true); }}
        />
      )}

      {composeSelectedIds.length > 0 && (
        <div role="toolbar" aria-label={i18n.t('content.bulkActions')} className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-lg bg-accent-500/10 hairline px-3 py-2">
          <span className="text-[12px] text-ink-200">
            {i18n.t('content.bookmarksSelected', { count: composeSelectedIds.length })}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onMoveBookmarks(composeSelectedIds)}>{i18n.t('common.move')}</Button>
            <Button size="sm" variant="danger" onClick={() => onDeleteBookmarks(composeSelectedIds)}>{i18n.t('common.delete')}</Button>
            {isCollectionView && onRequestBulkRemoveFromCollection && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={i18n.t('content.removeFromCollection')}
                onClick={onRequestBulkRemoveFromCollection}
              >
                {i18n.t('content.removeFromCollection')}
              </Button>
            )}
            {composeSelectedIds.length >= 2 && <Button size="sm" variant="primary" aria-label={i18n.t('content.createFromSelection')} onClick={onRequestCompose}>{i18n.t('content.createCollection')}</Button>}
            <Button size="sm" variant="ghost" onClick={onClearBookmarkSelection}>{i18n.t('content.clearSelection')}</Button>
          </div>
        </div>
      )}

      {bookmarks.length === 0 && density !== 'theme-space' ? (
        <EmptyState
          onNew={onNewBookmark}
          onSpotlight={onOpenSpotlight}
          onAddBookmarks={isCollectionView ? onOpenAddBookmarks : undefined}
        />
      ) : density === 'card' ? (
        <CardView
          items={presented}
          isSelected={(id) => selectedId === id || composeSet.has(id)}
          isBulkSelected={(id) => composeSet.has(id)}
          selectionMode={selectionMode}
          onSelect={(id, e) => handleCardClick(e, id)}
          onToggleStar={onToggleStar}
          onDragStart={startDrag}
          onVisit={onVisitBookmark}
          onEdit={onEditBookmark}
          onMove={(id) => onMoveBookmarks([id])}
          onDelete={(id) => onDeleteBookmarks([id])}
          onToggleSelect={onToggleBookmarkSelection}
          onRemoveFromCollection={isCollectionView ? onRemoveFromCollection : undefined}
        />
      ) : density === 'list' ? (
        <ListView
          {...bookmarkItemActions}
          items={presented}
          isSelected={(id) => selectedId === id || composeSet.has(id)}
          onSelect={(id, e) => handleCardClick(e, id)}
          onToggleStar={onToggleStar}
          onDragStart={startDrag}
        />
      ) : density === 'masonry' ? (
        <MasonryView
          {...bookmarkItemActions}
          items={presented}
          isSelected={(id) => selectedId === id || composeSet.has(id)}
          onSelect={(id, e) => handleCardClick(e, id)}
          onDragStart={startDrag}
        />
      ) : density === 'timeline' ? (
        <TimelineView
          {...bookmarkItemActions}
          items={presented}
          bookmarks={bookmarks}
          isSelected={(id) => selectedId === id || composeSet.has(id)}
          onSelect={(id, e) => handleCardClick(e, id)}
          onDragStart={startDrag}
        />
      ) : density === 'tag-aggregation' ? (
        <TagAggregationView
          {...bookmarkItemActions}
          items={presented}
          bookmarks={bookmarks}
          tags={tags}
          isSelected={(id) => selectedId === id || composeSet.has(id)}
          onSelect={(id, e) => handleCardClick(e, id)}
          onDragStart={startDrag}
        />
      ) : (
        <ThemeSpaceView
          {...bookmarkItemActions}
          items={presentedAll}
          collections={collections}
          isSelected={(id) => selectedId === id || composeSet.has(id)}
          onSelect={(id, e) => handleCardClick(e, id)}
          onDragStart={startDrag}
        />
      )}
    </div>
  );
}

/* ---------- hooks ---------- */
function useSelectionTitle(selection: Selection, categories: Category[], collections: Collection[], i18n: ReturnType<typeof useI18n>) {
  return useMemo(() => {
    switch (selection.kind) {
      case 'all': return i18n.t('content.selection.all');
      case 'starred': return i18n.t('content.selection.starred');
      case 'recent': return i18n.t('content.selection.recent');
      case 'category': return categories.find((c) => c.id === selection.id)?.name ?? i18n.t('content.selection.categoryFallback');
      case 'collection': return collections.find((c) => c.id === selection.id)?.name ?? i18n.t('content.selection.collectionFallback');
      case 'tag': return i18n.t('content.selection.tag');
      case 'health': return i18n.t(selection.status === 'changed' ? 'health.changed' : 'health.broken');
    }
  }, [selection, categories, collections, i18n]);
}
