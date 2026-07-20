import type { Bookmark, Category, Collection, Tag } from '../types';
import type { Selection } from '../state';
import { Icon, TagPill, AIBadge } from './ui';
import { tagColors } from '../colors';
import { CategoryDndContext, CategoryDndItem } from '../features/categories';
import { useI18n } from '../i18n/use-i18n';

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 pt-4 pb-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{children}</span>
      {right}
    </div>
  );
}

function NavRow({
  active,
  icon,
  iconColor,
  label,
  count,
  emoji,
  depth = 0,
  expandable,
  expanded,
  onToggleExpand,
  onClick,
  onDropBookmark,
  dragOver,
  onDragOver,
  onDragLeave,
  trailing,
  className = '',
}: {
  active: boolean;
  icon?: string;
  iconColor?: string;
  label: string;
  count?: number;
  emoji?: string;
  depth?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onClick: () => void;
  onDropBookmark?: (bookmarkId: string) => void;
  dragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const i18n = useI18n();
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/bookmark');
        if (id && onDropBookmark) onDropBookmark(id);
      }}
      className={`group flex items-center gap-2 pr-2 rounded-lg mx-1.5 transition-all cursor-pointer no-select ${
        active ? 'bg-accent-500/20 text-ink-100 shadow-[inset_0_0_0_1px_rgba(45,127,249,0.3)]' : 'text-ink-200 hover:bg-ink-700/50'
      } ${dragOver ? 'drop-target' : ''} ${className}`}
      data-category-drop={label}
      style={{ paddingLeft: 12 + depth * 16 }}
    >
      {expandable ? (
        <button
          type="button"
          aria-label={`${expanded ? i18n.t('sidebar.collapse') : i18n.t('sidebar.expand')} ${label}`}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-4 h-4 flex items-center justify-center text-ink-400 hover:text-ink-100 shrink-0 focus-ring rounded-sm"
        >
          <Icon name="ChevronRight" size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      {emoji ? (
        <span className="text-sm leading-none w-4 text-center shrink-0">{emoji}</span>
      ) : icon ? (
        <Icon name={icon} size={14} className={`shrink-0 ${iconColor ?? 'text-ink-300'}`} />
      ) : null}
      <span className="flex-1 truncate text-[13px] font-medium">{label}</span>
      {trailing}
      {count !== undefined && (
        <span className={`text-[11px] tabular-nums ${active ? 'text-accent-200' : 'text-ink-400'} group-hover:text-ink-300`}>{count}</span>
      )}
    </div>
  );
}

