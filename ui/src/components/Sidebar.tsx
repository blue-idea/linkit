import type { Bookmark, Category, Collection, Tag } from '../types';
import type { Selection } from '../state';
import { Icon, TagPill, AIBadge } from './ui';
import { tagColors } from '../colors';

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
}) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/bookmark');
        if (id && onDropBookmark) onDropBookmark(id);
      }}
      className={`group flex items-center gap-2 pr-2 rounded-lg mx-1.5 transition-all cursor-pointer no-select ${
        active ? 'bg-accent-500/20 text-ink-100 shadow-[inset_0_0_0_1px_rgba(45,127,249,0.3)]' : 'text-ink-200 hover:bg-ink-700/50'
      } ${dragOver ? 'drop-target' : ''}`}
      style={{ paddingLeft: 12 + depth * 16 }}
    >
      {expandable ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          className="w-4 h-4 flex items-center justify-center text-ink-400 hover:text-ink-100 shrink-0"
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
  insightCount: number;
}) {
  const [dragOverId, setDragOverId] = useStateDrag();

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
              <button
                type="button"
                aria-label="Delete category"
                title="Delete category"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(cat.id);
                }}
                className="opacity-70 group-hover:opacity-100 w-5 h-5 rounded text-ink-400 hover:text-coral-400 flex items-center justify-center transition"
              >
                <Icon name="Trash2" size={11} />
              </button>
            }
          />
          {kids.length > 0 && isExpanded && <div className="animate-fade-in">{renderTree(cat.id, depth + 1)}</div>}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col glass border-r border-white/5">
      {/* Brand + new */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-mint-500 flex items-center justify-center hairline shrink-0">
          <Icon name="Boxes" size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink-100 leading-none">Lattice</div>
          <div className="text-[10px] text-ink-400 mt-0.5">网址收藏管理</div>
        </div>
        <button
          onClick={onNewBookmark}
          className="w-7 h-7 rounded-lg bg-ink-700/70 hover:bg-accent-600 text-ink-200 hover:text-white flex items-center justify-center transition-all hairline"
          title="新增收藏 (⌘N)"
        >
          <Icon name="Plus" size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin pb-4">
        {/* Library */}
        <SectionLabel>资料库</SectionLabel>
        <NavRow
          active={selection.kind === 'all'}
          icon="Library"
          iconColor="text-accent-300"
          label="全部收藏"
          count={bookmarks.length}
          onClick={() => onSelect({ kind: 'all' })}
        />
        <NavRow
          active={selection.kind === 'starred'}
          icon="Star"
          iconColor="text-amber-400"
          label="星标"
          count={starredCount}
          onClick={() => onSelect({ kind: 'starred' })}
        />
        <NavRow
          active={selection.kind === 'recent'}
          icon="Clock"
          iconColor="text-mint-400"
          label="最近添加"
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
          智能
        </SectionLabel>
        <NavRow
          active={false}
          icon="Sparkles"
          iconColor="text-violet2-400"
          label="收藏洞察"
          count={insightCount}
          onClick={onOpenInsights}
          trailing={insightCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-coral-500 animate-ai-pulse" />}
        />

        {/* Categories */}
        <SectionLabel
          right={
            <button
              type="button"
              aria-label="New category"
              className="text-ink-400 hover:text-ink-100 transition"
              title="New category"
              onClick={onNewCategory}
            >
              <Icon name="Plus" size={12} />
            </button>
          }
        >
          收藏分类
        </SectionLabel>
        {renderTree(null, 0)}

        {/* Collections */}
        <SectionLabel
          right={
            <button className="text-ink-400 hover:text-ink-100 transition" title="新建主题">
              <Icon name="Plus" size={12} />
            </button>
          }
        >
          收藏主题
        </SectionLabel>
        {collections.map((col) => {
          const active = selection.kind === 'collection' && selection.id === col.id;
          const c = tagColors[col.color];
          return (
            <NavRow
              key={col.id}
              active={active}
              emoji={col.emoji}
              label={col.name}
              count={col.bookmarkIds.length}
              onClick={() => onSelect({ kind: 'collection', id: col.id })}
              onDropBookmark={(bid) => onDropToCollection(col.id, bid)}
              dragOver={dragOverId === col.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(col.id); }}
              onDragLeave={() => setDragOverId(null)}
              trailing={<span className={`w-1.5 h-1.5 rounded-full ${c.dot} opacity-70`} />}
            />
          );
        })}

        {/* Tags */}
        <SectionLabel>标签</SectionLabel>
        <div className="px-3 pt-1 pb-2 flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const active = selection.kind === 'tag' && selection.id === t.id;
            return (
              <TagPill
                key={t.id}
                label={t.label}
                color={t.color}
                active={active}
                onClick={() => onSelect({ kind: 'tag', id: t.id })}
              />
            );
          })}
        </div>

        {/* Health */}
        <SectionLabel>链接健康</SectionLabel>
        <NavRow
          active={selection.kind === 'health' && selection.status === 'changed'}
          icon="RefreshCw"
          iconColor="text-amber-400"
          label="内容已更新"
          count={bookmarks.filter((b) => b.health === 'changed').length}
          onClick={() => onSelect({ kind: 'health', status: 'changed' })}
        />
      </div>

      {/* Footer storage meter */}
      <div className="px-3 py-2.5 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px] text-ink-400 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Icon name="HardDrive" size={11} />
            本地缓存
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
