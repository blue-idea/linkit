import { useMemo, useState } from 'react';
import { Button, Icon } from '../../components/ui';
import {
  listMembershipCandidates,
  toggleCandidateSelection,
  type MembershipCandidate,
} from './membership-candidates';

/**
 * 主题视图添加书签挑选器：确认前零副作用。
 * REQ-012-AC-006~009
 */
export function AddBookmarksToCollectionDialog({
  collectionId,
  collectionName,
  bookmarks,
  onCancel,
  onConfirm,
}: {
  collectionId: string;
  collectionName: string;
  bookmarks: MembershipCandidate[];
  onCancel: () => void;
  onConfirm: (bookmarkIds: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const candidates = useMemo(
    () => listMembershipCandidates({ bookmarks, collectionId, query }),
    [bookmarks, collectionId, query],
  );

  const canConfirm = selectedIds.length > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add bookmarks"
        className="w-full max-w-lg rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
            <Icon name="Library" size={16} className="text-accent-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-ink-100">Add bookmarks</h2>
            <p className="text-[12px] text-ink-400 mt-1">
              Select library bookmarks to add to “{collectionName}”. Nothing is saved until you confirm.
            </p>

            <label className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="add-bookmarks-search">
              Search bookmarks
            </label>
            <input
              id="add-bookmarks-search"
              aria-label="Search bookmarks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or URL"
              className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring"
              autoFocus
            />

            <ul
              aria-label="Bookmark candidates"
              className="mt-3 max-h-56 overflow-y-auto rounded-lg bg-ink-800/40 hairline divide-y divide-white/5"
            >
              {candidates.length === 0 ? (
                <li className="px-3 py-4 text-[12px] text-ink-400 text-center">No matching bookmarks</li>
              ) : (
                candidates.map((bookmark) => {
                  const checked = selectedIds.includes(bookmark.id);
                  return (
                    <li key={bookmark.id}>
                      <label className="flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-ink-700/40">
                        <input
                          type="checkbox"
                          className="mt-1"
                          aria-label={`Select ${bookmark.title}`}
                          checked={checked}
                          onChange={() => setSelectedIds((current) => toggleCandidateSelection(current, bookmark.id))}
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] text-ink-100 truncate">{bookmark.title}</span>
                          <span className="block text-[11px] text-ink-400 truncate">{bookmark.url}</span>
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" aria-label="Cancel add bookmarks" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            aria-label="Confirm add bookmarks"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm(selectedIds);
            }}
          >
            Add {selectedIds.length > 0 ? selectedIds.length : ''} bookmarks
          </Button>
        </div>
      </div>
    </div>
  );
}
