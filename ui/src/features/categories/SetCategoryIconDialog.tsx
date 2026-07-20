import { useState } from 'react';
import {
  listCategoryColorCandidates,
  listCategoryIconCandidates,
} from '../../domain/categories';
import { tagColors } from '../../colors';
import type { TagColor } from '../../types';
import { Icon, Button } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';

export type SetCategoryIconResult = {
  icon: string;
  color: TagColor;
};

/**
 * 分类图标与颜色候选选择对话框。
 * fix_task 1.2
 */
export function SetCategoryIconDialog({
  categoryName,
  currentIcon,
  currentColor = 'gray',
  onCancel,
  onConfirm,
}: {
  categoryName: string;
  currentIcon: string;
  currentColor?: TagColor;
  onCancel: () => void;
  onConfirm: (value: SetCategoryIconResult) => void;
}) {
  const i18n = useI18n();
  const candidates = listCategoryIconCandidates();
  const colors = listCategoryColorCandidates();
  const [icon, setIcon] = useState(currentIcon || 'Folder');
  const [color, setColor] = useState<TagColor>(currentColor);
  const previewColor = tagColors[color]?.text ?? 'text-ink-300';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-category-icon-title"
        className="w-full max-w-lg rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
            <Icon name={icon} size={16} className={previewColor} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="set-category-icon-title" className="text-[15px] font-semibold text-ink-100">
              {i18n.t('category.icon.title')}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1">
              {i18n.t('category.icon.body', { name: categoryName })}
            </p>

            <span className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5">{i18n.t('category.icon.icon')}</span>
            <div
              className="max-h-52 overflow-y-auto grid grid-cols-8 gap-1.5 pr-0.5"
              role="listbox"
              aria-label={i18n.t('category.icon.candidates')}
            >
              {candidates.map((candidate) => {
                const selected = candidate === icon;
                return (
                  <button
                    key={candidate}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={i18n.t('category.icon.option', { name: candidate })}
                    onClick={() => setIcon(candidate)}
                    className={`h-9 rounded-lg flex items-center justify-center transition hairline focus-ring ${
                      selected
                        ? 'bg-accent-500/25 text-accent-200 shadow-[inset_0_0_0_1px_rgba(45,127,249,0.45)]'
                        : 'bg-ink-800/50 text-ink-300 hover:bg-ink-700/60 hover:text-ink-100'
                    }`}
                  >
                    <Icon name={candidate} size={15} className={selected ? previewColor : undefined} />
                  </button>
                );
              })}
            </div>

            <span className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5">{i18n.t('category.icon.color')}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={i18n.t('category.icon.colorGroup')}>
              {colors.map((option) => {
                const selected = option === color;
                const swatch = tagColors[option];
                return (
                  <button
                    key={option}
                    type="button"
                    aria-label={i18n.t('category.icon.colorOption', {
                      name: i18n.getLocale() === 'en' ? option : i18n.t(`color.${option}`),
                    })}
                    aria-pressed={selected}
                    onClick={() => setColor(option)}
                    className={`h-7 px-2.5 rounded-md text-[11px] capitalize hairline flex items-center gap-1.5 focus-ring ${
                      selected ? 'bg-accent-500/25 text-ink-50' : 'bg-ink-800/50 text-ink-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${swatch.dot}`} />
                    {i18n.t(`color.${option}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {i18n.t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            aria-label={i18n.t('category.icon.save')}
            onClick={() => onConfirm({ icon, color })}
          >
            {i18n.t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
