import { useEffect, useState } from 'react';
import { DialogFrame } from '../../components/DialogFrame';
import { Button, Icon } from '../../components/ui';
import type { CollectionSuggestion } from './collections';
import type { DuplicatePairCandidate, DuplicatePreview } from './duplicates';
import { swapDuplicatePreviewSides, translateDuplicateReason } from './duplicates';
import { useI18n } from '../../i18n/use-i18n';

function pairKey(pair: DuplicatePairCandidate): string {
  return `${pair.targetId}:${pair.duplicateId}`;
}

function Shell({
  label,
  children,
  width = 'max-w-xl',
}: {
  label: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <DialogFrame
      containerClassName="fixed inset-0 z-50 flex items-center justify-center px-4"
      backdropClassName="bg-black/55"
      ariaLabel={label}
      dialogClassName={`glass-strong w-full ${width} rounded-mac-xl border border-white/10 p-5 ring-glow shadow-win`}
    >
      <div className="space-y-4">
        {children}
      </div>
    </DialogFrame>
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
    <Shell label={i18n.t('ai.collection.title')} width="max-w-md">
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
    <Shell label={i18n.t('ai.collection.previewTitle')}>
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

/** 重复候选对列表：对数、逐项预览、勾选批量与全部处理。REQ-020-AC-005/007 */
export function DuplicatePairsDialog({ pairs, onSelect, onClose, onBatchAction }: {
  pairs: DuplicatePairCandidate[];
  onSelect: (pair: DuplicatePairCandidate) => void;
  onClose: () => void;
  onBatchAction: (input: {
    action: 'merge' | 'delete';
    pairs: DuplicatePairCandidate[];
  }) => void;
}) {
  const i18n = useI18n();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    const available = new Set(pairs.map(pairKey));
    setSelectedKeys((current) => current.filter((key) => available.has(key)));
  }, [pairs]);

  const selectedPairs = pairs.filter((pair) => selectedKeys.includes(pairKey(pair)));
  const allSelected = pairs.length > 0 && selectedPairs.length === pairs.length;

  const togglePair = (pair: DuplicatePairCandidate) => {
    const key = pairKey(pair);
    setSelectedKeys((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  return (
    <Shell label={i18n.t('ai.duplicate.listTitle')} width="max-w-2xl">
      <div>
        <h2 className="text-[16px] font-semibold text-ink-100">{i18n.t('ai.duplicate.listTitle')}</h2>
        <p className="text-[12px] text-ink-300" data-testid="duplicate-pair-count">
          {i18n.t('ai.duplicate.pairCount', { count: pairs.length })}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-[12px] text-ink-300">
          <input
            type="checkbox"
            checked={allSelected}
            aria-label={i18n.t('ai.duplicate.selectAll')}
            onChange={() => {
              setSelectedKeys(allSelected ? [] : pairs.map(pairKey));
            }}
          />
          {i18n.t('ai.duplicate.selectAll')}
          <span className="text-ink-500">{i18n.t('common.itemsSelected', { count: selectedPairs.length })}</span>
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            disabled={selectedPairs.length === 0}
            onClick={() => onBatchAction({ action: 'merge', pairs: selectedPairs })}
          >
            {i18n.t('ai.duplicate.mergeSelected')}
          </Button>
          <Button
            variant="danger"
            disabled={selectedPairs.length === 0}
            onClick={() => onBatchAction({ action: 'delete', pairs: selectedPairs })}
          >
            {i18n.t('ai.duplicate.deleteSelected')}
          </Button>
          <Button variant="ghost" onClick={() => onBatchAction({ action: 'merge', pairs })}>
            {i18n.t('ai.duplicate.mergeAll')}
          </Button>
          <Button variant="danger" onClick={() => onBatchAction({ action: 'delete', pairs })}>
            {i18n.t('ai.duplicate.deleteAll')}
          </Button>
        </div>
      </div>
      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {pairs.map((pair) => {
          const key = pairKey(pair);
          const checked = selectedKeys.includes(key);
          return (
            <li key={key} className="flex items-stretch gap-2 rounded-lg bg-ink-800/50 hairline">
              <label className="flex items-center px-3">
                <input
                  type="checkbox"
                  checked={checked}
                  aria-label={`Select ${pair.targetTitle} and ${pair.duplicateTitle}`}
                  onChange={() => togglePair(pair)}
                />
              </label>
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col gap-1 px-2 py-2 text-left hover:bg-ink-800/80 focus-ring rounded-r-lg"
                aria-label={`Review ${pair.targetTitle} and ${pair.duplicateTitle}`}
                onClick={() => onSelect(pair)}
              >
                <span data-testid="duplicate-pair-titles" className="flex flex-col gap-1">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-ink-500">{i18n.t('ai.duplicate.keepSide')}</span>
                    <span className="text-[13px] text-ink-100 break-words">{pair.targetTitle}</span>
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-ink-500">{i18n.t('ai.duplicate.removeSide')}</span>
                    <span className="text-[13px] text-ink-200 break-words">{pair.duplicateTitle}</span>
                  </span>
                </span>
                <span className="text-[11px] text-amber-300">
                  {translateDuplicateReason(pair.reason, i18n.t)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          {i18n.t('common.close')}
        </Button>
      </div>
    </Shell>
  );
}

export function DuplicatePreviewDialog({ preview, onDecision }: {
  preview: DuplicatePreview;
  onDecision: (decision: {
    action: 'merge' | 'delete' | 'cancel';
    targetId: string;
    duplicateId: string;
  }) => void;
}) {
  const i18n = useI18n();
  const [oriented, setOriented] = useState(preview);

  useEffect(() => {
    setOriented(preview);
  }, [preview]);

  const keepTitle = oriented.targetTitle || oriented.targetId;
  const dropTitle = oriented.duplicateTitle || oriented.duplicateId;

  return (
    <Shell label={i18n.t('ai.duplicate.title')}>
      <div>
        <h2 className="text-[16px] font-semibold text-ink-100">{i18n.t('ai.duplicate.title')}</h2>
        <p className="text-[12px] text-amber-300">{translateDuplicateReason(oriented.reason, i18n.t)}</p>
        <p className="mt-1 text-[11px] text-ink-400">{i18n.t('ai.duplicate.chooseKeep')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer flex-col gap-1 rounded-lg bg-accent-500/10 ring-1 ring-accent-500/40 p-3">
          <span className="inline-flex items-center gap-2 text-[11px] text-accent-300">
            <input
              type="radio"
              name="duplicate-keep-side"
              checked
              aria-label={`Keep ${keepTitle}`}
              onChange={() => undefined}
            />
            {i18n.t('ai.duplicate.keepSide')}
          </span>
          <span className="text-[13px] text-ink-100 break-words">{keepTitle}</span>
        </label>
        <label className="flex cursor-pointer flex-col gap-1 rounded-lg bg-ink-800/50 hairline p-3 hover:bg-ink-800/80">
          <span className="inline-flex items-center gap-2 text-[11px] text-ink-400">
            <input
              type="radio"
              name="duplicate-keep-side"
              checked={false}
              aria-label={`Keep ${dropTitle}`}
              onChange={() => setOriented((current) => swapDuplicatePreviewSides(current))}
            />
            {i18n.t('ai.duplicate.keepSide')}
          </span>
          <span className="text-[13px] text-ink-100 break-words">{dropTitle}</span>
        </label>
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
            {oriented.differences.map((difference) => (
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
        <Button
          variant="ghost"
          onClick={() => onDecision({
            action: 'cancel',
            targetId: oriented.targetId,
            duplicateId: oriented.duplicateId,
          })}
        >
          {i18n.t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          onClick={() => onDecision({
            action: 'delete',
            targetId: oriented.targetId,
            duplicateId: oriented.duplicateId,
          })}
        >
          {i18n.t('ai.duplicate.delete')}
        </Button>
        <Button
          variant="primary"
          onClick={() => onDecision({
            action: 'merge',
            targetId: oriented.targetId,
            duplicateId: oriented.duplicateId,
          })}
        >
          {i18n.t('ai.duplicate.merge')}
        </Button>
      </div>
    </Shell>
  );
}
