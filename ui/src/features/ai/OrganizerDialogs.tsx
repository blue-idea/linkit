import { useState } from 'react';
import { Button, Icon } from '../../components/ui';
import type { CollectionSuggestion } from './collections';
import type { DuplicatePreview } from './duplicates';
import { useI18n } from '../../i18n/use-i18n';

function Shell({
  label,
  children,
  onClose,
  width = 'max-w-xl',
}: {
  label: string;
  children: React.ReactNode;
  onClose?: () => void;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`glass-strong w-full ${width} rounded-mac-xl border border-white/10 p-5 ring-glow space-y-4 shadow-win`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

const inputClass =
  'mt-1 w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring';

/** AI 创建主题前的目标输入对话框，替换原生 window.prompt。 */
export function AICollectionGoalDialog({
  onCancel,
  onSubmit,
  submitting = false,
}: {
  onCancel: () => void;
  onSubmit: (goal: string) => void;
  submitting?: boolean;
}) {
  const i18n = useI18n();
  const [goal, setGoal] = useState('');
  const trimmed = goal.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(trimmed);
  };

  return (
    <Shell label={i18n.t('ai.collection.title')} onClose={onCancel} width="max-w-md">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15">
          <Icon name="Sparkles" size={16} className="text-accent-300" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink-100">{i18n.t('ai.collection.title')}</h2>
          <p className="mt-1 text-[11px] text-ink-400">
            {i18n.t('ai.collection.goalHint')}
          </p>
        </div>
      </div>
      <label className="block text-[11px] font-medium text-ink-300">
        {i18n.t('ai.collection.goal')}
        <textarea
          aria-label={i18n.t('ai.collection.goal')}
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder={i18n.t('ai.collection.goalPlaceholder')}
          className={`${inputClass} resize-none`}
          autoFocus
          disabled={submitting}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          {i18n.t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={submit} disabled={!canSubmit}>
          {submitting ? i18n.t('ai.collection.generating') : i18n.t('ai.collection.generate')}
        </Button>
      </div>
    </Shell>
  );
}

export function AICollectionPreviewDialog({ preview, bookmarks, onCancel, onConfirm }: {
  preview: CollectionSuggestion;
  bookmarks: Array<{ id: string; title: string }>;
  onCancel: () => void;
  onConfirm: (value: CollectionSuggestion & { acceptedBookmarkIds: string[] }) => void;
}) {
  const i18n = useI18n();
  const [name, setName] = useState(preview.name);
  const [description, setDescription] = useState(preview.description);
  const [accepted, setAccepted] = useState(preview.bookmarkIds);
  return (
    <Shell label={i18n.t('ai.collection.previewTitle')} onClose={onCancel}>
      <div>
        <h2 className="text-[16px] font-semibold text-ink-100">{i18n.t('ai.collection.previewTitle')}</h2>
        <p className="text-[11px] text-ink-400">
          {i18n.t('ai.collection.previewHint')}
        </p>
      </div>
      <label className="block text-[11px] font-medium text-ink-300">
        {i18n.t('collection.name')}
        <input
          aria-label={i18n.t('collection.name')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block text-[11px] font-medium text-ink-300">
        {i18n.t('collection.description')}
        <textarea
          aria-label={i18n.t('collection.description')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={`${inputClass} resize-none`}
          rows={3}
        />
      </label>
      <div className="text-[11px] text-ink-300">
        {i18n.t('ai.collection.suggestedTags', {
          tags: preview.suggestedTags.join(', ') || i18n.t('common.none'),
        })}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-[11px] font-medium text-ink-300">{i18n.t('ai.collection.members')}</legend>
        {bookmarks
          .filter((bookmark) => preview.bookmarkIds.includes(bookmark.id))
          .map((bookmark) => (
            <label
              key={bookmark.id}
              className="flex items-center gap-2 rounded-lg bg-ink-800/40 px-3 py-2 text-[12px] text-ink-100"
            >
              <input
                type="checkbox"
                aria-label={bookmark.title}
                checked={accepted.includes(bookmark.id)}
                onChange={() =>
                  setAccepted((current) =>
                    current.includes(bookmark.id)
                      ? current.filter((id) => id !== bookmark.id)
                      : [...current, bookmark.id],
                  )
                }
              />
              {bookmark.title}
            </label>
          ))}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {i18n.t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            onConfirm({ ...preview, name, description, acceptedBookmarkIds: accepted })
          }
        >
          {i18n.t('content.createCollection')}
        </Button>
      </div>
    </Shell>
  );
}

export function DuplicatePreviewDialog({ preview, onDecision }: {
  preview: DuplicatePreview;
  onDecision: (action: 'merge' | 'delete' | 'cancel') => void;
}) {
  const i18n = useI18n();
  return (
    <Shell label={i18n.t('ai.duplicate.title')} onClose={() => onDecision('cancel')}>
      <div>
        <h2 className="text-[16px] font-semibold text-ink-100">{i18n.t('ai.duplicate.title')}</h2>
        <p className="text-[12px] text-amber-300">{preview.reason}</p>
      </div>
      <div className="overflow-hidden rounded-lg hairline">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-ink-800/70 text-ink-400">
            <tr>
              <th className="p-2">{i18n.t('ai.duplicate.field')}</th>
              <th className="p-2">{i18n.t('ai.duplicate.keep')}</th>
              <th className="p-2">{i18n.t('ai.duplicate.duplicate')}</th>
            </tr>
          </thead>
          <tbody>
            {preview.differences.map((difference) => (
              <tr key={difference.field} className="border-t border-white/5 text-ink-200">
                <td className="p-2">{difference.field}</td>
                <td className="p-2">{difference.target}</td>
                <td className="p-2">{difference.duplicate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-400">
        {i18n.t('ai.duplicate.hint')}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onDecision('cancel')}>
          {i18n.t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={() => onDecision('delete')}>
          {i18n.t('ai.duplicate.delete')}
        </Button>
        <Button variant="primary" onClick={() => onDecision('merge')}>
          {i18n.t('ai.duplicate.merge')}
        </Button>
      </div>
    </Shell>
  );
}
