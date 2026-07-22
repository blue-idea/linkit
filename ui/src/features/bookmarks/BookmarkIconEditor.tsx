import { useMemo } from 'react';
import { Favicon } from '../../components/ui';
import { useI18n } from '../../i18n/use-i18n';
import { BookmarkIconColorField } from './BookmarkIconColorField';
import { buildBookmarkTextGlyph } from './icon';
import {
  canUseSiteFaviconIcon,
  resolveIconEditorIcon,
  type BookmarkIconEditorMode,
  type BookmarkIconEditorValue,
} from './bookmark-icon-editor-model';

export type { BookmarkIconEditorMode, BookmarkIconEditorValue };

const inputClass =
  'w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-sm text-ink-100 focus-ring';

/**
 * 新建/编辑书签共用的图标编辑区：网站 favicon 与文字图标（glyph + 背景色）可切换。
 */
export function BookmarkIconEditor({
  url,
  title,
  value,
  onChange,
}: {
  url: string;
  title: string;
  value: BookmarkIconEditorValue;
  onChange: (next: BookmarkIconEditorValue) => void;
}) {
  const i18n = useI18n();
  const siteAvailable = canUseSiteFaviconIcon(value.siteFaviconUrl);
  const preview = useMemo(
    () => resolveIconEditorIcon({ url, title, value }),
    [url, title, value]
  );

  const setMode = (mode: BookmarkIconEditorMode) => {
    if (mode === 'site' && !siteAvailable) return;
    onChange({ ...value, mode });
  };

  return (
    <fieldset className="rounded-lg bg-ink-800/40 hairline p-3 space-y-3">
      <legend className="text-[11px] font-medium text-ink-300 px-1">
        {i18n.t('bookmark.iconSection')}
      </legend>

      <div className="flex flex-wrap gap-2" role="group" aria-label={i18n.t('bookmark.iconModeLabel')}>
        <button
          type="button"
          aria-pressed={value.mode === 'site'}
          disabled={!siteAvailable}
          onClick={() => setMode('site')}
          className={`h-8 px-3 rounded-md text-[11px] hairline ${
            value.mode === 'site'
              ? 'bg-accent-500/25 text-ink-50'
              : 'bg-ink-800/50 text-ink-300 disabled:opacity-40'
          }`}
        >
          {i18n.t('bookmark.iconUseSite')}
        </button>
        <button
          type="button"
          aria-pressed={value.mode === 'text'}
          onClick={() => setMode('text')}
          className={`h-8 px-3 rounded-md text-[11px] hairline ${
            value.mode === 'text'
              ? 'bg-accent-500/25 text-ink-50'
              : 'bg-ink-800/50 text-ink-300'
          }`}
        >
          {i18n.t('bookmark.iconUseText')}
        </button>
      </div>

      {value.mode === 'text' ? (
        <>
          <label className="block text-[11px] text-ink-300">
            {i18n.t('bookmark.iconGlyph')}
            <input
              aria-label={i18n.t('bookmark.iconGlyph')}
              value={value.glyphOverride}
              maxLength={8}
              placeholder={buildBookmarkTextGlyph(
                url.replace(/^https?:\/\//, '').split('/')[0] || '?',
                title || '?'
              )}
              onChange={(event) =>
                onChange({ ...value, glyphOverride: event.target.value })
              }
              className={`${inputClass} mt-1`}
            />
            <span className="mt-1 block text-[10px] text-ink-500">
              {i18n.t('bookmark.iconGlyphHint')}
            </span>
          </label>
          <BookmarkIconColorField
            glyph={preview.favicon}
            color={value.faviconColor}
            onColorChange={(faviconColor) => onChange({ ...value, faviconColor })}
          />
        </>
      ) : (
        <div className="flex items-start gap-3">
          <Favicon
            glyph={value.siteFaviconPreview ?? value.siteFaviconUrl ?? '?'}
            color={preview.faviconColor}
            size={36}
          />
          <p className="text-[11px] text-ink-400 leading-relaxed pt-1">
            {i18n.t('bookmark.iconSiteHint')}
          </p>
        </div>
      )}
    </fieldset>
  );
}
