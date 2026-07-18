import type { LibraryRecommendation, ThemeGapSuggestion } from './index';

export function ExploreDialog({ recommendations, themeGaps, bookmarkLabels, collectionLabels, onClose, onSelect, onConfirmGap }: {
  recommendations: LibraryRecommendation[];
  themeGaps: ThemeGapSuggestion[];
  bookmarkLabels: Record<string, string>;
  collectionLabels: Record<string, string>;
  onClose: () => void;
  onSelect: (bookmarkId: string) => void;
  onConfirmGap: (collectionId: string, bookmarkId: string) => void;
}) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
    <div role="dialog" aria-modal="true" aria-label="Explore library" className="glass-strong w-full max-w-xl rounded-mac-xl p-5 ring-glow space-y-4">
      <div className="flex justify-between gap-3"><div><h2 className="text-[16px] font-semibold text-ink-100">Explore library</h2>
        <p className="text-[11px] text-ink-400">Recommendations only use bookmarks already in your library.</p></div>
        <button aria-label="Close explore library" onClick={onClose} className="text-ink-400">×</button></div>
      <section><h3 className="text-[12px] font-semibold text-ink-200 mb-2">Related bookmarks</h3>
        <div className="space-y-2">{recommendations.map((item) => <button key={item.bookmarkId}
          onClick={() => onSelect(item.bookmarkId)} className="w-full rounded-lg bg-ink-800/50 p-3 text-left hairline">
          <span className="text-[12px] text-ink-100">{bookmarkLabels[item.bookmarkId]}</span>
          <span className="ml-2 text-[10px] text-ink-400">{item.reasons.join(', ')} · {Math.round(item.score * 100)}%</span>
        </button>)}</div></section>
      <section><h3 className="text-[12px] font-semibold text-ink-200 mb-2">Theme gaps</h3>
        {themeGaps.length === 0 ? <p className="text-[11px] text-ink-400">No theme gaps found.</p> : <div className="space-y-2">{themeGaps.map((gap) => {
          const bookmark = bookmarkLabels[gap.bookmarkId]; const collection = collectionLabels[gap.collectionId];
          return <div key={`${gap.collectionId}:${gap.bookmarkId}`} className="flex items-center justify-between gap-2 rounded-lg bg-ink-800/50 p-3 hairline">
            <span className="text-[11px] text-ink-200">{bookmark} → {collection}</span>
            <button aria-label={`Add ${bookmark} to ${collection}`} onClick={() => onConfirmGap(gap.collectionId, gap.bookmarkId)}
              className="rounded-md bg-accent-500 px-2.5 py-1.5 text-[11px] font-semibold text-white">Add</button>
          </div>;
        })}</div>}
      </section>
    </div>
  </div>;
}
