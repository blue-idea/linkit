import { useEffect, useState } from 'react';
import type { Bookmark, Category, Collection, Tag, AIInsight } from '../types';
import { resolveBookmarkAnalysis, fetchBookmarkMetadata } from '../features/bookmarks';
import { Icon, Favicon, AIBadge, Button, Kbd, AnimateIn } from './ui';
import { tagColors } from '../colors';

/* ============ Modal shell ============ */
function Modal({ open, onClose, children, width = 'max-w-lg', 'aria-label': ariaLabel }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: string; 'aria-label'?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative w-full ${width} rounded-mac-xl glass-strong ring-glow overflow-hidden animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, onClose }: { icon: string; title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
      <span className="w-9 h-9 rounded-lg bg-ink-700/60 hairline flex items-center justify-center">
        <Icon name={icon} size={17} className="text-ink-100" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-ink-100 leading-tight" role="heading" aria-level={2}>{title}</div>
        {subtitle && <div className="text-[11px] text-ink-400 mt-0.5">{subtitle}</div>}
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-ink-700/60 text-ink-400 hover:text-ink-100 flex items-center justify-center transition">
        <Icon name="X" size={16} />
      </button>
    </div>
  );
}

/* ============ New Bookmark Dialog：分析确认后入库，失败则手动降级 ============ */
export function NewBookmarkDialog({
  open,
  initialUrl,
  categories,
  tags,
  collections,
  onClose,
  onCreate,
}: {
  open: boolean;
  initialUrl: string;
  categories: Category[];
  tags: Tag[];
  collections: Collection[];
  onClose: () => void;
  onCreate: (b: Omit<Bookmark, 'id' | 'createdAt' | 'lastVisitedAt' | 'visitCount' | 'spark'>) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<'input' | 'analyzing' | 'review'>('input');
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<'metadata' | 'manual' | null>(null);
  const [chosenTags, setChosenTags] = useState<string[]>([]);
  const [chosenCategory, setChosenCategory] = useState<string>('');
  const [chosenCollections, setChosenCollections] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setTitle('');
      setStage('input');
      setFallbackMessage(null);
      setAnalysisSource(null);
      setChosenTags([]);
      setChosenCategory('');
      setChosenCollections([]);
      setNotes('');
      setDescription('');
    }
  }, [open, initialUrl]);

  const runAnalysis = async () => {
    setStage('analyzing');
    setFallbackMessage(null);
    // REQ-006-AC-001：进入分析/确认，确认前不调用 onCreate。
    const result = await resolveBookmarkAnalysis({
      url,
      titleHint: title,
      fetchMetadata: fetchBookmarkMetadata,
    });
    setTitle(result.preview.title);
    setDescription(result.preview.description);
    setFallbackMessage(result.fallbackMessage);
    setAnalysisSource(result.source);
    if (result.preview.suggestedCategoryId) {
      setChosenCategory(result.preview.suggestedCategoryId);
    }
    setChosenTags(result.preview.suggestedTags);
    setStage('review');
  };

  const submit = () => {
    const domain = url.replace(/^https?:\/\//, '').split('/')[0] || 'unknown';
    const glyph = domain[0]?.toUpperCase() ?? '?';
    // REQ-006-AC-004：仅在用户确认保存时创建。
    onCreate({
      title: title.trim() || domain,
      url: url.trim(),
      domain,
      favicon: glyph,
      faviconColor: 'blue',
      description: description.trim(),
      notes,
      tags: chosenTags,
      categoryId: chosenCategory,
      collectionIds: chosenCollections,
      starred: false,
      pinned: false,
      thumbnail: 'blue',
      health: 'ok',
      aiSummary: '',
      aiSuggestedTags: [],
    });
    onClose();
  };

  const cat = categories.find((c) => c.id === chosenCategory);

  return (
    <Modal open={open} onClose={onClose} width="max-w-[520px]" aria-label="New Bookmark">
      <ModalHeader
        icon="Plus"
        title="New Bookmark"
        subtitle="Paste a URL, review the preview, then save"
        onClose={onClose}
      />

      {stage === 'input' && (
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">URL</label>
            <div className="flex items-center gap-2 rounded-lg bg-ink-800/60 hairline px-3 py-2.5">
              <Icon name="Link" size={14} className="text-ink-400" />
              <input
                autoFocus
                aria-label="Bookmark URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) void runAnalysis(); }}
                placeholder="https://…"
                className="flex-1 bg-transparent text-[13px] text-ink-100 placeholder:text-ink-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">
              Title <span className="text-ink-500">(optional)</span>
            </label>
            <input
              aria-label="Bookmark title hint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon="Search" onClick={() => void runAnalysis()} disabled={!url.trim()}>
              Analyze
            </Button>
          </div>
        </div>
      )}

      {stage === 'analyzing' && (
        <div className="p-7 space-y-4" role="status" aria-label="Analyzing bookmark">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-accent-500/30" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-400 animate-spin" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-ink-100">Fetching page metadata…</div>
              <div className="text-[11px] text-ink-400 truncate max-w-[300px]">{url}</div>
            </div>
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div className="max-h-[64vh] overflow-y-auto scroll-thin">
          <div className="p-5 space-y-4">
            {fallbackMessage && (
              <div
                role="alert"
                className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200"
              >
                {fallbackMessage}
              </div>
            )}
            {analysisSource === 'metadata' && (
              <div className="text-[11px] text-mint-400">Metadata loaded. Review and save when ready.</div>
            )}

            <div className="flex items-center gap-3 rounded-mac-lg bg-ink-800/60 hairline p-3">
              <Favicon glyph={(url.replace(/^https?:\/\//, '')[0] ?? '?').toUpperCase()} color="blue" size={36} />
              <div className="min-w-0 flex-1">
                <input
                  aria-label="Bookmark title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-[13px] font-semibold text-ink-100 outline-none"
                />
                <div className="text-[11px] text-ink-400 truncate">{url}</div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">Description</label>
              <textarea
                aria-label="Bookmark description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a short description"
                rows={2}
                className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.filter((c) => !c.parentId).map((c) => {
                  const on = chosenCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChosenCategory(c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
                        on ? 'border-accent-400/40 bg-accent-500/15 text-ink-100' : 'border-ink-600/50 text-ink-400'
                      }`}
                    >
                      <Icon name={c.icon} size={12} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
              {cat && (
                <div className="mt-2 text-[11px] text-ink-400">Selected: {cat.name}</div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const on = chosenTags.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => setChosenTags((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))}>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${on ? `${tagColors[t.color].border} ${tagColors[t.color].bg} ${tagColors[t.color].text}` : 'border-ink-600/50 text-ink-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tagColors[t.color].dot}`} />
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">Collections</label>
              <div className="flex flex-wrap gap-1.5">
                {collections.map((c) => {
                  const on = chosenCollections.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => setChosenCollections((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${on ? `${tagColors[c.color].border} ${tagColors[c.color].bg} ${tagColors[c.color].text}` : 'border-ink-600/50 text-ink-400'}`}>
                        {c.emoji} {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">Notes</label>
              <textarea
                aria-label="Bookmark notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why save this?"
                rows={3}
                className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring resize-none"
              />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setStage('input')}>Back</Button>
            <Button variant="primary" icon="Check" onClick={submit}>
              Save bookmark
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ============ Insights Report Dialog (AI Feature 5) ============ */
export function InsightsDialog({
  open,
  insights,
  bookmarks,
  onClose,
  onAction,
}: {
  open: boolean;
  insights: AIInsight[];
  bookmarks: Bookmark[];
  onClose: () => void;
  onAction: (insight: AIInsight) => void;
}) {
  const recent = bookmarks.filter((b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86400000);
  const byCat: Record<string, number> = {};
  recent.forEach((b) => (byCat[b.categoryId] = (byCat[b.categoryId] ?? 0) + 1));
  const catBars = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = Math.max(...catBars.map((x) => x[1]), 1);

  return (
    <Modal open={open} onClose={onClose} width="max-w-[600px]" aria-label="Insights">
      <ModalHeader icon="Sparkles" title="收藏洞察报告" subtitle="AI 基于你近期的收藏行为生成" onClose={onClose} />
      <div className="max-h-[68vh] overflow-y-auto scroll-thin p-5 space-y-3">
        {/* summary stat band */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-mac bg-accent-500/10 border border-accent-400/20 p-3">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide">本周新增</div>
            <div className="text-[22px] font-bold text-ink-100 tabular-nums leading-tight">{recent.length}</div>
            <div className="text-[10px] text-accent-300 mt-0.5">较上周 +3</div>
          </div>
          <div className="rounded-mac bg-violet2-500/10 border border-violet2-400/20 p-3">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide">活跃主题</div>
            <div className="text-[22px] font-bold text-ink-100 tabular-nums leading-tight">5</div>
            <div className="text-[10px] text-violet2-400 mt-0.5">设计灵感最活跃</div>
          </div>
          <div className="rounded-mac bg-mint-500/10 border border-mint-400/20 p-3">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide">总访问</div>
            <div className="text-[22px] font-bold text-ink-100 tabular-nums leading-tight">{bookmarks.reduce((s, b) => s + b.visitCount, 0)}</div>
            <div className="text-[10px] text-mint-400 mt-0.5">React 文档居首</div>
          </div>
        </div>

        {/* category distribution */}
        <div className="rounded-mac-lg bg-ink-800/50 hairline p-4">
          <div className="text-[12px] font-semibold text-ink-100 mb-3">本周新增分布</div>
          <div className="space-y-2">
            {catBars.map(([catId, n]) => {
              const cat = catId;
              return (
                <div key={catId} className="flex items-center gap-3">
                  <span className="text-[11px] text-ink-300 w-20 truncate">{cat}</span>
                  <div className="flex-1 h-2 rounded-full bg-ink-700/60 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-mint-500 transition-all" style={{ width: `${(n / maxCat) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-ink-400 tabular-nums w-6 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* insight cards */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AIBadge label="AI 洞察" />
            <span className="text-[11px] text-ink-400">{insights.length} 条建议</span>
          </div>
          {insights.map((ins, idx) => {
            const c = tagColors[ins.accent];
            return (
              <AnimateIn key={ins.id} delay={idx * 60}>
                <div className={`rounded-mac-lg ${c.soft} border ${c.border} p-3.5`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                      <Icon name={ins.icon} size={15} className={c.text} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink-100 leading-snug">{ins.title}</div>
                      <p className="text-[11px] text-ink-300 mt-1 leading-relaxed">{ins.detail}</p>
                      {ins.action && (
                        <button onClick={() => onAction(ins)} className={`mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium ${c.text} hover:brightness-125 transition`}>
                          {ins.action}
                          <Icon name="ArrowRight" size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 text-[10px] text-ink-500">
          <span>报告于 {new Date().toLocaleDateString('zh-CN')} 生成</span>
          <span className="flex items-center gap-1"><Kbd>esc</Kbd> 关闭</span>
        </div>
      </div>
    </Modal>
  );
}

/* ============ Health Scan Dialog (AI Feature 4) ============ */
export function HealthDialog({
  open,
  bookmarks,
  onClose,
}: {
  open: boolean;
  bookmarks: Bookmark[];
  onClose: () => void;
}) {
  const changed = bookmarks.filter((b) => b.health === 'changed');
  const ok = bookmarks.filter((b) => b.health === 'ok');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runScan = () => {
    setScanning(true);
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); setScanning(false); return 100; }
        return p + 8;
      });
    }, 120);
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-[520px]" aria-label="Health check">
      <ModalHeader icon="ShieldCheck" title="链接健康检测" subtitle="AI 定期检测链接是否失效或内容变更" onClose={onClose} />
      <div className="p-5 space-y-4">
        {/* scan control */}
        <div className="rounded-mac-lg bg-ink-800/50 hairline p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-semibold text-ink-100">全量扫描</div>
              <div className="text-[11px] text-ink-400 mt-0.5">检测 {bookmarks.length} 个收藏的链接状态与内容快照差异</div>
            </div>
            <Button variant="primary" size="sm" icon={scanning ? '' : 'RefreshCw'} onClick={runScan} disabled={scanning}>
              {scanning ? '扫描中…' : '开始扫描'}
            </Button>
          </div>
          {(scanning || progress > 0) && (
            <div className="h-1.5 rounded-full bg-ink-700/60 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-mint-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* status summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-mac bg-mint-500/10 border border-mint-400/20 p-3 text-center">
            <div className="text-[20px] font-bold text-mint-400 tabular-nums">{ok.length}</div>
            <div className="text-[10px] text-ink-400 mt-0.5">正常</div>
          </div>
          <div className="rounded-mac bg-amber-500/10 border border-amber-400/20 p-3 text-center">
            <div className="text-[20px] font-bold text-amber-400 tabular-nums">{changed.length}</div>
            <div className="text-[10px] text-ink-400 mt-0.5">内容更新</div>
          </div>
          <div className="rounded-mac bg-coral-500/10 border border-coral-400/20 p-3 text-center">
            <div className="text-[20px] font-bold text-coral-400 tabular-nums">0</div>
            <div className="text-[10px] text-ink-400 mt-0.5">失效</div>
          </div>
        </div>

        {/* changed list */}
        {changed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="RefreshCw" size={12} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-ink-100">内容已更新</span>
              <span className="text-[10px] text-ink-400">建议复访</span>
            </div>
            <div className="space-y-1.5">
              {changed.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-lg bg-ink-800/50 hairline p-2.5">
                  <Favicon glyph={b.favicon} color={b.faviconColor} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-ink-100 truncate">{b.title}</div>
                    <div className="text-[10px] text-ink-400 truncate">{b.domain}</div>
                  </div>
                  <span className="text-[10px] text-amber-400">页面结构有变化</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-violet2-500/10 border border-violet2-400/20">
          <AIBadge label="AI 提示" />
          <span className="text-[11px] text-ink-300">下次自动扫描计划于明日 09:00，结果将推送至通知中心。</span>
        </div>
      </div>
    </Modal>
  );
}
