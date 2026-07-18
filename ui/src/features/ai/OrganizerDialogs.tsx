import { useState } from 'react';
import type { CollectionSuggestion } from './collections';
import type { DuplicatePreview } from './duplicates';

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
    <div role="dialog" aria-modal="true" aria-label={label}
      className="glass-strong w-full max-w-xl rounded-mac-xl p-5 ring-glow space-y-4">{children}</div>
  </div>;
}

export function AICollectionPreviewDialog({ preview, bookmarks, onCancel, onConfirm }: {
  preview: CollectionSuggestion;
  bookmarks: Array<{ id: string; title: string }>;
  onCancel: () => void;
  onConfirm: (value: CollectionSuggestion & { acceptedBookmarkIds: string[] }) => void;
}) {
  const [name, setName] = useState(preview.name);
  const [description, setDescription] = useState(preview.description);
  const [accepted, setAccepted] = useState(preview.bookmarkIds);
  return <Shell label="AI collection preview">
    <div><h2 className="text-[16px] font-semibold text-ink-100">AI collection preview</h2>
      <p className="text-[11px] text-ink-400">Review every field before saving. Nothing has been changed yet.</p></div>
    <label className="block text-[11px] text-ink-300">Collection name
      <input aria-label="Collection name" value={name} onChange={(event) => setName(event.target.value)}
        className="mt-1 w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-ink-100" /></label>
    <label className="block text-[11px] text-ink-300">Description
      <textarea aria-label="Collection description" value={description} onChange={(event) => setDescription(event.target.value)}
        className="mt-1 w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-ink-100" /></label>
    <div className="text-[11px] text-ink-300">Suggested tags: {preview.suggestedTags.join(', ') || 'None'}</div>
    <fieldset className="space-y-2"><legend className="text-[11px] text-ink-300">Library members</legend>
      {bookmarks.filter((bookmark) => preview.bookmarkIds.includes(bookmark.id)).map((bookmark) => <label key={bookmark.id}
        className="flex items-center gap-2 rounded-lg bg-ink-800/40 px-3 py-2 text-[12px] text-ink-100">
        <input type="checkbox" aria-label={bookmark.title} checked={accepted.includes(bookmark.id)} onChange={() =>
          setAccepted((current) => current.includes(bookmark.id) ? current.filter((id) => id !== bookmark.id) : [...current, bookmark.id])} />
        {bookmark.title}</label>)}</fieldset>
    <div className="flex justify-end gap-2"><button onClick={onCancel} className="px-3 py-2 text-[12px] text-ink-300">Cancel</button>
      <button onClick={() => onConfirm({ ...preview, name, description, acceptedBookmarkIds: accepted })}
        className="rounded-lg bg-accent-500 px-3 py-2 text-[12px] font-semibold text-white">Create collection</button></div>
  </Shell>;
}

export function DuplicatePreviewDialog({ preview, onDecision }: {
  preview: DuplicatePreview;
  onDecision: (action: 'merge' | 'delete' | 'cancel') => void;
}) {
  return <Shell label="Duplicate bookmark preview">
    <div><h2 className="text-[16px] font-semibold text-ink-100">Duplicate bookmark preview</h2>
      <p className="text-[12px] text-amber-300">{preview.reason}</p></div>
    <div className="overflow-hidden rounded-lg hairline"><table className="w-full text-left text-[11px]">
      <thead className="bg-ink-800/70 text-ink-400"><tr><th className="p-2">Field</th><th className="p-2">Keep</th><th className="p-2">Duplicate</th></tr></thead>
      <tbody>{preview.differences.map((difference) => <tr key={difference.field} className="border-t border-white/5 text-ink-200">
        <td className="p-2">{difference.field}</td><td className="p-2">{difference.target}</td><td className="p-2">{difference.duplicate}</td>
      </tr>)}</tbody></table></div>
    <p className="text-[11px] text-ink-400">No library mutation occurs until you choose an action.</p>
    <div className="flex justify-end gap-2"><button onClick={() => onDecision('cancel')} className="px-3 py-2 text-[12px] text-ink-300">Cancel</button>
      <button onClick={() => onDecision('delete')} className="rounded-lg bg-coral-500/20 px-3 py-2 text-[12px] text-coral-300">Delete duplicate</button>
      <button onClick={() => onDecision('merge')} className="rounded-lg bg-accent-500 px-3 py-2 text-[12px] font-semibold text-white">Merge</button></div>
  </Shell>;
}
