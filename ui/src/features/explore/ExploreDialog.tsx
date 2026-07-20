import type { LibraryRecommendation, ThemeGapSuggestion } from './index';
import { useI18n } from '../../i18n/use-i18n';
import { Icon, Button, Kbd } from '../../components/ui';

/**
 * 探索资料库对话框：根据库内书签进行智能推荐与主题补缺。
 * 增加了退出出口（点击背景、ESC、底部显式关闭按钮）与精美排版。
 */
export function ExploreDialog({
  recommendations,
  themeGaps,
  bookmarkLabels,
  collectionLabels,
  onClose,
  onSelect,
  onConfirmGap,
}: {
  recommendations: LibraryRecommendation[];
  themeGaps: ThemeGapSuggestion[];
  bookmarkLabels: Record<string, string>;
  collectionLabels: Record<string, string>;
  onClose: () => void;
  onSelect: (bookmarkId: string) => void;
  onConfirmGap: (collectionId: string, bookmarkId: string) => void;
}) {
  const i18n = useI18n();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={i18n.t('explore.title')}
        className="glass-strong w-full max-w-xl rounded-mac-xl p-5 ring-glow flex flex-col max-h-[80vh] overflow-hidden animate-spotlight-in gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start gap-3 pb-1">
          <div>
            <h2 className="text-[16px] font-semibold text-ink-100 flex items-center gap-1.5">
              <Icon name="Compass" size={16} className="text-accent-400" />
              {i18n.t('explore.title')}
            </h2>
            <p className="text-[11px] text-ink-400 mt-0.5">{i18n.t('explore.hint')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon="X"
            onClick={onClose}
            aria-label={i18n.t('explore.close')}
            className="text-ink-400 hover:text-ink-200 -mt-1 -mr-1"
          />
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto scroll-thin pr-1 space-y-4">
          {/* Related Recommendations */}
          <section className="space-y-2">
            <h3 className="text-[12px] font-semibold text-ink-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              {i18n.t('explore.related')}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {recommendations.map((item) => (
                <button
                  key={item.bookmarkId}
                  type="button"
                  onClick={() => onSelect(item.bookmarkId)}
                  className="w-full rounded-lg bg-ink-800/40 hover:bg-ink-700/50 p-3 text-left hairline transition-all flex items-start gap-3 group"
                >
                  <span className="w-7 h-7 rounded-md bg-accent-500/10 text-accent-400 flex items-center justify-center shrink-0 group-hover:bg-accent-500/20 transition">
                    <Icon name="Sparkles" size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-ink-100 group-hover:text-white transition truncate">
                      {bookmarkLabels[item.bookmarkId]}
                    </div>
                    <div className="mt-1.5 text-[10px] text-ink-400 flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-ink-700/50 text-ink-300 hairline">
                        {item.reasons.join(', ')}
                      </span>
                      <span>·</span>
                      <span className="text-accent-400 font-semibold">{i18n.t('explore.match', { score: Math.round(item.score * 100) })}</span>
                    </div>
                  </div>
                  <Icon name="ChevronRight" size={12} className="text-ink-500 group-hover:text-ink-300 transition shrink-0 mt-2" />
                </button>
              ))}
            </div>
          </section>

          {/* Theme Gaps */}
          <section className="space-y-2">
            <h3 className="text-[12px] font-semibold text-ink-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              {i18n.t('explore.gaps')}
            </h3>
            {themeGaps.length === 0 ? (
              <div className="rounded-lg bg-ink-800/20 p-4 text-center hairline">
                <p className="text-[11px] text-ink-500">{i18n.t('explore.noGaps')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {themeGaps.map((gap) => {
                  const bookmark = bookmarkLabels[gap.bookmarkId];
                  const collection = collectionLabels[gap.collectionId];
                  return (
                    <div
                      key={`${gap.collectionId}:${gap.bookmarkId}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-ink-800/40 p-3 hairline"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2 text-[11px]">
                        <span className="text-ink-200 font-medium truncate max-w-[45%]" title={bookmark}>
                          {bookmark}
                        </span>
                        <Icon name="ArrowRight" size={10} className="text-ink-500 shrink-0" />
                        <span className="text-accent-400 font-semibold truncate max-w-[45%]" title={collection}>
                          {collection}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={i18n.t('explore.addTo', { bookmark, collection })}
                        onClick={() => onConfirmGap(gap.collectionId, gap.bookmarkId)}
                        className="rounded-md bg-accent-600 hover:bg-accent-500 px-3 py-1.5 text-[11px] font-semibold text-white transition shadow-sm shrink-0 flex items-center gap-1 focus-ring"
                      >
                        <Icon name="Plus" size={10} />
                        {i18n.t('common.add')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <Kbd>esc</Kbd>
            <span>{i18n.t('spotlight.close')}</span>
          </span>
          <Button
            variant="subtle"
            size="sm"
            onClick={onClose}
            className="text-[11px] px-4 font-medium"
          >
            {i18n.t('spotlight.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
