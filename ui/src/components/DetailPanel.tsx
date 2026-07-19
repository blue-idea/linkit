import { useState } from 'react';
import type { Bookmark, Category, Collection, Tag } from '../types';
import { Icon, TagPill, Favicon, MiniBrowser, Sparkline, AIBadge, Button, Kbd } from './ui';
import { tagColors } from '../colors';

function StatPill({
  icon,
  label,
  value,
  color = 'gray',
  'aria-label': ariaLabel,
}: {
  icon: string;
  label: string;
  value: string;
  color?: keyof typeof tagColors;
  'aria-label'?: string;
}) {
  const c = tagColors[color];
  return (
    <div className="flex items-center gap-2 rounded-lg bg-ink-800/60 hairline px-2.5 py-2" aria-label={ariaLabel}>
      <span className={`w-7 h-7 rounded-md ${c.soft} flex items-center justify-center`}>
        <Icon name={icon} size={14} className={c.text} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] text-ink-400 uppercase tracking-wide">{label}</div>
        <div className="text-[13px] font-semibold text-ink-100 tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
        {hint && <span className="text-[10px] text-ink-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function DetailPanel({
  bookmark,
  tags,
  categories,
  collections,
  onUpdate,
  onToggleStar,
  onTogglePin,
  onToggleCollection,
  onAddTag,
  onRemoveTag,
  onAcceptSuggestedTag,
  onCreateTag,
  onVisit,
  onOpenHealth,
  onReanalyze,
  onOpenKnowledgeGraph,
  onEdit,
  onMove,
  onDelete,
  onClose,
}: {
  bookmark: Bookmark | null;
  tags: Tag[];
  categories: Category[];
  collections: Collection[];
  onUpdate: (patch: Partial<Bookmark>) => void;
  onToggleStar: () => void;
  onTogglePin: () => void;
  onToggleCollection: (collectionId: string) => void;
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onAcceptSuggestedTag: (tagId: string) => void;
  onCreateTag: (label: string) => void;
  onVisit: () => void;
  onOpenHealth: () => void;
  onReanalyze?: () => void;
  onOpenKnowledgeGraph?: () => void;
  onEdit?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tagInput, setTagInput] = useState('');

  if (!bookmark) {
    return (
      <div className="h-full glass flex flex-col items-center justify-center text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-ink-800/60 hairline flex items-center justify-center mb-3">
          <Icon name="MousePointerClick" size={24} className="text-ink-400" />
        </div>
        <div className="text-[13px] font-semibold text-ink-200">选择一个收藏查看详情</div>
        <div className="text-[11px] text-ink-500 mt-1 max-w-[200px]">右侧面板会展示预览、标签、备注与访问统计。</div>
      </div>
    );
  }

  const b = bookmark;
  const cat = categories.find((c) => c.id === b.categoryId);
  const bTags = b.tags.map((id) => tags.find((t) => t.id === id)).filter(Boolean) as Tag[];
  const inCollections = collections.filter((c) => b.collectionIds.includes(c.id));
  const catColor = cat?.color ? tagColors[cat.color] : tagColors.gray;
  const created = new Date(b.createdAt);
  const lastVisit = b.lastVisitedAt ? new Date(b.lastVisitedAt) : null;

  return (
    <div className="h-full flex flex-col glass overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3 border-b border-white/5">
        <Favicon glyph={b.favicon} color={b.faviconColor} size={40} />
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              aria-label="Bookmark title"
              defaultValue={b.title}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== b.title) onUpdate({ title: next });
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              className="w-full rounded-md bg-ink-800/60 hairline px-2 py-1 text-[14px] font-semibold text-ink-100 outline-none focus-ring"
            />
          ) : (
            <button
              type="button"
              aria-label="Edit bookmark title"
              onClick={() => setEditingTitle(true)}
              className="text-left text-[14px] font-semibold text-ink-100 leading-snug hover:text-accent-200 transition"
            >
              {b.title}
            </button>
          )}
          <a href={b.url} target="_blank" rel="noreferrer" className="text-[11px] text-accent-300 hover:text-accent-200 truncate block mt-0.5">
            {b.url}
          </a>
        </div>
        <button
          type="button"
          aria-label="Close detail panel"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-ink-700/60 text-ink-400 hover:text-ink-100 flex items-center justify-center transition focus-ring"
        >
          <Icon name="X" size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon="ExternalLink"
            onClick={onVisit}
            className="flex-1"
            aria-label="Open bookmark URL"
          >
            Visit
          </Button>
          {onReanalyze && (
            <Button
              variant="subtle"
              size="sm"
              icon="Sparkles"
              onClick={onReanalyze}
              aria-label="Regenerate AI summary"
            >
              Reanalyze
            </Button>
          )}
          {onOpenKnowledgeGraph && (
            <Button variant="subtle" size="sm" icon="Share2" onClick={onOpenKnowledgeGraph} aria-label="Open knowledge network">
              Network
            </Button>
          )}
          <Button
            variant="subtle"
            size="sm"
            icon="Star"
            onClick={onToggleStar}
            className={b.starred ? 'text-amber-400' : ''}
            aria-label="Toggle star"
            aria-pressed={b.starred}
          >
            <Icon name="Star" size={13} fill={b.starred ? 'currentColor' : 'none'} />
          </Button>
          <Button
            variant="subtle"
            size="sm"
            onClick={onTogglePin}
            className={b.pinned ? 'text-amber-400' : ''}
            icon="Pin"
            aria-label="Toggle pin"
            aria-pressed={b.pinned}
          />
          {onEdit && (
            <button type="button" aria-label="Edit bookmark" onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-ink-200 hover:bg-ink-700/60 transition">
              <Icon name="Pencil" size={13} /> Edit
            </button>
          )}
          {onMove && (
            <button type="button" aria-label="Move bookmark" onClick={onMove} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-ink-200 hover:bg-ink-700/60 transition">
              <Icon name="FolderInput" size={13} /> Move
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              aria-label="Delete bookmark"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-coral-400 hover:bg-coral-500/15 transition"
            >
              <Icon name="Trash2" size={13} />
              Delete
            </button>
          )}
        </div>

        {/* REQ-008-AC-003：阅读状态仅允许四种枚举 */}
        <Field label="Read status">
          <select
            aria-label="Read status"
            value={b.readStatus ?? 'unread'}
            onChange={(e) =>
              onUpdate({
                readStatus: e.target.value as NonNullable<Bookmark['readStatus']>,
              })
            }
            className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 px-3 py-2 focus-ring"
          >
            <option value="unread">Unread</option>
            <option value="reading">Reading</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
        </Field>

        {/* Preview */}
        <div className="px-4 pb-2">
          <MiniBrowser domain={b.domain} thumbnail={b.thumbnail} title={b.title} className="aspect-[16/10]" />
        </div>

        {/* AI summary */}
        {b.aiSummary && (
          <div className="mx-4 my-2 rounded-mac bg-violet2-500/10 border border-violet2-400/20 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <AIBadge label="AI 摘要" />
            </div>
            <p className="text-[12px] text-ink-200 leading-relaxed">{b.aiSummary}</p>
          </div>
        )}

        {/* Description */}
        <Field label="说明">
          <p className="text-[12px] text-ink-300 leading-relaxed">{b.description}</p>
        </Field>

        {/* Stats */}
        <div className="px-4 py-2 grid grid-cols-2 gap-2">
          <StatPill icon="Eye" label="访问次数" value={String(b.visitCount)} color="blue" aria-label="Visit count" />
          <StatPill icon="Clock" label="最近访问" value={lastVisit ? relTime(lastVisit) : '从未'} color="green" />
          <StatPill icon="Plus" label="收藏于" value={`${created.getMonth() + 1}月${created.getDate()}日`} color="violet" />
          <StatPill icon="Calendar" label="距今" value={relDays(created)} color="amber" />
        </div>

        {/* Visit sparkline */}
        {b.spark && (
          <div className="px-4 py-2">
            <div className="rounded-lg bg-ink-800/60 hairline px-3 py-2.5 flex items-center gap-3">
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">访问趋势</div>
              <Sparkline data={b.spark} color={b.faviconColor} width={120} height={28} />
              <div className="ml-auto text-[10px] text-ink-400">近 12 周</div>
            </div>
          </div>
        )}

        {/* Category */}
        <Field label="所属分类" hint="唯一">
          <div className="inline-flex items-center gap-2 rounded-lg bg-ink-800/60 hairline px-3 py-2">
            <Icon name={cat?.icon ?? 'Folder'} size={14} className={catColor.text} />
            <span className="text-[12px] text-ink-100 font-medium">{cat?.name ?? '未分类'}</span>
            <Icon name="ChevronRight" size={12} className="text-ink-500" />
          </div>
        </Field>

        {/* Collections (multi) */}
        <Field label="所属主题" hint="可多个 · 拖拽侧边栏主题也可添加">
          <div className="flex flex-wrap gap-1.5">
            {inCollections.map((c) => (
              <TagPill
                key={c.id}
                label={`${c.emoji} ${c.name}`}
                color={c.color}
                onRemove={() => onToggleCollection(c.id)}
              />
            ))}
            <details className="inline-block">
              <summary className="list-none inline-flex items-center gap-1 rounded-full border border-dashed border-ink-500/50 text-[11px] text-ink-400 px-2 py-0.5 cursor-pointer hover:text-ink-200 hover:border-ink-400 transition">
                <Icon name="Plus" size={10} /> 加入主题
              </summary>
              <div className="absolute mt-1 z-20 rounded-lg glass-strong hairline p-1 min-w-[160px] shadow-float">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onToggleCollection(c.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-ink-700/60 text-left"
                  >
                    <span>{c.emoji}</span>
                    <span className="text-[12px] text-ink-100 flex-1">{c.name}</span>
                    {b.collectionIds.includes(c.id) && <Icon name="Check" size={12} className="text-mint-400" />}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </Field>

        {/* Tags */}
        <Field label="标签" hint="支持颜色标记">
          <div className="flex flex-wrap gap-1.5 items-center" aria-label="Bookmark tags">
            {bTags.map((t) => (
              <TagPill
                key={t.id}
                label={t.label}
                color={t.color}
                onRemove={() => onRemoveTag(t.id)}
              />
            ))}
            {b.aiSuggestedTags && b.aiSuggestedTags.filter((t) => !b.tags.includes(t)).map((tid) => {
              const t = tags.find((x) => x.id === tid);
              if (!t) return null;
              return (
                <button
                  key={tid}
                  type="button"
                  aria-label={`Accept suggested tag ${t.label}`}
                  onClick={() => onAcceptSuggestedTag(tid)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet2-400/40 text-[11px] text-violet2-400 px-2 py-0.5 hover:bg-violet2-500/10 transition"
                >
                  <AIBadge label="" /> +{t.label}
                </button>
              );
            })}
            <input
              aria-label="Add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  // REQ-014-AC-002：已有标签则加入；否则创建后加入。
                  const label = tagInput.trim();
                  const existing = tags.find((t) => t.label.toLocaleLowerCase() === label.toLocaleLowerCase());
                  if (existing) onAddTag(existing.id);
                  else onCreateTag(label);
                  setTagInput('');
                }
              }}
              placeholder="加标签…"
              className="bg-transparent text-[11px] text-ink-100 placeholder:text-ink-500 outline-none w-20"
            />
          </div>
        </Field>

        {/* Notes */}
        <Field label="备注" hint="Markdown">
          {editingNotes ? (
            <textarea
              autoFocus
              defaultValue={b.notes}
              onBlur={(e) => { onUpdate({ notes: e.target.value }); setEditingNotes(false); }}
              className="w-full rounded-mac bg-ink-800/60 hairline text-[12px] text-ink-100 p-3 leading-relaxed resize-none focus-ring font-mono"
              rows={6}
            />
          ) : (
            <div
              onClick={() => setEditingNotes(true)}
              className="rounded-mac bg-ink-800/40 hover:bg-ink-800/60 transition p-3 text-[12px] text-ink-200 leading-relaxed cursor-text min-h-[60px] prose-sm"
            >
              {b.notes ? <MarkdownLite text={b.notes} /> : <span className="text-ink-500">点击添加备注…</span>}
            </div>
          )}
        </Field>

        {/* Health */}
        <Field label="链接健康" hint="AI 定期检测">
          <button
            onClick={onOpenHealth}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
              b.health === 'ok' ? 'bg-mint-500/10 hover:bg-mint-500/15' : 'bg-amber-500/10 hover:bg-amber-500/15'
            }`}
          >
            <span className={`w-8 h-8 rounded-md flex items-center justify-center ${b.health === 'ok' ? 'bg-mint-500/20' : 'bg-amber-500/20'}`}>
              <Icon name={b.health === 'ok' ? 'ShieldCheck' : 'RefreshCw'} size={15} className={b.health === 'ok' ? 'text-mint-400' : 'text-amber-400'} />
            </span>
            <div className="text-left flex-1">
              <div className={`text-[12px] font-medium ${b.health === 'ok' ? 'text-mint-400' : 'text-amber-400'}`}>
                {b.health === 'ok' ? '链接正常' : b.health === 'changed' ? '内容已更新' : '链接可能失效'}
              </div>
              <div className="text-[10px] text-ink-400">{b.health === 'changed' ? '页面结构或正文有变化，建议复访' : '上次检测：2 小时前'}</div>
            </div>
            <Icon name="ChevronRight" size={13} className="text-ink-500" />
          </button>
        </Field>

        <div className="px-4 py-3 flex items-center justify-between text-[10px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <Kbd>⌘</Kbd><Kbd>E</Kbd> 编辑备注
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>⌘</Kbd><Kbd>↵</Kbd> 访问
          </span>
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}

/* tiny markdown-lite renderer */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <div key={i} className="text-[12px] font-semibold text-ink-100 mt-1">{line.slice(3)}</div>;
        if (line.startsWith('- ')) return (
          <div key={i} className="flex gap-1.5 text-[12px] text-ink-200">
            <span className="text-ink-500">•</span>
            <span dangerouslySetInnerHTML={{ __html: inlineFmt(line.slice(2)) }} />
          </div>
        );
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <div key={i} className="text-[12px] text-ink-200" dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />;
      })}
    </div>
  );
}
function inlineFmt(s: string) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink-100 font-semibold">$1</strong>')
    .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" class="text-accent-300 hover:underline">$1</a>');
}

function relTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '刚刚';
  if (h < 24) return `${h} 小时前`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}
function relDays(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return '今天';
  if (days < 30) return `${days} 天`;
  return `${Math.floor(days / 30)} 个月`;
}
