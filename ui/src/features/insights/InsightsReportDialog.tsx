import type { LibraryInsight, InsightAction } from './index';

function actionLabel(action: InsightAction): string {
  switch (action.type) {
    case 'health-filter': return `Open ${action.status} health view`;
    case 'collection': return 'Open collection';
    case 'tag-filter': return 'Open tag filter';
    case 'read-filter': return `Open ${action.status} filter`;
    case 'new-bookmark': return 'Open new bookmark';
  }
}

export function InsightsReportDialog({ open, insights, onClose, onAction }: {
  open: boolean;
  insights: LibraryInsight[];
  onClose: () => void;
  onAction: (action: InsightAction) => void;
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
    <div role="dialog" aria-modal="true" aria-label="Insights report" className="glass-strong w-full max-w-2xl rounded-mac-xl p-5 ring-glow">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-semibold text-ink-100">Insights report</h2>
        <p className="text-[11px] text-ink-400">Traceable metrics calculated from the current library.</p></div>
        <button aria-label="Close insights report" onClick={onClose} className="text-ink-400">×</button></div>
      <div className="max-h-[68vh] space-y-3 overflow-y-auto">{insights.map((insight) => <article key={insight.id}
        className="rounded-xl bg-ink-800/55 p-4 hairline">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-[13px] font-semibold text-ink-100">{insight.title}</h3>
          <p className="mt-1 text-[11px] text-ink-300">{insight.detail}</p></div>
          <div className="text-right"><div className="text-[20px] font-bold text-ink-100">{insight.metric.value}</div>
            <div className="text-[9px] uppercase text-ink-500">{insight.metric.label}</div></div></div>
        <p className="mt-2 text-[10px] text-ink-500">Evidence: {insight.evidence.join(' · ')}</p>
        <button aria-label={actionLabel(insight.action)} data-action-type={insight.action.type}
          onClick={() => onAction(insight.action)} className="mt-3 rounded-lg bg-accent-500 px-3 py-1.5 text-[11px] font-semibold text-white">
          {actionLabel(insight.action)}
        </button>
      </article>)}</div>
    </div>
  </div>;
}