export function Sidebar({
  categories,
  collections,
  tags,
  bookmarks,
  selection,
  expanded,
  onToggleExpand,
  onSelect,
  onDropToCategory,
  onDropToCollection,
  onOpenInsights,
  onNewBookmark,
  onNewCategory,
  onDeleteCategory,
  onMoveCategory,
  onRequestSetCategoryIcon,
  onNewCollection,
  onEditCollection,
  onDeleteCollection,
  onDropToCompose,
  insightCount,
}: {
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
  bookmarks: Bookmark[];
  selection: Selection;
  expanded: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onSelect: (s: Selection) => void;
  onDropToCategory: (categoryId: string, bookmarkId: string) => void;
  onDropToCollection: (collectionId: string, bookmarkId: string) => void;
  onOpenInsights: () => void;
  onNewBookmark: () => void;
  onNewCategory: () => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoveCategory: (categoryId: string, newParentId: string) => void;
  onRequestSetCategoryIcon: (categoryId: string) => void;
  onNewCollection: () => void;
  onEditCollection: (collectionId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onDropToCompose: (rawPayload: string) => void;
  insightCount: number;
}) {
  const i18n = useI18n();
  const [dragOverId, setDragOverId] = useStateDrag();
  const [composeDropActive, setComposeDropActive] = useState(false);

  const childrenOf = (parentId: string | null) => categories.filter((c) => c.parentId === parentId);

  const countForCat = (catId: string): number => {
    const direct = bookmarks.filter((b) => b.categoryId === catId).length;
    const kids = childrenOf(catId);
    return direct + kids.reduce((sum, k) => sum + countForCat(k.id), 0);
  };
  const starredCount = bookmarks.filter((b) => b.starred).length;
  const recentCount = bookmarks.filter((b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86400000).length;

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const items = childrenOf(parentId);
    return items.map((cat) => {
      const kids = childrenOf(cat.id);
      const isExpanded = expanded[cat.id] ?? depth < 1;
      const active = selection.kind === 'category' && selection.id === cat.id;
      const c = cat.color ? tagColors[cat.color] : null;
      return (
        <div key={cat.id}>
          <CategoryDndItem categoryId={cat.id}>
            {({ setDropRef, setDragHandleProps, isOver, isDragging, transformStyle }) => (
              <div
                ref={setDropRef}
                style={{ transform: transformStyle, opacity: isDragging ? 0.6 : 1 }}
                className={isOver ? 'ring-1 ring-accent-400/50 rounded-lg' : undefined}
                {...setDragHandleProps}
              >
                <NavRow
                  active={active}
                  icon={cat.icon}
                  iconColor={c?.text}
                  label={cat.name}
                  count={countForCat(cat.id)}
                  depth={depth}
                  expandable={kids.length > 0}
                  expanded={isExpanded}
                  onToggleExpand={() => onToggleExpand(cat.id)}
                  onClick={() => onSelect({ kind: 'category', id: cat.id })}
                  onDropBookmark={(bid) => onDropToCategory(cat.id, bid)}
                  dragOver={dragOverId === cat.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(cat.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  trailing={
                    <span className="flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label={i18n.t('sidebar.setCategoryIcon')}
                        title={i18n.t('sidebar.setCategoryIcon')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestSetCategoryIcon(cat.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 w-5 h-5 rounded text-ink-400 hover:text-accent-300 flex items-center justify-center transition"
                      >
                        <Icon name="Shapes" size={11} />
                      </button>
                      <button
                        type="button"
                        aria-label={i18n.t('sidebar.deleteCategory')}
                        title={i18n.t('sidebar.deleteCategory')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(cat.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 w-5 h-5 rounded text-ink-400 hover:text-coral-400 flex items-center justify-center transition"
                      >
                        <Icon name="Trash2" size={11} />
                      </button>
                    </span>
                  }
                />
              </div>
            )}
          </CategoryDndItem>
          {kids.length > 0 && isExpanded && <div className="animate-fade-in">{renderTree(cat.id, depth + 1)}</div>}
        </div>
      );
    });
  };

  return (
    <div
      onClick={() => onSelect({ kind: 'all' })}
      className="h-full flex flex-col glass border-r border-white/5"
    >
      {/* Brand + new */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-mint-500 flex items-center justify-center hairline shrink-0">
          <Icon name="Boxes" size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink-100 leading-none">Lattice</div>
          <div className="text-[10px] text-ink-400 mt-0.5">{i18n.t('app.tagline')}</div>
        </div>
        <button
          onClick={onNewBookmark}
          className="w-7 h-7 rounded-lg bg-ink-700/70 hover:bg-accent-600 text-ink-200 hover:text-white flex items-center justify-center transition-all hairline"
          title={`${i18n.t('sidebar.newBookmark')} (⌘N)`}
        >
          <Icon name="Plus" size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin pb-4">
        {/* Library */}
        <SectionLabel>{i18n.t('sidebar.library')}</SectionLabel>
        <NavRow
          active={selection.kind === 'all'}
          icon="Library"
          iconColor="text-accent-300"
          label={i18n.t('sidebar.all')}
          count={bookmarks.length}
          onClick={() => onSelect({ kind: 'all' })}
        />
        <NavRow
          active={selection.kind === 'starred'}
          icon="Star"
          iconColor="text-amber-400"
          label={i18n.t('sidebar.starred')}
          count={starredCount}
          onClick={() => onSelect({ kind: 'starred' })}
        />
        <NavRow
          active={selection.kind === 'recent'}
          icon="Clock"
          iconColor="text-mint-400"
          label={i18n.t('sidebar.recent')}
          count={recentCount}
          onClick={() => onSelect({ kind: 'recent' })}
        />

        {/* AI Insights */}
        <SectionLabel
          right={
            <span className="text-[10px] text-ink-400 flex items-center gap-1">
              <AIBadge label="AI" />
            </span>
          }
        >
          {i18n.t('sidebar.smart')}
        </SectionLabel>
        <NavRow
          active={false}
          icon="Sparkles"
          iconColor="text-violet2-400"
          label={i18n.t('sidebar.insights')}
          count={insightCount}
          onClick={onOpenInsights}
          trailing={insightCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-coral-500 animate-ai-pulse" />}
        />

        {/* Categories */}
        <SectionLabel
          right={
            <button
              type="button"
              aria-label={i18n.t('sidebar.newCategory')}
              className="text-ink-400 hover:text-ink-100 transition"
              title={i18n.t('sidebar.newCategory')}
              onClick={(e) => {
                e.stopPropagation();
                onNewCategory();
              }}
            >
              <Icon name="Plus" size={12} />
            </button>
          }
        >
          {i18n.t('sidebar.categories')}
        </SectionLabel>
        <CategoryDndContext onMoveCategory={onMoveCategory}>
          {renderTree(null, 0)}
        </CategoryDndContext>

        {/* Collections */}
        <SectionLabel
          right={
            <button
              type="button"
              aria-label={i18n.t('sidebar.newCollection')}
              className="text-ink-400 hover:text-ink-100 transition"
              title={i18n.t('sidebar.newCollection')}
              onClick={(e) => {
                e.stopPropagation();
                onNewCollection();
              }}
            >
              <Icon name="Plus" size={12} />
            </button>
          }
        >
          {i18n.t('sidebar.collections')}
        </SectionLabel>
        <div
          role="button"
          tabIndex={0}
          aria-label={i18n.t('sidebar.dropZone')}
          onClick={(e) => e.stopPropagation()}
          className={`mx-2 mb-1 rounded-lg border border-dashed px-2 py-2 text-[11px] transition ${
            composeDropActive
              ? 'border-accent-400/60 bg-accent-500/10 text-accent-200'
              : 'border-ink-500/40 text-ink-400 hover:border-ink-400/60'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setComposeDropActive(true);
          }}
          onDragLeave={() => setComposeDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setComposeDropActive(false);
            onDropToCompose(e.dataTransfer.getData('text/bookmark'));
          }}
        >
          {i18n.t('sidebar.dropSelection')}
        </div>
        {collections.map((col) => {
          const active = selection.kind === 'collection' && selection.id === col.id;
          const c = tagColors[col.color];
          return (
            <div key={col.id} className="group relative">
              <NavRow
                active={active}
                emoji={col.emoji}
                label={col.name}
                count={col.bookmarkIds.length}
                onClick={() => onSelect({ kind: 'collection', id: col.id })}
                onDropBookmark={(bid) => onDropToCollection(col.id, bid)}
                dragOver={dragOverId === col.id}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(col.id); }}
                onDragLeave={() => setDragOverId(null)}
                className="py-1"
                trailing={
                  <span className="flex items-center gap-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} opacity-70`} />
                    <button
                      type="button"
                      aria-label={i18n.t('sidebar.editCollection')}
                      title={i18n.t('sidebar.editCollection')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCollection(col.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded text-ink-400 hover:text-ink-100 flex items-center justify-center transition"
                    >
                      <Icon name="PenTool" size={11} />
                    </button>
                    <button
                      type="button"
                      aria-label={i18n.t('sidebar.deleteCollection')}
                      title={i18n.t('sidebar.deleteCollection')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCollection(col.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded text-ink-400 hover:text-coral-400 flex items-center justify-center transition"
                    >
                      <Icon name="Trash2" size={11} />
                    </button>
                  </span>
                }
              />
            </div>
          );
        })}

        {/* Tags */}
        <SectionLabel>{i18n.t('sidebar.tags')}</SectionLabel>
        <div className="px-3 pt-1 pb-2 flex flex-wrap gap-1.5" aria-label={i18n.t('sidebar.tagsLabel')} onClick={(e) => e.stopPropagation()}>
          {tags.map((t) => {
            const active = selection.kind === 'tag' && selection.id === t.id;
            const count = bookmarks.filter((b) => b.tags.includes(t.id)).length;
            return (
              <TagPill
                key={t.id}
                label={`${t.label} (${count})`}
                color={t.color}
                active={active}
                onClick={() => onSelect({ kind: 'tag', id: t.id })}
              />
            );
          })}
        </div>

        {/* Health */}
        <SectionLabel>{i18n.t('sidebar.health')}</SectionLabel>
        <NavRow
          active={selection.kind === 'health' && selection.status === 'changed'}
          icon="RefreshCw"
          iconColor="text-amber-400"
          label={i18n.t('sidebar.updated')}
          count={bookmarks.filter((b) => b.health === 'changed').length}
          onClick={() => onSelect({ kind: 'health', status: 'changed' })}
        />
        <NavRow
          active={selection.kind === 'health' && selection.status === 'broken'}
          icon="ShieldAlert"
          iconColor="text-coral-400"
          label={i18n.t('sidebar.broken')}
          count={bookmarks.filter((b) => b.health === 'broken').length}
          onClick={() => onSelect({ kind: 'health', status: 'broken' })}
        />
      </div>

      {/* Footer storage meter */}
      <div className="px-3 py-2.5 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-[10px] text-ink-400 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Icon name="HardDrive" size={11} />
            {i18n.t('sidebar.localCache')}
          </span>
          <span className="tabular-nums">{bookmarks.length} / ∞</span>
        </div>
        <div className="h-1 rounded-full bg-ink-700/70 overflow-hidden">
          <div className="h-full w-[34%] rounded-full bg-gradient-to-r from-accent-500 to-mint-500" />
        </div>
      </div>
    </div>
  );
}

/* small inline hook to avoid extra file */
import { useState } from 'react';
function useStateDrag() {
  const [id, setId] = useState<string | null>(null);
  return [id, setId] as const;
}
