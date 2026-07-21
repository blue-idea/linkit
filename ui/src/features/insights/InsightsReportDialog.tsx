import { useEffect, useMemo } from 'react';
import type { LibraryInsight, InsightAction } from './index';
import { buildInsightsReportSummary, type InsightsReportBookmark, type InsightsReportCategory, type InsightsReportCollection } from './report-summary';
import { useI18n } from '../../i18n/use-i18n';
import type { I18nApi } from '../../i18n';
import { tagColors } from '../../colors';
import type { TagColor } from '../../types';
import { AIBadge, AnimateIn, Icon, Kbd } from '../../components/ui';

function insightIcon(action: InsightAction): string {
  switch (action.type) {
    case 'health-filter': return action.status === 'changed' ? 'RefreshCw' : 'AlertTriangle';
    case 'collection': return 'Sparkles';
    case 'tag-filter': return 'TrendingUp';
    case 'read-filter': return 'BookOpen';
    case 'new-bookmark': return 'BarChart3';
  }
}

function actionLinkLabel(action: InsightAction, i18n: I18nApi): string {
  switch (action.type) {
    case 'health-filter': return i18n.t('insights.link.health');
    case 'collection': return i18n.t('insights.link.collection');
    case 'tag-filter': return i18n.t('insights.link.tag');
    case 'read-filter': return i18n.t('insights.link.read');
    case 'new-bookmark': return i18n.t('insights.link.new');
  }
}

function formatWeekDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

function accentColor(accent: LibraryInsight['accent']): TagColor {
  return accent === 'violet' ? 'violet' : accent;
}

export function InsightsReportDialog({
  open,
  insights,
  bookmarks,
  categories,
  collections,
  onClose,
  onAction,
}: {
  open: boolean;
  insights: LibraryInsight[];
  bookmarks: InsightsReportBookmark[];
  categories: InsightsReportCategory[];
  collections: InsightsReportCollection[];
  onClose: () => void;
  onAction: (action: InsightAction) => void;
}) {
  const i18n = useI18n();
  const summary = useMemo(
    () => buildInsightsReportSummary({ bookmarks, categories, collections }),
    [bookmarks, categories, collections],
  );
  const maxCategory = Math.max(...summary.weeklyByCategory.map((row) => row.count), 1);
  const weekDelta = summary.addedThisWeek - summary.addedPriorWeek;
  const locale = i18n.getLocale() === 'zh' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
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
        aria-label={i18n.t('insights.title')}
        className="relative w-full max-w-[600px] rounded-mac-xl glass-strong ring-glow overflow-hidden animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <span className="w-9 h-9 rounded-lg bg-ink-700/60 hairline flex items-center justify-center">
            <Icon name="Sparkles" size={17} className="text-ink-100" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-ink-100 leading-tight">{i18n.t('insights.title')}</div>
            <div className="text-[11px] text-ink-400 mt-0.5">{i18n.t('insights.hint')}</div>
          </div>
          <button
            type="button"
            aria-label={i18n.t('insights.close')}
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-ink-700/60 text-ink-400 hover:text-ink-100 flex items-center justify-center transition"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto scroll-thin p-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-mac bg-accent-500/10 border border-accent-400/20 p-3">
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">{i18n.t('insights.metric.addedThisWeek')}</div>
              <div className="text-[22px] font-bold text-ink-100 tabular-nums leading-tight">{summary.addedThisWeek}</div>
              <div className="text-[10px] text-accent-300 mt-0.5">{i18n.t('insights.metric.vsLastWeek', { delta: formatWeekDelta(weekDelta) })}</div>
            </div>
            <div className="rounded-mac bg-violet2-500/10 border border-violet2-400/20 p-3">
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">{i18n.t('insights.metric.activeThemes')}</div>
              <div className="text-[22px] font-bold text-ink-100 tabular-nums leading-tight">{summary.activeCollectionCount}</div>
              <div className="text-[10px] text-violet2-400 mt-0.5 truncate">
                {summary.topCollectionName
                  ? i18n.t('insights.metric.topTheme', { name: summary.topCollectionName })
                  : i18n.t('insights.metric.noActiveTheme')}
              </div>
            </div>
            <div className="rounded-mac bg-mint-500/10 border border-mint-400/20 p-3">
              <div className="text-[10px] text-ink-400 uppercase tracking-wide">{i18n.t('insights.metric.totalVisits')}</div>
              <div className="text-[22px] font-bold text-ink-100 tabular-nums leading-tight">{summary.totalVisits}</div>
              <div className="text-[10px] text-mint-400 mt-0.5 truncate">
                {summary.topVisitedTitle
                  ? i18n.t('insights.metric.topVisit', { title: summary.topVisitedTitle })
                  : i18n.t('insights.metric.noVisits')}
              </div>
            </div>
          </div>

          <div className="rounded-mac-lg bg-ink-800/50 hairline p-4">
            <div className="text-[12px] font-semibold text-ink-100 mb-3">{i18n.t('insights.distribution')}</div>
            <div className="space-y-2 min-h-[2rem]">
              {summary.weeklyByCategory.map((row) => (
                <div key={row.categoryId} className="flex items-center gap-3">
                  <span className="text-[11px] text-ink-300 w-20 truncate">{row.categoryName}</span>
                  <div className="flex-1 h-2 rounded-full bg-ink-700/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-mint-500 transition-all"
                      style={{ width: `${(row.count / maxCategory) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-ink-400 tabular-nums w-6 text-right">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <AIBadge label={i18n.t('insights.sectionTitle')} />
              <span className="text-[11px] text-ink-400">{i18n.t('insights.suggestions', { count: insights.length })}</span>
            </div>
            {insights.map((insight, index) => {
              const palette = tagColors[accentColor(insight.accent)];
              return (
                <AnimateIn key={insight.id} delay={index * 60}>
                  <article className={`rounded-mac-lg ${palette.soft} border ${palette.border} p-3.5`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-lg ${palette.bg} flex items-center justify-center shrink-0`}>
                        <Icon name={insightIcon(insight.action)} size={15} className={palette.text} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-semibold text-ink-100 leading-snug">
                          {i18n.t(insight.titleKey, insight.titleParams)}
                        </h3>
                        <p className="text-[11px] text-ink-300 mt-1 leading-relaxed">
                          {i18n.t(insight.detailKey, insight.detailParams)}
                        </p>
                        <p className="sr-only">
                          {i18n.t(insight.metric.labelKey)}: {insight.metric.value}. {i18n.t('insights.evidence', { evidence: insight.evidence.join(' · ') })}
                        </p>
                        <button
                          type="button"
                          aria-label={actionLinkLabel(insight.action, i18n)}
                          data-action-type={insight.action.type}
                          onClick={() => onAction(insight.action)}
                          className={`mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium ${palette.text} hover:brightness-125 transition`}
                        >
                          {actionLinkLabel(insight.action, i18n)}
                          <Icon name="ArrowRight" size={11} />
                        </button>
                      </div>
                    </div>
                  </article>
                </AnimateIn>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 text-[10px] text-ink-500">
            <span>{i18n.t('insights.footer.generated', { date: new Date().toLocaleDateString(locale) })}</span>
            <span className="flex items-center gap-1"><Kbd>esc</Kbd> {i18n.t('insights.footer.closeHint')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
