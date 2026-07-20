import { useState } from 'react';
import type { Bookmark, Category, Collection, Tag } from '../types';
import { Icon, TagPill, Favicon, MiniBrowser, Sparkline, AIBadge, Button, Kbd } from './ui';
import { tagColors } from '../colors';
import { useI18n } from '../i18n/use-i18n';
import type { AppLocale } from '../config/i18n';
import type { I18nApi } from '../i18n';

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
  const i18n = useI18n();
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tagInput, setTagInput] = useState('');

  if (!bookmark) {
    return (
      <div className="h-full glass flex flex-col items-center justify-center text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-ink-800/60 hairline flex items-center justify-center mb-3">
          <Icon name="MousePointerClick" size={24} className="text-ink-400" />
        </div>
        <div className="text-[13px] font-semibold text-ink-200">{i18n.t('bookmark.emptyDetailTitle')}</div>
        <div className="text-[11px] text-ink-500 mt-1 max-w-[200px]">{i18n.t('bookmark.emptyDetailBody')}</div>
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
              aria-label={i18n.t('bookmark.titleInput')}
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
              aria-label={i18n.t('bookmark.editTitle')}
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
          aria-label={i18n.t('bookmark.closeDetail')}
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-ink-700/60 text-ink-400 hover:text-ink-100 flex items-center justify-center transition focus-ring"
        >
          <Icon name="X" size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {/* Actions */}
        <div className="px-4 py-3 flex flex-col gap-2">
          {/* Main Actions Row */}
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="primary"
              size="sm"
              icon="ExternalLink"
              onClick={onVisit}
              className="flex-1 shrink-0"
              aria-label={i18n.t('bookmark.openUrl')}
            >
              {i18n.t('bookmark.visit')}
            </Button>
            {onReanalyze && (
              <Button
                variant="subtle"
                size="sm"
                icon="Sparkles"
                onClick={onReanalyze}
                className="shrink-0"
                aria-label={i18n.t('bookmark.regenerateSummary')}
              >
                {i18n.t('bookmark.reanalyze')}
              </Button>
            )}
            {onOpenKnowledgeGraph && (
              <Button
                variant="subtle"
                size="sm"
                icon="Share2"
                onClick={onOpenKnowledgeGraph}
                className="shrink-0"
                aria-label={i18n.t('bookmark.openNetwork')}
              >
                {i18n.t('bookmark.network')}
              </Button>
            )}
            <Button
              variant="subtle"
              size="sm"
              icon="Star"
              onClick={onToggleStar}
              className={`shrink-0 ${b.starred ? 'text-amber-400' : ''}`}
              aria-label={i18n.t('bookmark.toggleStar')}
              aria-pressed={b.starred}
            >
              <Icon name="Star" size={13} fill={b.starred ? 'currentColor' : 'none'} />
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={onTogglePin}
              className={`shrink-0 ${b.pinned ? 'text-amber-400' : ''}`}
              icon="Pin"
              aria-label={i18n.t('bookmark.togglePin')}
              aria-pressed={b.pinned}
            />
          </div>

          {/* Edit / Move / Delete Actions Row */}
          {(onEdit || onMove || onDelete) && (
            <div className="flex items-center gap-1.5 border-t border-white/5 pt-2">
              {onEdit && (
                <button
                  type="button"
                  aria-label={i18n.t('bookmark.edit')}
                  onClick={onEdit}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-ink-200 hover:bg-ink-700/60 transition whitespace-nowrap"
                >
                  <Icon name="Pencil" size={13} /> {i18n.t('common.edit')}
                </button>
              )}
              {onMove && (
                <button
                  type="button"
                  aria-label={i18n.t('bookmark.move')}
                  onClick={onMove}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-ink-200 hover:bg-ink-700/60 transition whitespace-nowrap"
                >
                  <Icon name="FolderInput" size={13} /> {i18n.t('common.move')}
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  aria-label={i18n.t('bookmark.delete')}
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-coral-400 hover:bg-coral-500/15 transition whitespace-nowrap"
                >
                  <Icon name="Trash2" size={13} />
                  {i18n.t('common.delete')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* REQ-008-AC-003：阅读状态仅允许四种枚举 */}
        <Field label={i18n.t('bookmark.readStatus')}>
          <select
            aria-label={i18n.t('bookmark.readStatus')}
            value={b.readStatus ?? 'unread'}
            onChange={(e) =>
              onUpdate({
                readStatus: e.target.value as NonNullable<Bookmark['readStatus']>,
              })
            }
            className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 px-3 py-2 focus-ring"
          >
            <option value="unread">{i18n.t('status.unread')}</option>
            <option value="reading">{i18n.t('status.reading')}</option>
            <option value="read">{i18n.t('status.read')}</option>
            <option value="archived">{i18n.t('status.archived')}</option>
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
              <AIBadge label={i18n.t('bookmark.aiSummary')} />
            </div>
            <p className="text-[12px] text-ink-200 leading-relaxed">{b.aiSummary}</p>
          </div>
        )}

        {/* Description */}
        <Field label={i18n.t('bookmark.description')}>
          <p className="text-[12px] text-ink-300 leading-relaxed">{b.description}</p>
        </Field>

        {/* Stats */}
        <div className="px-4 py-2 grid grid-cols-2 gap-2">
          <StatPill icon="Eye" label={i18n.t('bookmark.visitCount')} value={String(b.visitCount)} color="blue" aria-label={i18n.t('bookmark.visitCount')} />
          <StatPill icon="Clock" label={i18n.t('bookmark.lastVisited')} value={lastVisit ? relTime(lastVisit, i18n.getLocale()) : i18n.t('bookmark.never')} color="green" />
          <StatPill icon="Plus" label={i18n.t('bookmark.savedAt')} value={formatShortDate(created, i18n.getLocale())} color="violet" />
          <StatPill icon="Calendar" label={i18n.t('bookmark.age')} value={relDays(created, i18n)} color="amber" />
        </div>

        {/* Visit sparkline */}
        {b.spark && (
          <div className="px-4 py-2">
            <div className="rounded-lg bg-ink-800/60 hairline px-3 py-2.5 flex items-center gap-3">
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">{i18n.t('bookmark.visitTrend')}</div>
              <Sparkline data={b.spark} color={b.faviconColor} width={120} height={28} />
              <div className="ml-auto text-[10px] text-ink-400">{i18n.t('bookmark.last12Weeks')}</div>
            </div>
          </div>
        )}

        {/* Category */}
        <Field label={i18n.t('bookmark.categorySection')} hint={i18n.t('bookmark.uniqueCategory')}>
          <div className="inline-flex items-center gap-2 rounded-lg bg-ink-800/60 hairline px-3 py-2">
            <Icon name={cat?.icon ?? 'Folder'} size={14} className={catColor.text} />
            <span className="text-[12px] text-ink-100 font-medium">{cat?.name ?? i18n.t('bookmark.uncategorized')}</span>
            <Icon name="ChevronRight" size={12} className="text-ink-500" />
          </div>
        </Field>

        {/* Collections (multi) */}
        <Field label={i18n.t('bookmark.collectionSection')} hint={i18n.t('bookmark.collectionHint')}>
          <div className="flex flex-wrap gap-1.5">
            {inCollections.map((c) => (
              <TagPill
                key={c.id}
                label={`${c.emoji} ${c.name}`}
                color={c.color}
                onRemove={() => onToggleCollection(c.id)}
              />
            ))}
            <details className="inline-block relative">
              <summary className="list-none inline-flex items-center gap-1 rounded-full border border-dashed border-ink-500/50 text-[11px] text-ink-400 px-2 py-0.5 cursor-pointer hover:text-ink-200 hover:border-ink-400 transition">
                <Icon name="Plus" size={10} /> {i18n.t('bookmark.addToCollection')}
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
        <Field label={i18n.t('bookmark.tagsSection')} hint={i18n.t('bookmark.tagsHint')}>
          <div className="flex flex-wrap gap-1.5 items-center" aria-label={i18n.t('bookmark.tagsLabel')}>
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
                  aria-label={i18n.t('bookmark.acceptTag', { tag: t.label })}
                  onClick={() => onAcceptSuggestedTag(tid)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet2-400/40 text-[11px] text-violet2-400 px-2 py-0.5 hover:bg-violet2-500/10 transition"
                >
                  <AIBadge label="" /> +{t.label}
                </button>
              );
            })}
            <input
              aria-label={i18n.t('bookmark.addTag')}
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
              placeholder={i18n.t('bookmark.addTagPlaceholder')}
              className="bg-transparent text-[11px] text-ink-100 placeholder:text-ink-500 outline-none w-20"
            />
          </div>
        </Field>

        {/* Notes */}
        <Field label={i18n.t('bookmark.notes')} hint={i18n.t('bookmark.markdown')}>
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
              {b.notes ? <MarkdownLite text={b.notes} /> : <span className="text-ink-500">{i18n.t('bookmark.notesPlaceholder')}</span>}
            </div>
          )}
        </Field>

        {/* Health */}
        <Field label={i18n.t('bookmark.healthSection')} hint={i18n.t('bookmark.healthHint')}>
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
                {b.health === 'ok' ? i18n.t('bookmark.healthOk') : b.health === 'changed' ? i18n.t('bookmark.healthChanged') : i18n.t('bookmark.healthBroken')}
              </div>
              <div className="text-[10px] text-ink-400">{b.health === 'changed' ? i18n.t('bookmark.healthChangedHint') : i18n.t('bookmark.healthLastChecked')}</div>
            </div>
            <Icon name="ChevronRight" size={13} className="text-ink-500" />
          </button>
        </Field>

        <div className="px-4 py-3 flex items-center justify-between text-[10px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <Kbd>⌘</Kbd><Kbd>E</Kbd> {i18n.t('bookmark.shortcutEditNotes')}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>⌘</Kbd><Kbd>↵</Kbd> {i18n.t('bookmark.shortcutVisit')}
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

function relTime(d: Date, locale: AppLocale) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  const formatter = new Intl.RelativeTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { numeric: 'auto' });
  if (h < 1) return formatter.format(0, 'second');
  if (h < 24) return formatter.format(-h, 'hour');
  const days = Math.floor(h / 24);
  if (days < 30) return formatter.format(-days, 'day');
  return formatter.format(-Math.floor(days / 30), 'month');
}
function relDays(d: Date, i18n: I18nApi) {
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return i18n.t('bookmark.today');
  if (days < 30) return i18n.t('bookmark.days', { count: days });
  return i18n.t('bookmark.months', { count: Math.floor(days / 30) });
}

function formatShortDate(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}
