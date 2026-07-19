import { useState } from 'react';
import type { TagColor } from '../../types';
import { Icon, Button } from '../../components/ui';
import { COLLECTION_ICON_OPTIONS } from '../../config/collection-icons';

const COLOR_OPTIONS: TagColor[] = ['blue', 'green', 'amber', 'coral', 'violet', 'gray'];

export type CollectionFormValues = {
  name: string;
  emoji: string;
  color: TagColor;
  description: string;
};

/**
 * 新建 / 编辑主题对话框（英文文案）。
 * REQ-012-AC-001
 */
export function CollectionFormDialog({
  mode,
  initial,
  onCancel,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  initial?: Partial<CollectionFormValues>;
  onCancel: () => void;
  onSubmit: (values: CollectionFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '📚');
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const [color, setColor] = useState<TagColor>(initial?.color ?? 'gray');
  const [description, setDescription] = useState(initial?.description ?? '');

  const title = mode === 'create' ? 'New collection' : 'Edit collection';
  const submitLabel = mode === 'create' ? 'Create collection' : 'Save collection';

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      emoji: emoji.trim() || '📚',
      color,
      description,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-form-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
            <Icon name="Library" size={16} className="text-accent-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="collection-form-title" className="text-[15px] font-semibold text-ink-100">
              {title}
            </h2>

            <label className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="collection-name">
              Collection name
            </label>
            <input
              id="collection-name"
              aria-label="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring"
              autoFocus
            />

            <div className="mt-3 grid grid-cols-[88px_1fr] gap-2">
              <div>
                <span className="block text-[11px] font-medium text-ink-300 mb-1.5">
                  Emoji
                </span>
                <CollectionIconMenu
                  value={emoji}
                  open={iconMenuOpen}
                  onToggle={() => setIconMenuOpen((current) => !current)}
                  onSelect={(nextEmoji) => {
                    setEmoji(nextEmoji);
                    setIconMenuOpen(false);
                  }}
                />
              </div>
              <div>
                <span className="block text-[11px] font-medium text-ink-300 mb-1.5">Color</span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Collection color">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={`Color ${option}`}
                      aria-pressed={color === option}
                      onClick={() => setColor(option)}
                      className={`h-7 px-2 rounded-md text-[11px] capitalize hairline ${
                        color === option ? 'bg-accent-500/25 text-ink-50' : 'bg-ink-800/50 text-ink-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="collection-description">
              Description
            </label>
            <textarea
              id="collection-description"
              aria-label="Collection description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring resize-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            aria-label={submitLabel}
            disabled={!name.trim()}
            onClick={submit}
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CollectionIconMenu({
  value,
  open,
  onToggle,
  onSelect,
}: {
  value: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Choose collection icon"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[16px] text-ink-100 outline-none focus-ring text-center hover:bg-ink-700/70 transition"
      >
        {value || '📚'}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Collection icon options"
          className="absolute z-[90] mt-1 grid w-[212px] grid-cols-4 gap-1 rounded-lg bg-ink-900/95 p-2 shadow-win hairline"
        >
          {COLLECTION_ICON_OPTIONS.map((option) => (
            <button
              key={`${option.label}-${option.emoji}`}
              type="button"
              role="menuitemradio"
              aria-label={option.label}
              aria-checked={value === option.emoji}
              onClick={() => onSelect(option.emoji)}
              className={`flex h-9 items-center justify-center rounded-md text-[18px] transition ${
                value === option.emoji ? 'bg-accent-500/25 text-ink-50' : 'text-ink-100 hover:bg-ink-700/70'
              }`}
              title={option.label}
            >
              {option.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
