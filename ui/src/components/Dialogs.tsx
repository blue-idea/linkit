import { useEffect, useState } from 'react';
import type { Bookmark, Category, Collection, Tag, AIInsight } from '../types';
import { fetchBookmarkMetadata, resolveNewBookmarkCategoryId, shouldApplyAiCategorySuggestion } from '../features/bookmarks';
import {
  initialIconEditorForNewBookmark,
  resolveIconEditorIcon,
  type BookmarkIconEditorValue,
} from '../features/bookmarks/bookmark-icon-editor-model';
import { BookmarkIconEditor } from '../features/bookmarks/BookmarkIconEditor';
import {
  applyReanalyzeConfirmation,
  buildInboundAnalysis,
  mapAIFailureMessage,
  wailsAnalyzeClient,
  type AIContext,
} from '../features/ai';
import { isBookmarkUrlDuplicate, normalizeBookmarkUrl } from '../domain/commands';
import { Icon, Favicon, AIBadge, Button, Kbd, AnimateIn } from './ui';
import { tagColors } from '../colors';
import { useI18n } from '../i18n/use-i18n';

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

function mapSuggestedLabelsToTagIds(labels: string[], tags: Tag[]): string[] {
  const byLabel = new Map(tags.map((tag) => [tag.label.trim().toLowerCase(), tag.id]));
  const ids: string[] = [];
  for (const label of labels) {
    const id = byLabel.get(label.trim().toLowerCase());
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/* ============ New Bookmark Dialog：分析确认后入库，失败则手动降级 ============ */
export function NewBookmarkDialog({
  open,
  initialUrl,
  activeCategoryId = null,
  bookmarks,
  categories,
  tags,
  collections,
  aiContext,
  onClose,
  onCreate,
}: {
  open: boolean;
  initialUrl: string;
  /** 主界面当前分类视图 ID；有值时锁定归属并禁止 AI/手动改类。 */
  activeCategoryId?: string | null;
  bookmarks: Pick<Bookmark, 'url'>[];
  categories: Category[];
  tags: Tag[];
  collections: Collection[];
  aiContext: AIContext | null;
  onClose: () => void;
  onCreate: (b: Omit<Bookmark, 'id' | 'createdAt' | 'lastVisitedAt' | 'visitCount' | 'spark'>) => void;
}) {
  const i18n = useI18n();
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<'input' | 'analyzing' | 'review'>('input');
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<'ai' | 'metadata' | 'manual' | null>(null);
  const [chosenTags, setChosenTags] = useState<string[]>([]);
  const [chosenCategory, setChosenCategory] = useState<string>('');
  const [chosenCollections, setChosenCollections] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [pendingTagLabels, setPendingTagLabels] = useState<string[]>([]);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [iconEditor, setIconEditor] = useState<BookmarkIconEditorValue>({
    mode: 'text',
    siteFaviconUrl: null,
    siteFaviconPreview: null,
    glyphOverride: '',
    faviconColor: 'blue',
  });
  const categoryLocked = Boolean(activeCategoryId?.trim());

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setTitle('');
      setStage('input');
      setFallbackMessage(null);
      setAnalysisSource(null);
      setChosenTags([]);
      // 分类视图下预填并锁定当前分类。
      setChosenCategory(activeCategoryId?.trim() ?? '');
      setChosenCollections([]);
      setNotes('');
      setDescription('');
      setAiSummary('');
      setPendingTagLabels([]);
      setUrlWarning(null);
      setFaviconUrl(null);
      setIconEditor({
        mode: 'text',
        siteFaviconUrl: null,
        siteFaviconPreview: null,
        glyphOverride: '',
        faviconColor: 'blue',
      });
    }
  }, [open, initialUrl, activeCategoryId]);

  const runAnalysis = async () => {
    const normalized = normalizeBookmarkUrl(url);
    // REQ-006-AC-005：重复 URL 在输入阶段弹出 warning，并阻止进入分析/确认步骤。
    if (normalized.ok && isBookmarkUrlDuplicate(bookmarks, normalized.url)) {
      setUrlWarning(i18n.t('bookmark.urlDuplicate'));
      setStage('input');
      return;
    }
    setStage('analyzing');
    setFallbackMessage(null);
    setUrlWarning(null);
    // REQ-006-AC-001 / REQ-006-AC-002：进入分析/确认，确认前不调用 onCreate。
    const context: AIContext = aiContext ?? {
      apiBase: 'https://api.example.test/v1',
      model: 'unavailable',
      locale: 'en',
    };
    const result = await buildInboundAnalysis({
      url,
      titleHint: title,
      contentText: '',
      categoryCandidates: categories.map((category) => ({ id: category.id, name: category.name })),
      tagCandidates: tags.map((tag) => ({ id: tag.id, label: tag.label })),
      context,
      client: wailsAnalyzeClient,
      fetchMetadata: fetchBookmarkMetadata,
    });
    setTitle(result.preview.title);
    setDescription(result.preview.description);
    setAiSummary(result.preview.aiSummary);
    const alerts = [result.metadataErrorMessage, result.aiErrorMessage].filter(Boolean);
    setFallbackMessage(alerts.length > 0 ? alerts.join(' ') : null);
    setAnalysisSource(result.source);
    if (
      shouldApplyAiCategorySuggestion(activeCategoryId) &&
      result.preview.suggestedCategoryId
    ) {
      setChosenCategory(result.preview.suggestedCategoryId);
    }
    const matched = mapSuggestedLabelsToTagIds(result.preview.suggestedTags, tags);
    setChosenTags(matched);
    setPendingTagLabels(
      result.preview.suggestedTags.filter(
        (label) => !tags.some((tag) => tag.label.trim().toLowerCase() === label.trim().toLowerCase())
      )
    );
    setFaviconUrl(result.preview.faviconUrl);
    setIconEditor(
      initialIconEditorForNewBookmark({
        url,
        faviconUrl: result.preview.faviconUrl,
        faviconDataUrl: result.preview.faviconDataUrl,
      })
    );
    setStage('review');
  };

  const submit = () => {
    const domain = url.replace(/^https?:\/\//, '').split('/')[0] || 'unknown';
    const icon = resolveIconEditorIcon({ url, title, value: iconEditor });
    // REQ-006-AC-004：仅在用户确认保存时创建。
    onCreate({
      title: title.trim() || domain,
      url: url.trim(),
      domain,
      favicon: icon.favicon,
      faviconColor: icon.faviconColor,
      description: description.trim(),
      notes,
      tags: chosenTags,
      categoryId: resolveNewBookmarkCategoryId({
        activeCategoryId,
        selectedCategoryId: chosenCategory,
      }),
      collectionIds: chosenCollections,
      starred: false,
      pinned: false,
      thumbnail: 'blue',
      health: 'ok',
      aiSummary: aiSummary.trim(),
      aiSuggestedTags: [],
    });
    onClose();
  };

  const cat = categories.find((c) => c.id === chosenCategory);

  return (
    <Modal open={open} onClose={onClose} width="max-w-[520px]" aria-label={i18n.t('bookmark.new.title')}>
      <ModalHeader
        icon="Plus"
        title={i18n.t('bookmark.new.title')}
        subtitle={i18n.t('bookmark.new.subtitle')}
        onClose={onClose}
      />

      {stage === 'input' && (
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.urlLabel')}</label>
            <div className="flex items-center gap-2 rounded-lg bg-ink-800/60 hairline px-3 py-2.5">
              <Icon name="Link" size={14} className="text-ink-400" />
              <input
                autoFocus
                aria-label={i18n.t('bookmark.urlInput')}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlWarning(null);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) void runAnalysis(); }}
                placeholder="https://…"
                className="flex-1 bg-transparent text-[13px] text-ink-100 placeholder:text-ink-500 outline-none"
              />
            </div>
            {urlWarning && (
              <div
                role="alert"
                className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200"
              >
                {urlWarning}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">
              {i18n.t('bookmark.title')} <span className="text-ink-500">({i18n.t('common.optional')})</span>
            </label>
            <input
              aria-label={i18n.t('bookmark.titleHint')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={i18n.t('bookmark.pageTitle')}
              className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>{i18n.t('common.cancel')}</Button>
            <Button variant="primary" icon="Search" onClick={() => void runAnalysis()} disabled={!url.trim()}>
              {i18n.t('bookmark.analyze')}
            </Button>
          </div>
        </div>
      )}

      {stage === 'analyzing' && (
        <div className="p-7 space-y-4" role="status" aria-label={i18n.t('bookmark.analyzing')}>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-accent-500/30" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-400 animate-spin" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-ink-100">{i18n.t('bookmark.fetchingMetadata')}</div>
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
            {analysisSource === 'ai' && (
              <div className="text-[11px] text-mint-400">{i18n.t('bookmark.aiReady')}</div>
            )}
            {analysisSource === 'metadata' && (
              <div className="text-[11px] text-mint-400">{i18n.t('bookmark.metadataReady')}</div>
            )}

            <BookmarkIconEditor
              url={url}
              title={title}
              value={{
                ...iconEditor,
                siteFaviconUrl: iconEditor.siteFaviconUrl ?? faviconUrl,
                siteFaviconPreview:
                  iconEditor.siteFaviconPreview ??
                  iconEditor.siteFaviconUrl ??
                  faviconUrl,
              }}
              onChange={setIconEditor}
            />

            <div className="rounded-mac-lg bg-ink-800/60 hairline p-3">
              <div className="min-w-0">
                <input
                  aria-label={i18n.t('bookmark.titleInput')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-[13px] font-semibold text-ink-100 outline-none"
                />
                <div className="text-[11px] text-ink-400 truncate">{url}</div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.description')}</label>
              <textarea
                aria-label={i18n.t('bookmark.descriptionInput')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={i18n.t('bookmark.descriptionPlaceholder')}
                rows={2}
                className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.aiSummary')}</label>
              <textarea
                aria-label={i18n.t('bookmark.aiSummary')}
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                placeholder={i18n.t('bookmark.summaryPlaceholder')}
                rows={2}
                className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.category')}</label>
              {categoryLocked ? (
                <div className="rounded-lg bg-ink-800/60 hairline px-3 py-2.5 text-[12px] text-ink-100 inline-flex items-center gap-1.5">
                  {cat ? <Icon name={cat.icon} size={12} /> : null}
                  {cat?.name ?? i18n.t('bookmark.currentCategory')}
                  <span className="text-[10px] text-ink-500 ml-1">({i18n.t('bookmark.lockedCategory')})</span>
                </div>
              ) : (
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
              )}
              {cat && !categoryLocked && (
                <div className="mt-2 text-[11px] text-ink-400">{i18n.t('bookmark.selectedCategory', { name: cat.name })}</div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.tags')}</label>
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
                {pendingTagLabels.map((label) => (
                  <span
                    key={`pending-${label}`}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet2-400/40 text-[11px] text-violet2-400 px-2 py-0.5"
                  >
                    <AIBadge label="" /> {label}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.collections')}</label>
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
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.notes')}</label>
              <textarea
                aria-label={i18n.t('bookmark.notesInput')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={i18n.t('bookmark.notesHint')}
                rows={3}
                className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring resize-none"
              />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setStage('input')}>{i18n.t('common.back')}</Button>
            <Button variant="primary" icon="Check" onClick={submit}>
              {i18n.t('bookmark.save')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ============ Reanalyze Bookmark Dialog：预览确认后才写入 ============ */
export function ReanalyzeBookmarkDialog({
  open,
  bookmark,
  tags,
  categories,
  aiContext,
  onClose,
  onApply,
  onCreateTag,
}: {
  open: boolean;
  bookmark: Bookmark | null;
  tags: Tag[];
  categories: Category[];
  aiContext: AIContext | null;
  onClose: () => void;
  onApply: (patch: Partial<Bookmark>) => void;
  onCreateTag: (label: string) => string | null;
}) {
  const i18n = useI18n();
  const [stage, setStage] = useState<'idle' | 'loading' | 'preview' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [acceptedLabels, setAcceptedLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setStage('idle');
      setErrorMessage(null);
      setDescription('');
      setSummary('');
      setSuggestedTags([]);
      setAcceptedLabels([]);
    }
  }, [open]);

  const runReanalyze = async () => {
    if (!bookmark) {
      return;
    }
    setStage('loading');
    setErrorMessage(null);
    const context: AIContext = aiContext ?? {
      apiBase: 'https://api.example.test/v1',
      model: 'unavailable',
      locale: 'en',
    };
    try {
      const result = await (wailsAnalyzeClient.reanalyzeBookmark ?? wailsAnalyzeClient.analyzeBookmark)({
        context,
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description || '',
        contentText: bookmark.description || bookmark.notes || '',
        categoryCandidates: categories.map((category) => ({ id: category.id, name: category.name })),
        tagCandidates: tags.map((tag) => ({ id: tag.id, label: tag.label })),
      });
      // REQ-020-AC-001：仅展示预览，确认前不调用 onApply。
      setDescription(result.description.trim() || bookmark.description || '');
      setSummary(result.summary);
      setSuggestedTags(result.suggestedTags);
      setAcceptedLabels(result.suggestedTags);
      setStage('preview');
    } catch (error) {
      const record = error as { code?: string; message?: string };
      setErrorMessage(mapAIFailureMessage(record));
      setStage('error');
    }
  };

  useEffect(() => {
    if (open && bookmark && stage === 'idle') {
      void runReanalyze();
    }
    // 仅在打开时触发一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookmark?.id]);

  const confirm = () => {
    if (!bookmark) {
      return;
    }
    const resolveTagId = (label: string): string | null => {
      const existing = tags.find((tag) => tag.label.trim().toLowerCase() === label.trim().toLowerCase());
      if (existing) {
        return existing.id;
      }
      if (!acceptedLabels.includes(label)) {
        return null;
      }
      return onCreateTag(label);
    };
    const patch = applyReanalyzeConfirmation({
      bookmark: {
        id: bookmark.id,
        title: bookmark.title,
        description: bookmark.description,
        aiSummary: bookmark.aiSummary,
        tags: bookmark.tags,
        aiSuggestedTags: bookmark.aiSuggestedTags ?? [],
      },
      preview: { description, summary, suggestedTags },
      confirmed: true,
      acceptedTagLabels: acceptedLabels,
      resolveTagId,
    });
    if (patch) {
      // REQ-020-AC-002：确认后写入摘要、描述与采纳标签。
      onApply(patch);
    }
    onClose();
  };

  const reject = () => {
    applyReanalyzeConfirmation({
      bookmark: {
        id: bookmark?.id ?? '',
        title: bookmark?.title ?? '',
        description: bookmark?.description,
        aiSummary: bookmark?.aiSummary,
        tags: bookmark?.tags ?? [],
        aiSuggestedTags: bookmark?.aiSuggestedTags ?? [],
      },
      preview: { description, summary, suggestedTags },
      confirmed: false,
      acceptedTagLabels: [],
      resolveTagId: () => null,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-lg" aria-label={i18n.t('bookmark.reanalyze.title')}>
      <ModalHeader
        icon="Sparkles"
        title={i18n.t('bookmark.reanalyze')}
        subtitle={i18n.t('bookmark.reanalyze.subtitle')}
        onClose={onClose}
      />
      {stage === 'loading' && (
        <div className="p-7" role="status" aria-label={i18n.t('bookmark.reanalyzing')}>
          <div className="text-[14px] font-semibold text-ink-100">{i18n.t('bookmark.generatingPreview')}</div>
        </div>
      )}
      {stage === 'error' && (
        <div className="p-5 space-y-4">
          <div role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
            {errorMessage}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>{i18n.t('common.close')}</Button>
          </div>
        </div>
      )}
      {stage === 'preview' && (
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.suggestedDescription')}</label>
            <textarea
              aria-label={i18n.t('bookmark.reanalyze.descriptionLabel')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 px-3 py-2.5 outline-none focus-ring resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.suggestedSummary')}</label>
            <textarea
              aria-label={i18n.t('bookmark.reanalyze.summaryLabel')}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-100 px-3 py-2.5 outline-none focus-ring resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">{i18n.t('bookmark.suggestedTags')}</label>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTags.map((label) => {
                const on = acceptedLabels.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setAcceptedLabels((prev) =>
                        on ? prev.filter((item) => item !== label) : [...prev, label]
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                      on
                        ? 'border-violet2-400/40 bg-violet2-500/15 text-violet2-200'
                        : 'border-ink-600/50 text-ink-400'
                    }`}
                  >
                    <AIBadge label="" /> {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reject}>{i18n.t('bookmark.reject')}</Button>
            <Button variant="primary" icon="Check" onClick={confirm}>{i18n.t('common.confirm')}</Button>
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
