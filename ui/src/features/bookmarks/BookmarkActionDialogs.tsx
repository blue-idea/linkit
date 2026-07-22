import { useEffect, useState } from 'react';
import { buildCategoryTree } from '../categories/utils';
import type { Bookmark, Category, Collection, Tag, TagColor } from '../../types';
import { Button } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';
import {
  bookmarkIconEditorFromBookmark,
  resolveIconEditorIcon,
  type BookmarkIconEditorValue,
} from './bookmark-icon-editor-model';
import { BookmarkIconEditor } from './BookmarkIconEditor';

function DialogShell({ label, children, onClose }: { label: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={label} className="w-full max-w-xl rounded-mac-xl glass-strong ring-glow p-5" onClick={(event) => event.stopPropagation()}>{children}</div>
  </div>;
}

const inputClass = 'w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-sm text-ink-100 focus-ring';
const readStatuses = ['unread', 'reading', 'read', 'archived'] as const;

type EditorSaveValues = {
  url: string;
  title: string;
  description: string;
  notes: string;
  categoryId: string | null;
  tagIds: string[];
  collectionIds: string[];
  readStatus: NonNullable<Bookmark['readStatus']>;
  favicon: string;
  faviconColor: TagColor;
};

export function BookmarkEditorDialog({ bookmark, categories, tags, collections, onClose, onSave }: {
  bookmark: Bookmark | null; categories: Category[]; tags: Tag[]; collections: Collection[];
  onClose: () => void; onSave: (values: EditorSaveValues) => void;
}) {
  const i18n = useI18n();
  const [values, setValues] = useState({
    url: '',
    title: '',
    description: '',
    notes: '',
    categoryId: '',
    tagIds: [] as string[],
    collectionIds: [] as string[],
    readStatus: 'unread' as NonNullable<Bookmark['readStatus']>,
  });
  const [iconEditor, setIconEditor] = useState<BookmarkIconEditorValue>({
    mode: 'text',
    siteFaviconUrl: null,
    siteFaviconPreview: null,
    glyphOverride: '',
    faviconColor: 'blue',
  });
  useEffect(() => {
    if (bookmark) {
      setValues({
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        notes: bookmark.notes,
        categoryId: bookmark.categoryId,
        tagIds: [...bookmark.tags],
        collectionIds: [...bookmark.collectionIds],
        readStatus: bookmark.readStatus ?? 'unread',
      });
      setIconEditor(bookmarkIconEditorFromBookmark(bookmark));
    }
  }, [bookmark]);
  if (!bookmark) return null;
  const toggle = (key: 'tagIds' | 'collectionIds', id: string) => setValues((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id] }));

  const submit = () => {
    const icon = resolveIconEditorIcon({ url: values.url, title: values.title, value: iconEditor });
    onSave({
      url: values.url,
      title: values.title,
      description: values.description,
      notes: values.notes,
      categoryId: values.categoryId || null,
      tagIds: values.tagIds,
      collectionIds: values.collectionIds,
      readStatus: values.readStatus,
      favicon: icon.favicon,
      faviconColor: icon.faviconColor,
    });
  };

  return <DialogShell label={i18n.t('bookmark.edit')} onClose={onClose}>
    <h2 className="text-lg font-semibold text-ink-100">{i18n.t('bookmark.edit')}</h2>
    <div className="mt-4 max-h-[70vh] overflow-y-auto scroll-thin space-y-4 pr-1">
    <BookmarkIconEditor
      url={values.url}
      title={values.title}
      value={iconEditor}
      onChange={setIconEditor}
    />
    <div className="mt-4 grid grid-cols-2 gap-3">
      <label className="col-span-2 text-xs text-ink-300">URL<input aria-label="URL" value={values.url} onChange={(e) => setValues({ ...values, url: e.target.value })} className={inputClass} /></label>
      <label className="col-span-2 text-xs text-ink-300">{i18n.t('bookmark.title')}<input aria-label={i18n.t('bookmark.title')} value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} className={inputClass} /></label>
      <label className="col-span-2 text-xs text-ink-300">{i18n.t('bookmark.description')}<textarea aria-label={i18n.t('bookmark.description')} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} className={inputClass} rows={2} /></label>
      <label className="col-span-2 text-xs text-ink-300">{i18n.t('bookmark.notes')}<textarea aria-label={i18n.t('bookmark.notes')} value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} className={inputClass} rows={4} /></label>
      <label className="text-xs text-ink-300">{i18n.t('bookmark.category')}<select aria-label={i18n.t('bookmark.category')} value={values.categoryId} onChange={(e) => setValues({ ...values, categoryId: e.target.value })} className={inputClass}><option value="" className="bg-ink-900 text-ink-100">{i18n.t('bookmark.uncategorized')}</option>{buildCategoryTree(categories).map((category) => <option key={category.id} value={category.id} className="bg-ink-900 text-ink-100">{'\u00A0\u00A0'.repeat(category.level) + (category.level > 0 ? '└─ ' : '') + category.name}</option>)}</select></label>
      <label className="text-xs text-ink-300">{i18n.t('bookmark.readStatus')}<select aria-label={i18n.t('bookmark.readStatus')} value={values.readStatus} onChange={(e) => setValues({ ...values, readStatus: e.target.value as typeof values.readStatus })} className={inputClass}>{readStatuses.map((status) => <option key={status} value={status} className="bg-ink-900 text-ink-100">{i18n.t(`status.${status}`)}</option>)}</select></label>
      <fieldset className="col-span-2"><legend className="text-xs text-ink-300">{i18n.t('bookmark.tags')}</legend><div className="flex flex-wrap gap-2">{tags.map((tag) => <label key={tag.id} className="text-xs text-ink-200"><input type="checkbox" checked={values.tagIds.includes(tag.id)} onChange={() => toggle('tagIds', tag.id)} /> {tag.label}</label>)}</div></fieldset>
      <fieldset className="col-span-2"><legend className="text-xs text-ink-300">{i18n.t('bookmark.collections')}</legend><div className="flex flex-wrap gap-2">{collections.map((collection) => <label key={collection.id} className="text-xs text-ink-200"><input type="checkbox" checked={values.collectionIds.includes(collection.id)} onChange={() => toggle('collectionIds', collection.id)} /> {collection.name}</label>)}</div></fieldset>
    </div>
    </div>
    <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{i18n.t('common.cancel')}</Button><Button variant="primary" onClick={submit}>{i18n.t('bookmark.editor.save')}</Button></div>
  </DialogShell>;
}

