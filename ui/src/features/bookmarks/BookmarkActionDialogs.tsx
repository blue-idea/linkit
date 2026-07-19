import { useEffect, useState } from 'react';
import { buildCategoryTree } from '../categories/utils';
import type { Bookmark, Category, Collection, Tag } from '../../types';
import { Button } from '../../components/ui';

function DialogShell({ label, children, onClose }: { label: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={label} className="w-full max-w-xl rounded-mac-xl glass-strong ring-glow p-5" onClick={(event) => event.stopPropagation()}>{children}</div>
  </div>;
}

const inputClass = 'w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-sm text-ink-100 focus-ring';

export function BookmarkEditorDialog({ bookmark, categories, tags, collections, onClose, onSave }: {
  bookmark: Bookmark | null; categories: Category[]; tags: Tag[]; collections: Collection[];
  onClose: () => void; onSave: (values: { url: string; title: string; description: string; notes: string; categoryId: string | null; tagIds: string[]; collectionIds: string[]; readStatus: NonNullable<Bookmark['readStatus']> }) => void;
}) {
  const [values, setValues] = useState({ url: '', title: '', description: '', notes: '', categoryId: '', tagIds: [] as string[], collectionIds: [] as string[], readStatus: 'unread' as NonNullable<Bookmark['readStatus']> });
  useEffect(() => {
    if (bookmark) setValues({ url: bookmark.url, title: bookmark.title, description: bookmark.description, notes: bookmark.notes, categoryId: bookmark.categoryId, tagIds: [...bookmark.tags], collectionIds: [...bookmark.collectionIds], readStatus: bookmark.readStatus ?? 'unread' });
  }, [bookmark]);
  if (!bookmark) return null;
  const toggle = (key: 'tagIds' | 'collectionIds', id: string) => setValues((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id] }));
  return <DialogShell label="Edit bookmark" onClose={onClose}>
    <h2 className="text-lg font-semibold text-ink-100">Edit bookmark</h2>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <label className="col-span-2 text-xs text-ink-300">URL<input aria-label="URL" value={values.url} onChange={(e) => setValues({ ...values, url: e.target.value })} className={inputClass} /></label>
      <label className="col-span-2 text-xs text-ink-300">Title<input aria-label="Title" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} className={inputClass} /></label>
      <label className="col-span-2 text-xs text-ink-300">Description<textarea aria-label="Description" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} className={inputClass} rows={2} /></label>
      <label className="col-span-2 text-xs text-ink-300">Notes<textarea aria-label="Notes" value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} className={inputClass} rows={4} /></label>
      <label className="text-xs text-ink-300">Category<select aria-label="Category" value={values.categoryId} onChange={(e) => setValues({ ...values, categoryId: e.target.value })} className={inputClass}><option value="" className="bg-ink-900 text-ink-100">Uncategorized</option>{buildCategoryTree(categories).map((category) => <option key={category.id} value={category.id} className="bg-ink-900 text-ink-100">{'\u00A0\u00A0'.repeat(category.level) + (category.level > 0 ? '└─ ' : '') + category.name}</option>)}</select></label>
      <label className="text-xs text-ink-300">Read status<select aria-label="Read status" value={values.readStatus} onChange={(e) => setValues({ ...values, readStatus: e.target.value as typeof values.readStatus })} className={inputClass}>{['unread', 'reading', 'read', 'archived'].map((status) => <option key={status} value={status} className="bg-ink-900 text-ink-100">{status}</option>)}</select></label>
      <fieldset className="col-span-2"><legend className="text-xs text-ink-300">Tags</legend><div className="flex flex-wrap gap-2">{tags.map((tag) => <label key={tag.id} className="text-xs text-ink-200"><input type="checkbox" checked={values.tagIds.includes(tag.id)} onChange={() => toggle('tagIds', tag.id)} /> {tag.label}</label>)}</div></fieldset>
      <fieldset className="col-span-2"><legend className="text-xs text-ink-300">Collections</legend><div className="flex flex-wrap gap-2">{collections.map((collection) => <label key={collection.id} className="text-xs text-ink-200"><input type="checkbox" checked={values.collectionIds.includes(collection.id)} onChange={() => toggle('collectionIds', collection.id)} /> {collection.name}</label>)}</div></fieldset>
    </div>
    <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onSave({ ...values, categoryId: values.categoryId || null })}>Save changes</Button></div>
  </DialogShell>;
}

export function BookmarkMoveDialog({ open, count, categories, onClose, onMove }: { open: boolean; count: number; categories: Category[]; onClose: () => void; onMove: (categoryId: string | null) => void }) {
  const [categoryId, setCategoryId] = useState('');
  if (!open) return null;
  return <DialogShell label="Move bookmarks" onClose={onClose}><h2 className="text-lg font-semibold text-ink-100">Move {count} bookmark{count === 1 ? '' : 's'}</h2><label className="mt-4 block text-xs text-ink-300">Target category<select aria-label="Target category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}><option value="" className="bg-ink-900 text-ink-100">Uncategorized</option>{buildCategoryTree(categories).map((category) => <option key={category.id} value={category.id} className="bg-ink-900 text-ink-100">{'\u00A0\u00A0'.repeat(category.level) + (category.level > 0 ? '└─ ' : '') + category.name}</option>)}</select></label><div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onMove(categoryId || null)}>Move bookmarks</Button></div></DialogShell>;
}

export function BulkDeleteDialog({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: () => void }) {
  return <DialogShell label="Delete bookmarks" onClose={onClose}><h2 className="text-lg font-semibold text-ink-100">Delete {count} bookmarks?</h2><p className="mt-2 text-sm text-ink-300">This removes the selected bookmarks from the library and every collection.</p><div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm}>Delete bookmarks</Button></div></DialogShell>;
}
