import { useState } from 'react';
import { Icon, Button } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';

/**
 * 新建 / 重命名分类对话框。
 * REQ-010-AC-002
 */
export function CategoryFormDialog({
  mode,
  initialName = '',
  onCancel,
  onSubmit,
}: {
  mode: 'create' | 'rename';
  initialName?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const i18n = useI18n();
  const [name, setName] = useState(initialName);
  const title = mode === 'create' ? i18n.t('category.new') : i18n.t('category.rename');
  const submitLabel = mode === 'create' ? i18n.t('category.create') : i18n.t('category.saveName');

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
            <Icon name="Folder" size={16} className="text-accent-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="category-form-title" className="text-[15px] font-semibold text-ink-100">
              {title}
            </h2>
            <label className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="category-name">
              {i18n.t('category.name')}
            </label>
            <input
              id="category-name"
              aria-label={i18n.t('category.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onSubmit(name.trim());
              }}
              className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring"
              autoFocus
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {i18n.t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            aria-label={submitLabel}
            disabled={!name.trim()}
            onClick={() => onSubmit(name.trim())}
          >
            {mode === 'create' ? i18n.t('common.create') : i18n.t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