export function BookmarkMoveDialog({ open, count, categories, onClose, onMove }: { open: boolean; count: number; categories: Category[]; onClose: () => void; onMove: (categoryId: string | null) => void }) {
  const i18n = useI18n();
  const [categoryId, setCategoryId] = useState('');
  if (!open) return null;
  return <DialogShell label={i18n.t('bookmark.move.confirm')} onClose={onClose}><h2 className="text-lg font-semibold text-ink-100">{i18n.t('bookmark.move.title', { count })}</h2><label className="mt-4 block text-xs text-ink-300">{i18n.t('bookmark.move.target')}<select aria-label={i18n.t('bookmark.move.target')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}><option value="" className="bg-ink-900 text-ink-100">{i18n.t('bookmark.uncategorized')}</option>{buildCategoryTree(categories).map((category) => <option key={category.id} value={category.id} className="bg-ink-900 text-ink-100">{'\u00A0\u00A0'.repeat(category.level) + (category.level > 0 ? '└─ ' : '') + category.name}</option>)}</select></label><div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{i18n.t('common.cancel')}</Button><Button variant="primary" onClick={() => onMove(categoryId || null)}>{i18n.t('bookmark.move.confirm')}</Button></div></DialogShell>;
}

export function BulkDeleteDialog({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: () => void }) {
  const i18n = useI18n();
  return <DialogShell label={i18n.t('bookmark.deleteMany.confirm')} onClose={onClose}><h2 className="text-lg font-semibold text-ink-100">{i18n.t('bookmark.deleteMany.title', { count })}</h2><p className="mt-2 text-sm text-ink-300">{i18n.t('bookmark.deleteMany.body')}</p><div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{i18n.t('common.cancel')}</Button><Button variant="danger" onClick={onConfirm}>{i18n.t('bookmark.deleteMany.confirm')}</Button></div></DialogShell>;
}