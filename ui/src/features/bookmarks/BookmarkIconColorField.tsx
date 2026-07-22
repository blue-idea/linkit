import type { TagColor } from '../../types';
import { Favicon } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';
import { BOOKMARK_ICON_COLORS } from './icon';

/** 文字书签图标的背景色选择（英文 UI 文案经 i18n）。 */
export function BookmarkIconColorField({
  glyph,
  color,
  onColorChange,
}: {
  glyph: string;
  color: TagColor;
  onColorChange: (color: TagColor) => void;
}) {
  const i18n = useI18n();
  return (
    <div className="flex items-start gap-3">
      <Favicon glyph={glyph} color={color} size={36} />
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-ink-300 mb-1.5">
          {i18n.t('bookmark.iconBackground')}
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={i18n.t('bookmark.iconBackgroundLabel')}>
          {BOOKMARK_ICON_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={i18n.t('bookmark.iconBackgroundOption', {
                name: i18n.t(`color.${option}`),
              })}
              aria-pressed={color === option}
              onClick={() => onColorChange(option)}
              className={`h-7 px-2 rounded-md text-[11px] hairline ${
                color === option ? 'bg-accent-500/25 text-ink-50' : 'bg-ink-800/50 text-ink-300'
              }`}
            >
              {i18n.t(`color.${option}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
